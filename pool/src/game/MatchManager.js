/* ============================================================
   MatchManager — two-player scoring & turn rules (pure).

   This is the ruleset the old game3d.js endShot() encoded, lifted
   into its own DOM-free, unit-testable unit. It is deliberately NOT
   full 8-ball/9-ball: the original game is a "pot the most balls"
   race, so the rules are:

     - Each shot pots zero or more OBJECT balls (the cue doesn't count).
     - Pot >=1 object ball cleanly -> you SCORE them and shoot again.
     - Scratch (cue potted) or a dry shot (no pot) -> turn passes.
       A scratch never earns a continuation even if a ball dropped.
     - The match ends when the last object ball is gone; the higher
       score wins and the opening player takes a tie (mirrors the old
       `you >= ai` rule).

   MatchManager owns NO ball/physics state. The caller (Game) settles
   the table, summarises the shot, and hands it to resolveShot();
   MatchManager updates scores + whose turn it is and reports what
   happened so the UI / career layer can react.
   ============================================================ */
'use strict';

export class MatchManager {
  // players[0] is the opener and wins ties. Callbacks are optional.
  constructor({ players = ['you', 'ai'], onTurn = null, onScore = null, onGameOver = null } = {}) {
    this.players = players.slice();
    this.onTurn = onTurn;
    this.onScore = onScore;
    this.onGameOver = onGameOver;
    this.reset();
  }

  reset() {
    this.scores = {};
    for (const p of this.players) this.scores[p] = 0;
    this.turn = this.players[0];
    this.over = false;
    this.winner = null;
    return this;
  }

  get opponentOf() { return (p) => this.players[(this.players.indexOf(p) + 1) % this.players.length]; }

  /**
   * Apply the outcome of a settled shot.
   * @param {object} shot
   *   potted    {number} OBJECT balls sunk this shot (excludes the cue)
   *   scratch   {boolean} cue ball was potted
   *   remaining {number}  object balls still on the table after the shot
   * @returns {object} outcome {shooter, potted, scratch, scored, continue, turn, over, winner}
   */
  resolveShot({ potted = 0, scratch = false, remaining = 0 } = {}) {
    if (this.over) return this._outcome(this.turn, 0, false, false);

    const shooter = this.turn;
    const scored = Math.max(0, potted);
    if (scored > 0) {
      this.scores[shooter] += scored;
      if (this.onScore) this.onScore(shooter, this.scores[shooter], scored);
    }

    // table cleared -> match over
    if (remaining <= 0) {
      this.over = true;
      this.winner = this._decideWinner();
      if (this.onGameOver) this.onGameOver(this.winner, this.scores);
      return this._outcome(shooter, scored, scratch, false);
    }

    // continuation: a clean pot (no scratch) keeps the table
    const keepShooting = scored > 0 && !scratch;
    if (!keepShooting) {
      this.turn = this.opponentOf(shooter);
      if (this.onTurn) this.onTurn(this.turn);
    }
    return this._outcome(shooter, scored, scratch, keepShooting);
  }

  // Highest score wins; the opener (players[0]) takes a tie.
  _decideWinner() {
    let best = this.players[0];
    for (const p of this.players) if (this.scores[p] > this.scores[best]) best = p;
    return best;
  }

  _outcome(shooter, scored, scratch, keepShooting) {
    return {
      shooter,
      potted: scored,
      scratch,
      scored: scored > 0,
      continue: keepShooting,
      turn: this.turn,
      over: this.over,
      winner: this.winner,
    };
  }
}
