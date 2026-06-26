/* ============================================================
   UIManager — the sleek, semi-transparent heads-up display.

   Owns a DOM overlay (its own <style> + nodes, all prefixed `.pg-`)
   layered above the WebGL canvas. It READS/WRITES the InputManager
   for power and spin and asks the Game to commit shots or swap the
   camera; it holds no game logic itself.

   PANELS
   - status   : top-centre frosted pill (turn / messages)
   - power     : right-edge vertical meter, drag to charge
   - spin      : bottom-left cue-ball pad, drag the contact point
   - shoot     : bottom-right primary action
   - camBtn    : top-right camera-mode toggle

   Aesthetic: frosted dark glass, hairline borders, a cyan action
   accent with a warm gold highlight — Hustle-Kings restraint.
   ============================================================ */
'use strict';

const CSS = `
.pg-ui{position:fixed;inset:0;pointer-events:none;z-index:10;
  font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  color:#eaf2ff;-webkit-user-select:none;user-select:none;}
.pg-ui *{box-sizing:border-box;}
.pg-glass{background:rgba(12,18,32,.46);backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);border:1px solid rgba(150,180,230,.18);
  box-shadow:0 8px 30px rgba(0,0,0,.45);}
.pg-status{position:absolute;top:14px;left:50%;transform:translateX(-50%);
  padding:8px 18px;border-radius:999px;font-size:14px;letter-spacing:.3px;
  white-space:nowrap;transition:opacity .3s;}
.pg-cam{position:absolute;top:12px;right:12px;width:46px;height:46px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;font-size:20px;
  pointer-events:auto;cursor:pointer;}
.pg-cam:active{transform:scale(.94);}
.pg-power{position:absolute;right:16px;top:50%;transform:translateY(-50%);
  width:42px;height:230px;border-radius:22px;padding:5px;pointer-events:auto;
  touch-action:none;cursor:ns-resize;}
.pg-power-fill{position:absolute;left:5px;right:5px;bottom:5px;border-radius:18px;
  background:linear-gradient(180deg,#ff5a52,#ffcf3d 55%,#37e6a8);transition:height .04s linear;}
.pg-power-cap{position:absolute;left:0;right:0;text-align:center;bottom:-22px;
  font-size:11px;letter-spacing:1px;opacity:.7;}
.pg-spin{position:absolute;left:18px;bottom:20px;width:104px;height:104px;border-radius:50%;
  pointer-events:auto;touch-action:none;cursor:pointer;}
.pg-spin-ball{position:absolute;inset:8px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#ffffff,#cfd6e2 55%,#9aa3b4);
  box-shadow:inset 0 -8px 16px rgba(0,0,0,.25);}
.pg-spin-dot{position:absolute;width:20px;height:20px;border-radius:50%;
  background:#e8403a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);
  transform:translate(-50%,-50%);left:50%;top:50%;}
.pg-shoot{position:absolute;right:18px;bottom:20px;width:104px;height:104px;border-radius:50%;
  pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:700;letter-spacing:1px;color:#04121a;
  background:radial-gradient(circle at 38% 32%,#7df0ff,#23c6e0 60%,#13a7c4);
  border:1px solid rgba(255,255,255,.35);
  box-shadow:0 6px 22px rgba(20,180,210,.5),inset 0 -6px 14px rgba(0,0,0,.18);}
.pg-shoot:active{transform:scale(.95);}
.pg-disabled{opacity:.35;filter:grayscale(.4);pointer-events:none !important;}
`;

export class UIManager {
  constructor(root, input, { onCamToggle, onShoot } = {}) {
    this.root = root;
    this.input = input;
    this.onCamToggle = onCamToggle || (() => {});
    this.onShoot = onShoot || (() => input.shoot());
    this.nodes = {};
    this._spinDrag = false;
    this._powerDrag = false;
  }

  mount() {
    if (!document.getElementById('pg-ui-style')) {
      const s = document.createElement('style');
      s.id = 'pg-ui-style';
      s.textContent = CSS;
      document.head.appendChild(s);
    }

    const ui = el('div', 'pg-ui');

    const status = el('div', 'pg-status pg-glass');
    status.textContent = 'Your shot';
    ui.appendChild(status);

    const cam = el('div', 'pg-cam pg-glass');
    cam.textContent = '🎥';
    cam.addEventListener('click', () => this.onCamToggle());
    ui.appendChild(cam);

    // power meter
    const power = el('div', 'pg-power pg-glass');
    const fill = el('div', 'pg-power-fill');
    const cap = el('div', 'pg-power-cap');
    cap.textContent = 'POWER';
    power.appendChild(fill); power.appendChild(cap);
    this._wirePower(power);
    ui.appendChild(power);

    // spin pad
    const spin = el('div', 'pg-spin pg-glass');
    const ball = el('div', 'pg-spin-ball');
    const dot = el('div', 'pg-spin-dot');
    ball.appendChild(dot); spin.appendChild(ball);
    this._wireSpin(spin, dot);
    ui.appendChild(spin);

    // shoot
    const shoot = el('div', 'pg-shoot');
    shoot.textContent = 'SHOOT';
    shoot.addEventListener('click', () => this.onShoot());
    ui.appendChild(shoot);

    this.root.appendChild(ui);
    this.nodes = { ui, status, cam, power, fill, spin, dot, shoot };
    this._renderPower();
    this._renderSpin();
    return this;
  }

  // ---- power drag ---------------------------------------------
  _wirePower(elp) {
    const setFromEvent = (e) => {
      const r = elp.getBoundingClientRect();
      const t = 1 - (e.clientY - r.top - 5) / (r.height - 10);
      this.input.setPower(t);
      this._renderPower();
    };
    elp.addEventListener('pointerdown', (e) => {
      this._powerDrag = true; elp.setPointerCapture(e.pointerId); setFromEvent(e);
    });
    elp.addEventListener('pointermove', (e) => { if (this._powerDrag) setFromEvent(e); });
    const end = (e) => { this._powerDrag = false; try { elp.releasePointerCapture(e.pointerId); } catch (_) {} };
    elp.addEventListener('pointerup', end);
    elp.addEventListener('pointercancel', end);
  }

  _renderPower() {
    if (!this.nodes.fill) return;
    this.nodes.fill.style.height = `calc(${(this.input.power * 100).toFixed(1)}% - 10px)`;
  }

  // ---- spin drag ----------------------------------------------
  _wireSpin(elp, dot) {
    const setFromEvent = (e) => {
      const r = elp.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const rad = r.width / 2 - 12;
      let dx = (e.clientX - cx) / rad;
      let dy = (e.clientY - cy) / rad;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }     // clamp the contact point to the ball
      this.input.setSpin(dx, -dy);          // up on the ball = follow (+vert)
      this._renderSpin();
    };
    elp.addEventListener('pointerdown', (e) => {
      this._spinDrag = true; elp.setPointerCapture(e.pointerId); setFromEvent(e);
    });
    elp.addEventListener('pointermove', (e) => { if (this._spinDrag) setFromEvent(e); });
    const end = (e) => { this._spinDrag = false; try { elp.releasePointerCapture(e.pointerId); } catch (_) {} };
    elp.addEventListener('pointerup', end);
    elp.addEventListener('pointercancel', end);
  }

  _renderSpin() {
    if (!this.nodes.dot) return;
    const { side, vert } = this.input.spin;
    this.nodes.dot.style.left = `${50 + side * 42}%`;
    this.nodes.dot.style.top = `${50 - vert * 42}%`;
  }

  // ---- game-driven state --------------------------------------
  setStatus(text) { if (this.nodes.status) this.nodes.status.textContent = text; }

  // Lock the controls while the balls are moving.
  setEnabled(on) {
    for (const k of ['power', 'spin', 'shoot']) {
      const n = this.nodes[k];
      if (n) n.classList.toggle('pg-disabled', !on);
    }
  }

  // call when input power/spin changed elsewhere (e.g. keyboard)
  sync() { this._renderPower(); this._renderSpin(); }

  dispose() {
    if (this.nodes.ui && this.nodes.ui.parentNode) this.nodes.ui.parentNode.removeChild(this.nodes.ui);
    this.nodes = {};
  }
}

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}
