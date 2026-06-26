/* ============================================================
   InputManager — turns raw pointer / touch / keyboard events into
   the three numbers a pool shot actually needs: an AIM direction,
   a POWER (0..1), and SPIN (side english + draw/follow).

   DESIGN CONTRACT
   - Pure of Three.js / rendering. It knows the table plane only as
     an aim ANGLE (radians, measured in the X→Z plane) plus scalar
     power/spin; the Game maps that to a world strike. This keeps it
     unit-testable and reusable across camera rigs.
   - It never mutates physics. When a shot is committed it calls the
     onShoot callback with a snapshot {angle, dirX, dirZ, power, spin}.
   - Input is DISABLED while the balls are moving; the Game flips
     enabled back on once everything settles.

   GESTURES
   - Drag horizontally on the table  -> sweep the aim line.
   - Drag vertically while charging   -> (reserved) fine power.
   - Keyboard ← →  aim,  ↑ ↓ power,  space shoot  (also gives the
     headless harness a deterministic way to drive a shot).
   ============================================================ */
'use strict';

const TWO_PI = Math.PI * 2;

export class InputManager {
  constructor(el, { onShoot, onAimChange } = {}) {
    this.el = el;
    this.onShoot = onShoot || (() => {});
    this.onAimChange = onAimChange || (() => {});

    this.enabled = false;
    this.angle = 0;                 // aim angle (rad) in the X→Z plane
    this.power = 0.5;               // 0..1
    this.spin = { side: 0, vert: 0 };// english / draw(-1)..follow(+1)

    this.aimSensitivity = 0.0065;   // rad per pixel of horizontal drag

    this._drag = null;              // active pointer drag {id, x, y, moved}
    this._bound = false;
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onKey = this._onKey.bind(this);
  }

  attach() {
    if (this._bound) return this;
    const el = this.el;
    el.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    window.addEventListener('keydown', this._onKey);
    el.style.touchAction = 'none';  // we own the gesture; stop the browser scrolling
    this._bound = true;
    return this;
  }

  dispose() {
    if (!this._bound) return;
    const el = this.el;
    el.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    window.removeEventListener('keydown', this._onKey);
    this._drag = null;
    this._bound = false;
  }

  // ---- state setters (UIManager + Game drive these) -----------
  setEnabled(on) { this.enabled = !!on; if (!on) this._drag = null; }
  setAngle(a) { this.angle = wrap(a); this.onAimChange(this.snapshot()); }
  nudgeAngle(d) { this.setAngle(this.angle + d); }
  setPower(p) { this.power = clamp01(p); }
  addPower(d) { this.power = clamp01(this.power + d); }
  setSpin(side, vert) {
    this.spin.side = clamp(side, -1, 1);
    this.spin.vert = clamp(vert, -1, 1);
  }

  dirX() { return Math.cos(this.angle); }
  dirZ() { return Math.sin(this.angle); }

  snapshot() {
    return {
      angle: this.angle,
      dirX: this.dirX(),
      dirZ: this.dirZ(),
      power: this.power,
      spin: { side: this.spin.side, vert: this.spin.vert },
    };
  }

  // Commit the current aim/power/spin as a shot.
  shoot() {
    if (!this.enabled || this.power <= 0.001) return;
    this.onShoot(this.snapshot());
  }

  // ---- pointer ------------------------------------------------
  _onDown(e) {
    if (!this.enabled || this._drag) return;
    this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    try { this.el.setPointerCapture(e.pointerId); } catch (_) {}
  }

  _onMove(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX; d.y = e.clientY;
    d.moved += Math.abs(dx);
    this.nudgeAngle(dx * this.aimSensitivity);
  }

  _onUp(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.id) return;
    try { this.el.releasePointerCapture(e.pointerId); } catch (_) {}
    this._drag = null;
  }

  // ---- keyboard ----------------------------------------------
  _onKey(e) {
    if (!this.enabled) return;
    const step = e.shiftKey ? 0.01 : 0.04;   // shift = fine aim
    switch (e.key) {
      case 'ArrowLeft':  this.nudgeAngle(-step); e.preventDefault(); break;
      case 'ArrowRight': this.nudgeAngle(step);  e.preventDefault(); break;
      case 'ArrowUp':    this.addPower(0.05);    e.preventDefault(); break;
      case 'ArrowDown':  this.addPower(-0.05);   e.preventDefault(); break;
      case ' ': case 'Enter': this.shoot();      e.preventDefault(); break;
      default: break;
    }
  }
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function wrap(a) { return ((a % TWO_PI) + TWO_PI) % TWO_PI; }
export { wrap };
