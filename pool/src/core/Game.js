/* ============================================================
   Game — the orchestrator that wires the pure pieces together:

     PhysicsManager  authoritative dynamics (pure numbers)
     RenderManager   all WebGL / Three.js resources
     CameraManager   cinematic camera choreography
     InputManager    pointer/touch/keyboard -> aim/power/spin
     UIManager       the frosted HUD
     Loop            fixed-timestep heartbeat

   It owns the TURN STATE MACHINE (aiming -> shooting -> settle) and
   the rules glue: respot a scratched cue ball, count pots, re-rack
   when the table is cleared. Nothing here touches WebGL or DOM
   directly — it talks to the managers through their contracts.
   ============================================================ */
'use strict';

import { PhysicsManager } from '../physics/PhysicsManager.js';
import { RenderManager } from '../render/RenderManager.js';
import { CameraManager } from '../render/CameraManager.js';
import { InputManager } from '../input/InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { Loop } from './Loop.js';
import { TABLE, rackPositions, cueStartPosition } from './TableSpec.js';

const MAX_SPEED = 9.0;     // world u/s at full power
const MIN_SPEED = 0.8;     // a feather tap still moves the ball

export class Game {
  constructor({ canvas, uiRoot }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot || document.body;

    this.physics = new PhysicsManager();
    this.render = new RenderManager(canvas, TABLE).init();
    this.camera = new CameraManager(this.render.camera, TABLE);
    this.input = new InputManager(canvas, {
      onShoot: (s) => this._commitShot(s),
      onAimChange: () => this.ui && this.ui.sync(),
    });
    this.ui = new UIManager(this.uiRoot, this.input, {
      onCamToggle: () => this._cycleActionCam(),
      onShoot: () => this.input.shoot(),
    });

    this.state = 'aiming';     // 'aiming' | 'shooting'
    this.potted = 0;           // object balls sunk this rack
    this.shots = 0;
    this._actionCam = 'action';// which camera the 🎥 button cycles to

    this.loop = new Loop({
      hz: 120,
      update: (dt) => this._update(dt),
      render: (a) => this.render.render(this.physics.balls, a),
    });
  }

  start({ autoLoop = true } = {}) {
    this.rack();
    this.input.attach();
    this.ui.mount();
    this.camera.setMode('aim', { instant: true });
    this._enterAiming();
    if (autoLoop) this.loop.start();
    return this;
  }

  // ---- rack / reset -------------------------------------------
  rack() {
    this.physics.clear();
    const cue = cueStartPosition();
    this.physics.addBall(cue.x, cue.z, { isCue: true, id: 0 });
    for (const p of rackPositions()) this.physics.addBall(p.x, p.z, { id: p.id });
    this.render.setBalls(this.physics.balls);
    this.potted = 0;
  }

  // ---- turn state machine -------------------------------------
  _enterAiming() {
    this.state = 'aiming';
    this.input.setEnabled(true);
    this.ui.setEnabled(true);
    this.camera.setMode('aim');
    this.ui.setStatus(this.potted >= 15 ? 'Rack cleared — nice!' : 'Your shot');
  }

  _commitShot(shot) {
    if (this.state !== 'aiming') return;
    const speed = MIN_SPEED + shot.power * (MAX_SPEED - MIN_SPEED);
    this.physics.strike(shot.dirX, shot.dirZ, speed, shot.spin);
    this.shots++;
    this.state = 'shooting';
    this.input.setEnabled(false);
    this.ui.setEnabled(false);
    this.render.setAimGuide(0, 0, 1, 0, false);
    this.camera.setMode(this._actionCam);
    this.ui.setStatus('…');
  }

  _finishShot() {
    const cue = this.physics.cueBall;
    let scratched = false;
    if (cue && !cue.active) {           // respot a potted cue ball
      const s = cueStartPosition();
      cue.active = true;
      cue.x = s.x; cue.z = s.z; cue.px = s.x; cue.pz = s.z;
      cue.vx = cue.vz = cue.wx = cue.wy = cue.wz = 0;
      scratched = true;
    }
    if (this.potted >= 15) {
      this.ui.setStatus('Rack cleared — racking up…');
      setTimeout(() => { this.rack(); this._enterAiming(); }, 1400);
      this.state = 'racking';
      return;
    }
    this._enterAiming();
    if (scratched) this.ui.setStatus('Scratch — ball in hand');
  }

  _cycleActionCam() {
    // toggle the "balls moving" framing between a tracking 3/4 and a top overview
    this._actionCam = this._actionCam === 'action' ? 'overview' : 'action';
    if (this.state === 'shooting') this.camera.setMode(this._actionCam);
  }

  // ---- per-fixed-step update ----------------------------------
  _update(dt) {
    if (this.state === 'aiming') {
      const cue = this.physics.cueBall;
      if (cue) {
        this.camera.setCue(cue.x, cue.z);
        this.camera.setAim(this.input.dirX(), this.input.dirZ());
        this.render.setAimGuide(cue.x, cue.z, this.input.dirX(), this.input.dirZ(), true);
      }
    } else {
      this.physics.step(dt);
      this._handleEvents();
      this.camera.setCentroid(...this._centroid());
      if (this.state === 'shooting' && this.physics.isResting()) this._finishShot();
    }
    this.camera.update(dt);
  }

  _handleEvents() {
    for (const e of this.physics.drainEvents()) {
      if (e.type === 'pot' && !e.isCue) this.potted++;
    }
  }

  _centroid() {
    let x = 0, z = 0, n = 0;
    for (const b of this.physics.balls) {
      if (!b.active) continue;
      x += b.x; z += b.z; n++;
    }
    return n ? [x / n, z / n] : [0, 0];
  }

  // ---- teardown -----------------------------------------------
  dispose() {
    this.loop.stop();
    this.input.dispose();
    this.ui.dispose();
    this.render.dispose();
    this.physics.dispose();
  }
}
