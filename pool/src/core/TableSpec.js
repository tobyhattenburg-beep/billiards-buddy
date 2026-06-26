/* ============================================================
   TableSpec — single source of truth for table geometry.
   Pure data. Both the PhysicsManager and (later) the renderer
   read from the SAME instance so the felt you see and the
   cushions the ball bounces off can never drift apart.
   World units: the playfield half-length HX maps to ~1.27 m of
   a 9-ft table, so 1 unit ~= 0.635 m. Friction/gravity constants
   in PhysicsManager are tuned to this scale.
   ============================================================ */
'use strict';

export const BALL_R = 0.085;            // ball radius (world units)

export const TABLE = Object.freeze({
  HX: 2.0,                              // playfield half-length (x)
  HZ: 1.0,                              // playfield half-width  (z)
  R: BALL_R,
  // The center of a ball can never get closer to a rail than R:
  limX: 2.0 - BALL_R,
  limZ: 1.0 - BALL_R,
  // Pocket geometry
  pocketCapture: 0.135,                 // center within this of a pocket center => potted
  pocketMouth: 0.20,                    // half-width of the rail gap at a pocket (skip cushion bounce here)
  // Six pockets: four corners + two side pockets on the long rails.
  pockets: [
    { x: -2.0, z: -1.0, type: 'corner' },
    { x:  2.0, z: -1.0, type: 'corner' },
    { x: -2.0, z:  1.0, type: 'corner' },
    { x:  2.0, z:  1.0, type: 'corner' },
    { x:  0.0, z: -1.0, type: 'side'   },
    { x:  0.0, z:  1.0, type: 'side'   },
  ],
});

// The "break" rack apex sits on the foot spot (positive x), cue
// ball on the head spot (negative x). Standard tight 15-ball triangle.
export function rackPositions() {
  const r = BALL_R, apexX = TABLE.HX * 0.5, gap = r * 2.001;
  const rowDX = gap * Math.cos(Math.PI / 6);   // row-to-row spacing
  const out = [];
  let idx = 0;
  for (let row = 0; row < 5; row++) {
    const x = apexX + row * rowDX;
    const z0 = -row * r;                        // center the row on z = 0
    for (let i = 0; i <= row; i++) {
      out.push({ id: ++idx, x, z: z0 + i * gap });
    }
  }
  return out;                                   // 15 object balls
}

export function cueStartPosition() {
  return { x: -TABLE.HX * 0.5, z: 0 };
}
