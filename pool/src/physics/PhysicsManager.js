/* ============================================================
   PhysicsManager — authoritative pool dynamics.

   DESIGN CONTRACT
   - PURE: imports no Three.js / no DOM. It owns plain numeric
     ball state only, so it is deterministic, frame-rate
     independent, and unit-testable headlessly. The renderer
     READS positions from here; it never writes them.
   - SLIDING -> ROLLING friction model. A struck ball first
     SLIDES (kinetic friction acts at the cloth contact point,
     which is also what converts draw/follow spin into motion),
     then transitions to ROLLING (low rolling resistance). Side
     spin ("english", the vertical axis) decays on its own and
     bends cushion rebounds. This is the real two-regime
     behaviour of a cue ball, not a single linear drag.
   - CONTINUOUS COLLISION DETECTION. Every fixed step is diced
     into substeps, and within each substep we solve the exact
     time-of-impact for ball/cushion and ball/ball, advance the
     whole system to that instant, resolve, and continue with the
     remaining time. A ball at max break speed therefore cannot
     tunnel through a cushion or another ball.

   AXES: table plane is X (length) and Z (width); Y is up.
   Angular velocity w = (wx, wy, wz); wy is english (vertical
   axis). Contact point with cloth is directly below center at
   r = (0, -R, 0).
   ============================================================ */
'use strict';

import { TABLE } from '../core/TableSpec.js';

// --- Tunables (tuned to the TableSpec world scale) ----------
const PHYS = Object.freeze({
  g: 15.0,            // gravity * 1 (world accel scale)
  muSlide: 0.16,      // kinetic friction while sliding (lower => cue keeps more pace into the rack)
  muRoll: 0.016,      // rolling resistance (~8% of slide, matches real cloth)
  muSpin: 2.4,        // english (wy) decay rate [1/s]
  slipEps: 0.02,      // |contact slip| below this => treat as rolling
  eBall: 0.96,        // ball-ball restitution (higher => break energy survives the 15-ball chain)
  eCush: 0.85,        // cushion restitution
  throwBall: 0.18,    // fraction of relative english transferred to throw on ball hits
  cushThrow: 0.12,    // how strongly english bends a cushion rebound
  restV: 0.02,        // linear settle threshold
  restW: 0.20,        // angular settle threshold
  maxSubDt: 1 / 240,  // physics substep ceiling
  maxCcdIters: 24,    // collision resolutions allowed per substep
});

const I_FACTOR = 0.4; // solid sphere: I = 2/5 m R^2  -> a = F r / I

let _idSeq = 0;

class Ball {
  constructor(id, x, z, isCue) {
    this.id = id;
    this.isCue = !!isCue;
    this.x = x; this.z = z;        // position on table plane
    this.vx = 0; this.vz = 0;      // linear velocity
    this.wx = 0; this.wy = 0; this.wz = 0; // angular velocity (wy = english)
    this.px = x; this.pz = z;      // previous-step position (for render interpolation)
    this.active = true;            // false once potted
  }
  speed() { return Math.hypot(this.vx, this.vz); }
  kinetic() {
    // ½mv² + ½Iω²  (m=1, I=0.4R²)
    const I = I_FACTOR * TABLE.R * TABLE.R;
    return 0.5 * (this.vx * this.vx + this.vz * this.vz)
         + 0.5 * I * (this.wx * this.wx + this.wy * this.wy + this.wz * this.wz);
  }
}

export class PhysicsManager {
  constructor() {
    this.balls = [];
    this.cueBall = null;
    this._events = [];   // drained each step(): {type, ...}
  }

  // ---- lifecycle ------------------------------------------------
  addBall(x, z, { isCue = false, id = null } = {}) {
    const b = new Ball(id == null ? ++_idSeq : id, x, z, isCue);
    this.balls.push(b);
    if (isCue) this.cueBall = b;
    return b;
  }

  clear() {
    this.balls.length = 0;
    this.cueBall = null;
    this._events.length = 0;
  }

  dispose() {
    // No GPU/DOM resources are held here, but honour the manager
    // contract so the orchestrator can tear everything down uniformly.
    this.clear();
  }

  // ---- input ----------------------------------------------------
  /**
   * Strike the cue ball.
   * @param {number} dirX @param {number} dirZ  aim direction (need not be unit)
   * @param {number} speed  launch speed (world u/s)
   * @param {object} spin  {side:-1..1 english, vert:-1..1 draw(-)/follow(+)}
   */
  strike(dirX, dirZ, speed, spin = {}) {
    const b = this.cueBall;
    if (!b || !b.active) return;
    const len = Math.hypot(dirX, dirZ) || 1;
    const dx = dirX / len, dz = dirZ / len;
    b.vx = dx * speed;
    b.vz = dz * speed;

    const side = clamp(spin.side || 0, -1, 1);
    const vert = clamp(spin.vert || 0, -1, 1);

    // Pure-rolling angular velocity for this launch velocity:
    //   roll w = (vz/R, 0, -vx/R)  (gives zero contact slip)
    const R = TABLE.R;
    const rollWx = b.vz / R, rollWz = -b.vx / R;
    // follow (+) starts near rolling and beyond; draw (-) reverses it (back-spin).
    const spinGain = 1.6;
    b.wx = rollWx * vert * spinGain;
    b.wz = rollWz * vert * spinGain;
    // english: spin about the vertical axis, scaled to tip offset & speed.
    b.wy = side * speed * 7.0;
  }

  isResting() {
    for (const b of this.balls) {
      if (!b.active) continue;
      if (b.speed() > PHYS.restV) return false;
      if (Math.hypot(b.wx, b.wy, b.wz) > PHYS.restW) return false;
    }
    return true;
  }

  drainEvents() {
    const e = this._events;
    this._events = [];
    return e;
  }

  // ---- simulation ----------------------------------------------
  // Advance one FIXED step (called by Loop). Internally substeps + CCD.
  step(dt) {
    for (const b of this.balls) { b.px = b.x; b.pz = b.z; }
    const n = Math.max(1, Math.ceil(dt / PHYS.maxSubDt));
    const h = dt / n;
    for (let s = 0; s < n; s++) this._substep(h);
    this._settleTiny();
  }

  _substep(h) {
    this._applyFriction(h);
    this._advanceWithCCD(h);
  }

  // Two-regime friction at the cloth contact point.
  _applyFriction(h) {
    const R = TABLE.R, I = I_FACTOR * R * R;
    for (const b of this.balls) {
      if (!b.active) continue;

      // Contact-point slip velocity = v + w x r, r=(0,-R,0)
      //   w x r = (wz*R, 0, -wx*R)
      const cx = b.vx + b.wz * R;
      const cz = b.vz - b.wx * R;
      const slip = Math.hypot(cx, cz);

      if (slip > PHYS.slipEps) {
        // SLIDING: kinetic friction opposes contact slip.
        const a = PHYS.muSlide * PHYS.g;       // deceleration magnitude
        const ux = -cx / slip, uz = -cz / slip; // friction direction (on the ball's surface)
        const dv = Math.min(a * h, slip);        // don't overshoot to negative slip
        // Linear: F = m*a*u (m=1)
        b.vx += ux * dv;
        b.vz += uz * dv;
        // Angular: torque = r x F, r=(0,-R,0), F=(Fx,0,Fz)=u*dv
        //   r x F = (-R*Fz, 0, R*Fx)
        const Fx = ux * dv, Fz = uz * dv;
        b.wx += (-R * Fz) / I;
        b.wz += ( R * Fx) / I;
      } else {
        // ROLLING: snap to exact rolling (kill residual slip) then
        // apply gentle rolling resistance along travel direction.
        b.wx =  b.vz / R;
        b.wz = -b.vx / R;
        const sp = b.speed();
        if (sp > 1e-6) {
          const dec = Math.min(PHYS.muRoll * PHYS.g * h, sp);
          b.vx -= (b.vx / sp) * dec;
          b.vz -= (b.vz / sp) * dec;
          // keep w consistent with the reduced rolling velocity
          b.wx =  b.vz / R;
          b.wz = -b.vx / R;
        }
      }
      // English (vertical-axis spin) decays independently.
      const decay = Math.exp(-PHYS.muSpin * h);
      b.wy *= decay;
    }
  }

  // Move every ball forward by h, resolving the EARLIEST collision
  // first (ball/cushion or ball/ball), then continuing with the
  // remaining time. This is the continuous (swept) test that makes
  // tunnelling impossible.
  _advanceWithCCD(h) {
    let remaining = h;
    let iters = 0;
    while (remaining > 1e-9 && iters++ < PHYS.maxCcdIters) {
      let toi = remaining;
      let hit = null; // {kind:'wall'|'pair', ...}

      // ball vs cushions
      for (const b of this.balls) {
        if (!b.active) continue;
        const w = this._wallTOI(b, remaining);
        if (w && w.t < toi) { toi = w.t; hit = { kind: 'wall', b, axis: w.axis, sign: w.sign }; }
      }
      // ball vs ball
      for (let i = 0; i < this.balls.length; i++) {
        const a = this.balls[i];
        if (!a.active) continue;
        for (let j = i + 1; j < this.balls.length; j++) {
          const c = this.balls[j];
          if (!c.active) continue;
          const t = this._pairTOI(a, c, remaining);
          if (t != null && t < toi) { toi = t; hit = { kind: 'pair', a, b: c }; }
        }
      }

      // advance everyone to the collision instant (or to end of step)
      this._integratePositions(toi);
      remaining -= toi;

      if (hit) {
        if (hit.kind === 'wall') this._resolveWall(hit.b, hit.axis, hit.sign);
        else this._resolvePair(hit.a, hit.b);
      }
      this._checkPockets();
    }
    if (remaining > 1e-9) this._integratePositions(remaining); // ran out of iters: finish straight
    this._checkEscapes();
  }

  _integratePositions(t) {
    for (const b of this.balls) {
      if (!b.active) continue;
      b.x += b.vx * t;
      b.z += b.vz * t;
    }
  }

  // Earliest time in (0, max] the ball center reaches a rail limit,
  // skipping the segment of rail that is a pocket mouth.
  _wallTOI(b, max) {
    let best = null;
    const consider = (t, axis, sign, contactPerp, perpLimits) => {
      if (t <= 1e-9 || t >= max) return;
      // Skip the bounce if the contact lands inside a pocket mouth.
      for (const lim of perpLimits) {
        if (Math.abs(contactPerp - lim) < TABLE.pocketMouth) return;
      }
      if (!best || t < best.t) best = { t, axis, sign };
    };
    // X walls at +/- limX (corner pockets at z = +/-HZ, side pockets at z=0)
    if (b.vx > 0) {
      const t = (TABLE.limX - b.x) / b.vx;
      consider(t, 'x', +1, b.z + b.vz * t, [-TABLE.HZ, TABLE.HZ]);
    } else if (b.vx < 0) {
      const t = (-TABLE.limX - b.x) / b.vx;
      consider(t, 'x', -1, b.z + b.vz * t, [-TABLE.HZ, TABLE.HZ]);
    }
    // Z walls at +/- limZ (corner pockets at x = +/-HX, side pockets at x=0)
    if (b.vz > 0) {
      const t = (TABLE.limZ - b.z) / b.vz;
      consider(t, 'z', +1, b.x + b.vx * t, [-TABLE.HX, 0, TABLE.HX]);
    } else if (b.vz < 0) {
      const t = (-TABLE.limZ - b.z) / b.vz;
      consider(t, 'z', -1, b.x + b.vx * t, [-TABLE.HX, 0, TABLE.HX]);
    }
    return best;
  }

  // Earliest time two balls' centers reach 2R apart, only if approaching.
  _pairTOI(a, c, max) {
    const dx = c.x - a.x, dz = c.z - a.z;
    const dvx = c.vx - a.vx, dvz = c.vz - a.vz;
    const A = dvx * dvx + dvz * dvz;
    if (A < 1e-12) return null;
    const B = 2 * (dx * dvx + dz * dvz);
    if (B >= 0) return null;                 // separating or parallel: not approaching
    const D = (2 * TABLE.R);
    const C = dx * dx + dz * dz - D * D;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    const t = (-B - Math.sqrt(disc)) / (2 * A);
    if (t <= 1e-9 || t >= max) return null;
    return t;
  }

  _resolveWall(b, axis, sign) {
    if (axis === 'x') {
      b.x = sign * TABLE.limX;
      b.vx = -b.vx * PHYS.eCush;
      // english curls the rebound along the rail (cushion throw)
      b.vz += sign * b.wy * TABLE.R * PHYS.cushThrow;
    } else {
      b.z = sign * TABLE.limZ;
      b.vz = -b.vz * PHYS.eCush;
      b.vx -= sign * b.wy * TABLE.R * PHYS.cushThrow;
    }
    b.wy *= 0.7; // rail scrubs off some english
    this._events.push({ type: 'cushion', id: b.id, speed: b.speed() });
  }

  _resolvePair(a, c) {
    let nx = c.x - a.x, nz = c.z - a.z;
    let d = Math.hypot(nx, nz) || 1e-6;
    nx /= d; nz /= d;
    // positional de-penetration (numerical safety)
    const overlap = 2 * TABLE.R - d;
    if (overlap > 0) {
      a.x -= nx * overlap * 0.5; a.z -= nz * overlap * 0.5;
      c.x += nx * overlap * 0.5; c.z += nz * overlap * 0.5;
    }
    const rvx = a.vx - c.vx, rvz = a.vz - c.vz;
    const vn = rvx * nx + rvz * nz;            // approach speed along normal
    if (vn <= 0) return;
    // equal masses: exchange the normal component, scaled by restitution
    const jimp = (1 + PHYS.eBall) * 0.5 * vn;
    a.vx -= jimp * nx; a.vz -= jimp * nz;
    c.vx += jimp * nx; c.vz += jimp * nz;
    // throw: striker's english nudges the object ball tangentially
    const tx = -nz, tz = nx;
    const throwV = (a.wy + c.wy) * 0.5 * TABLE.R * PHYS.throwBall;
    c.vx += tx * throwV; c.vz += tz * throwV;
    a.vx -= tx * throwV * 0.25; a.vz -= tz * throwV * 0.25;
    this._events.push({ type: 'click', a: a.id, b: c.id, speed: Math.abs(vn) });
  }

  // Capture balls that reach a pocket.
  _checkPockets() {
    for (const b of this.balls) {
      if (!b.active) continue;
      for (const p of TABLE.pockets) {
        if (Math.hypot(b.x - p.x, b.z - p.z) < TABLE.pocketCapture) {
          this._pot(b);
          break;
        }
      }
    }
  }

  // Safety net: the only way past a rail is a pocket gap, so any ball
  // found beyond the rail has been pocketed (prevents stray escapes).
  _checkEscapes() {
    for (const b of this.balls) {
      if (!b.active) continue;
      if (Math.abs(b.x) > TABLE.HX + 1e-3 || Math.abs(b.z) > TABLE.HZ + 1e-3) this._pot(b);
    }
  }

  _pot(b) {
    b.active = false;
    b.vx = b.vz = b.wx = b.wy = b.wz = 0;
    this._events.push({ type: 'pot', id: b.id, isCue: b.isCue });
  }

  _settleTiny() {
    for (const b of this.balls) {
      if (!b.active) continue;
      if (b.speed() < PHYS.restV) { b.vx = 0; b.vz = 0; }
      if (Math.hypot(b.wx, b.wy, b.wz) < PHYS.restW) { b.wx = b.wy = b.wz = 0; }
    }
  }

  totalKinetic() {
    let k = 0;
    for (const b of this.balls) if (b.active) k += b.kinetic();
    return k;
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export { PHYS };
