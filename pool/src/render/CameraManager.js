/* ============================================================
   CameraManager — cinematic camera choreography.

   Owns WHERE the camera is and WHAT it looks at; it damps every
   value (position, look target, fov) toward a per-mode goal with
   FRAME-RATE-INDEPENDENT exponential smoothing, which is what
   produces Hustle-Kings' smooth sweeping transitions instead of
   snapping. It also reports a focus distance so the render
   pipeline can blur the background (depth of field) while aiming.

   MODES
   - aim:      low and tight behind the cue ball, looking down the
               line of the shot. Tight fov + DoF on the background.
   - action:   pulled up and back to frame the whole table while
               the balls are moving; gently tracks the live action.
   - overview: high planning angle.
   - orbit:    free spherical orbit around the table (user driven).

   This class never touches simulation state — the game feeds it
   the cue position, aim direction and an action centroid.
   ============================================================ */
'use strict';

import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

export class CameraManager {
  constructor(camera, table) {
    this.camera = camera;
    this.table = table;
    this.mode = 'action';

    // live inputs the game updates each frame
    this._cue = new THREE.Vector3(0, table.R, 0);
    this._aim = new THREE.Vector2(1, 0);          // unit aim direction on the table plane
    this._centroid = new THREE.Vector3(0, 0, 0);  // where the action is

    // orbit state (user driven)
    this._orbit = { az: 0.0, el: 0.55, dist: Math.max(table.HX, table.HZ) * 2.4 };

    // smoothed camera state
    this._pos = camera.position.clone();
    this._tgt = new THREE.Vector3(0, 0.1, 0);
    this._fov = camera.fov;

    // scratch
    this._goalPos = new THREE.Vector3();
    this._goalTgt = new THREE.Vector3();
  }

  // ---- inputs -------------------------------------------------
  setCue(x, z) { this._cue.set(x, this.table.R, z); }
  setAim(dx, dz) {
    const l = Math.hypot(dx, dz) || 1;
    this._aim.set(dx / l, dz / l);
  }
  setCentroid(x, z) { this._centroid.set(x, 0.1, z); }

  setMode(mode, { instant = false } = {}) {
    this.mode = mode;
    if (instant) {
      this._computeGoal();
      this._pos.copy(this._goalPos);
      this._tgt.copy(this._goalTgt);
      this._fov = this._goalFov;
      this._apply();
    }
  }

  // orbit controls
  setOrbit(az, el, dist) {
    this._orbit.az = az;
    this._orbit.el = clamp(el, 0.12, 1.45);
    this._orbit.dist = clamp(dist, this.table.HX * 1.1, this.table.HX * 4);
  }
  nudgeOrbit(dAz, dEl, dDist = 0) {
    this.setOrbit(this._orbit.az + dAz, this._orbit.el + dEl, this._orbit.dist + dDist);
  }

  // ---- per-mode goal transform --------------------------------
  _computeGoal() {
    const T = this.table;
    switch (this.mode) {
      case 'aim': {
        // Low, tight, just behind the cue ball, sighting down the shot.
        const back = 0.62, height = 0.24, lookAhead = 1.4;
        this._goalPos.set(
          this._cue.x - this._aim.x * back,
          height,
          this._cue.z - this._aim.y * back,
        );
        this._goalTgt.set(
          this._cue.x + this._aim.x * lookAhead,
          T.R * 1.6,
          this._cue.z + this._aim.y * lookAhead,
        );
        this._goalFov = 38;
        break;
      }
      case 'overview': {
        this._goalPos.set(0.001, T.HX * 1.9, 0.001);
        this._goalTgt.set(0, 0, 0);
        this._goalFov = 42;
        break;
      }
      case 'orbit': {
        const { az, el, dist } = this._orbit;
        this._goalPos.set(
          Math.sin(az) * Math.cos(el) * dist,
          Math.sin(el) * dist,
          Math.cos(az) * Math.cos(el) * dist,
        );
        this._goalTgt.set(0, 0.1, 0);
        this._goalFov = 46;
        break;
      }
      case 'action':
      default: {
        // Elevated 3/4 that frames the table; target eases toward the
        // live action centroid so the eye follows the break.
        this._goalPos.set(0, T.HX * 1.55, T.HX * 2.0);
        this._goalTgt.set(this._centroid.x * 0.5, 0.1, this._centroid.z * 0.5);
        this._goalFov = 46;
        break;
      }
    }
  }

  // ---- update / apply -----------------------------------------
  // dt-based exponential damping: factor = 1 - e^(-k·dt) is the
  // correct frame-rate-independent smoothing (a fixed lerp would
  // move faster at high FPS and stutter at low FPS).
  update(dt) {
    this._computeGoal();
    const kPos = this.mode === 'aim' ? 7.5 : 4.0;   // aim snaps tighter; others sweep
    const kTgt = this.mode === 'aim' ? 9.0 : 5.0;
    const fp = 1 - Math.exp(-kPos * dt);
    const ft = 1 - Math.exp(-kTgt * dt);

    this._pos.lerp(this._goalPos, fp);
    this._tgt.lerp(this._goalTgt, ft);
    this._fov += (this._goalFov - this._fov) * ft;
    this._apply();
  }

  _apply() {
    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._tgt);
    if (Math.abs(this.camera.fov - this._fov) > 1e-3) {
      this.camera.fov = this._fov;
      this.camera.updateProjectionMatrix();
    }
  }

  // ---- depth of field -----------------------------------------
  // Focus on the cue ball while aiming (background falls out of
  // focus); everything sharp in the other modes.
  getFocus() {
    if (this.mode === 'aim') {
      const distance = this._pos.distanceTo(this._cue);
      return { distance, strength: 1.0 };
    }
    return { distance: this._pos.distanceTo(this._tgt), strength: 0.0 };
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function wrap(a) { return ((a % TWO_PI) + TWO_PI) % TWO_PI; }
export { wrap };
