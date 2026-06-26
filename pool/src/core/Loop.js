/* ============================================================
   Loop — fixed-timestep game loop with a render interpolation
   alpha. This is what guarantees a frame-rate hiccup can never
   corrupt the simulation: physics always advances in identical
   FIXED slices, and the renderer is handed an interpolation
   factor so motion stays visually smooth between sim ticks.
     update(fixedDt)  -> deterministic, frame-rate independent
     render(alpha)    -> alpha in [0,1): how far between the last
                         two sim states this displayed frame is
   Reference pattern: Gaffer "Fix Your Timestep".
   ============================================================ */
'use strict';

export class Loop {
  /**
   * @param {object} o
   * @param {(dt:number)=>void} o.update  fixed-step simulation tick
   * @param {(alpha:number)=>void} o.render  draw with interpolation alpha
   * @param {number} [o.hz=120]   simulation frequency
   * @param {number} [o.maxFrame=0.25]  clamp on a single frame's dt (anti spiral-of-death)
   */
  constructor({ update, render, hz = 120, maxFrame = 0.25 }) {
    this.update = update;
    this.render = render;
    this.fixed = 1 / hz;
    this.maxFrame = maxFrame;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now() / 1000;
    this._acc = 0;
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _tick() {
    if (!this._running) return;
    const now = performance.now() / 1000;
    let frame = now - this._last;
    this._last = now;
    if (frame > this.maxFrame) frame = this.maxFrame;   // clamp: a long stall does not fast-forward physics
    this._acc += frame;

    while (this._acc >= this.fixed) {
      this.update(this.fixed);
      this._acc -= this.fixed;
    }

    this.render(this._acc / this.fixed);
    this._raf = requestAnimationFrame(this._tick);
  }
}
