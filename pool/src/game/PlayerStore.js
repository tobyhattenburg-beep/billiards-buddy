/* ============================================================
   PlayerStore — career save-game + the ranked-profile bridge.

   This is the meta-game persistence layer for the 3D pool game,
   lifted out of the old single-file game3d.js and kept DOM-free so
   it stays unit-testable. It owns two distinct localStorage records:

     'cueSharks3d'  the 3D game's OWN save (xp/level, owned cues,
                    equipped cue + ball set, career progress + cash).
     'bb_profile'   the MAIN Billiards Buddy app's ranked profile
                    (same-origin localStorage). A first-time career
                    win here credits +1 verified win and ranked skill
                    into that profile — see creditMainProfile().

   Nothing here touches Three.js or the DOM. The celebratory toast is
   delivered through an injected callback (onFx) instead of reaching
   for a global, so the UI layer stays swappable and tests run headless.
   ============================================================ */
'use strict';

const SAVE_KEY = 'cueSharks3d';
const PROFILE_KEY = 'bb_profile';

// Fresh save defaults — mirror the old game3d.js schema exactly so an
// existing player's progress (cues bought, cash, opponents beaten)
// carries straight over to the v2 engine.
function freshSave() {
  return {
    xp: 0,
    level: 1,
    cue: 'ash',
    unlocked: ['ash'],
    ball: 'classic',
    ownedBalls: ['classic'],
    career: { beaten: {}, cash: 0, done: {} },
  };
}

export class PlayerStore {
  // storage is injectable so tests can pass a fake; defaults to
  // window.localStorage when present (it isn't in a worker/Node test).
  constructor({ storage = (typeof localStorage !== 'undefined' ? localStorage : null), onFx = null } = {}) {
    this.storage = storage;
    this.onFx = onFx;
    this.player = this.load();
  }

  // ---- 3D-game save ('cueSharks3d') ---------------------------
  load() {
    let p = null;
    try { p = JSON.parse(this.storage && this.storage.getItem(SAVE_KEY)); } catch (e) { /* corrupt save */ }
    if (!p || !p.unlocked || !p.unlocked.length) p = freshSave();
    // backfill fields added after a player's save was first written
    if (!p.career) p.career = { beaten: {}, cash: 0, done: {} };
    if (!p.ball) p.ball = 'classic';
    if (!p.ownedBalls || !p.ownedBalls.length) p.ownedBalls = ['classic'];
    this.player = p;
    return p;
  }

  save() {
    try { this.storage && this.storage.setItem(SAVE_KEY, JSON.stringify(this.player)); } catch (e) { /* quota/private mode */ }
    return this;
  }

  // ---- leveling (pure) ----------------------------------------
  // Level curve: 100 xp for L2, then +60 more per level. Returns the
  // current level plus progress into the next.
  static levelInfo(xp) {
    let lvl = 1, need = 100, acc = 0;
    while (xp >= acc + need) { acc += need; lvl++; need = 100 + (lvl - 1) * 60; }
    return { level: lvl, into: xp - acc, need };
  }

  addXp(n) {
    if (n <= 0) return this;
    this.player.xp += n;
    this.player.level = PlayerStore.levelInfo(this.player.xp).level;
    return this.save();
  }

  // ---- ranked-profile bridge ('bb_profile') -------------------
  // A first-time career win syncs into the main Billiards Buddy
  // profile. The engine owns the result, so it is auto-verified (no
  // opponent confirmation) — first win per opponent only, so ranked
  // skill can't be farmed by replaying the same character.
  creditMainProfile(gain, oppName) {
    try {
      let p = JSON.parse(this.storage && this.storage.getItem(PROFILE_KEY) || 'null');
      if (!p) p = { name: 'Hustler Pro', skill: 1000, stats: { gamesWon: 0, gamesLost: 0 } };
      if (!p.stats) p.stats = {};
      if (typeof p.skill !== 'number') p.skill = 1000;
      p.stats.gamesWon = (p.stats.gamesWon || 0) + 1;
      p.skill = p.skill + gain;
      this.storage && this.storage.setItem(PROFILE_KEY, JSON.stringify(p));
      if (this.onFx) this.onFx(`🏅 +${gain} ranked skill`, (oppName ? `Beat ${oppName} — ` : '') + 'synced to your profile');
      return p;
    } catch (e) { return null; }
  }

  // Record a career match result. Returns {firstWin, credited} so the
  // caller can drive the post-match UI. gain mirrors the old formula:
  // round(12 + difficulty*24), first win per opponent only.
  recordCareerWin(opponentId, opponentName, difficulty) {
    const beaten = this.player.career.beaten || (this.player.career.beaten = {});
    const firstWin = !beaten[opponentId];
    beaten[opponentId] = true;
    this.save();
    let credited = 0;
    if (firstWin) {
      credited = Math.round(12 + difficulty * 24);
      this.creditMainProfile(credited, opponentName);
    }
    return { firstWin, credited };
  }
}

export { SAVE_KEY, PROFILE_KEY, freshSave };
