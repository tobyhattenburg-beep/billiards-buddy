# Session Handoff — Billiards Buddy

_Read this first when resuming. It's the living "you are here" for the Android/iOS push. Update the top block at the end of every working session (also mirrored in the `billiards-mobile-app-pivot` memory). Companion docs: `store/ANDROID-ROADMAP.md` (full A–H plan), `decisions.md` (forks in the road), `store/OWNER-RUNBOOK.md` (owner steps)._

---

## ▶ YOU ARE HERE (last updated: 2026-07-06)

**Phase A — Deploy & harden the PWA — in progress.** Edits applied locally, commit/push/verify pending.

**Done this session:**
- Committed the A–H roadmap to `store/ANDROID-ROADMAP.md` (+ runbook pointer) — commit `1d006f7`.
- `index.html`: viewport `viewport-fit=cover`; `env(safe-area-inset-*)` on `#bottom-nav`, `.screen`, `#more-drawer`, `#notif-bell`, `#toast-container` (all via `max()`/`calc()` so desktop is unchanged); `<title>` → `Billiards Buddy`.
- `sw.js`: `CACHE_NAME` `bb-cache-v24` → `bb-cache-v25`.
- Added `decisions.md` + this `handoff.md`.

**Next actions (resume here):**
1. Repo hygiene: move junk (EXEs/zip/art/`hustle_kings*`/master-prompt txt/stray jpg) out to `Downloads`; gitignore `_smoke.html` + `test-server.ps1`.
2. Commit + push Phase A (safe-area + title + cache + gitignore + process docs).
3. Verify: curl live `sw.js` shows `bb-cache-v25`; live `<title>` = `Billiards Buddy`; headless-Chrome screenshot of live URL confirms chrome unclipped.
4. **PAUSE.** Do not start Phase B (Bubblewrap) without owner go-ahead — it mints the permanent keystore.

## ⚠ Open decisions blocking progress
- **D4 (account type):** Personal vs Organization — undecided. Drives the whole timeline. See `decisions.md`.

## 🔑 Owner action items (cannot be done by Claude)
- Choose Play account type (D4); if Personal, start recruiting ~15 testers **day 1** (12 needed for 14 continuous days).
- When Phase B runs: back up `signing.keystore` + key-info to ≥2 off-machine spots.
- Later: tighten Firebase RTDB rules (`docs/FIREBASE-RULES.md`) before public launch; set Google/Yelp keys as Cloudflare Worker secrets (`docs/VENUE-API-RUNBOOK.md`) to upgrade venue search.

## 🧪 Verify recipes (that work here)
- **Live deploy check:** `curl -s https://tobyhattenburg-beep.github.io/billiards-buddy/sw.js | grep CACHE_NAME` (GitHub Pages can lag ~1 min after push).
- **Headless screenshot:** serve `C:\billliards buddy` locally, then `chrome --headless=new --screenshot=out.png --window-size=390,844 <url>` and Read the PNG. Kill lingering chrome between runs.
- **Full-app smoke:** same-origin iframe harness driving `showScreen` over all screens (was `_smoke.html`; now gitignored).

## 📌 Locked / irreversible facts
- Package id `io.github.tobyhattenburg.billiardsbuddy` (permanent). Keystore permanent from first upload (D5/D6).
- Live PWA already served `bb-cache-v24` with XSS hardening before this session (commit `747e9d3`).

## 🗺 Phase map (see ANDROID-ROADMAP.md for detail)
- **A** Deploy & harden PWA — *in progress (this session)*
- **B** Build AAB via Bubblewrap (+ owner keystore backup) — pending owner go-ahead
- **C** Digital Asset Links (create `tobyhattenburg-beep.github.io` user-pages repo) — after B
- **D** Play account + testers — owner, start day 1
- **E** Console setup + internal test — owner
- **F** Closed-test clock (12 testers × 14 days) + Firebase rules — owner
- **G** Production rollout — owner
- **H** iOS (Capacitor + cloud CI) — later
