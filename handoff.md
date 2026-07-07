# Session Handoff — Billiards Buddy

_Read this first when resuming. It's the living "you are here" for the Android/iOS push. Update the top block at the end of every working session (also mirrored in the `billiards-mobile-app-pivot` memory). Companion docs: `store/ANDROID-ROADMAP.md` (full A–H plan), `decisions.md` (forks in the road), `store/OWNER-RUNBOOK.md` (owner steps)._

---

## ▶ YOU ARE HERE (last updated: 2026-07-06)

**Phase A — Deploy & harden the PWA — ✅ COMPLETE & VERIFIED LIVE.** Paused before Phase B per decision D3.

**Done this session:**
- Roadmap → `store/ANDROID-ROADMAP.md` (+ runbook pointer) — commit `1d006f7`.
- `index.html`: viewport `viewport-fit=cover`; `env(safe-area-inset-*)` on `#bottom-nav`, `.screen`, `#more-drawer`, `#notif-bell`, `#toast-container` (via `max()`/`calc()` so desktop is unchanged); `<title>` → `Billiards Buddy`.
- `sw.js`: `CACHE_NAME` `bb-cache-v24` → `bb-cache-v25`.
- Added `decisions.md` + this `handoff.md`; gitignored `_smoke.html` + `test-server.ps1`; moved repo junk to `Downloads/billiards-repo-cleanup-2026-07-06`.
- Committed `b40258a`, pushed. **Verified live:** `sw.js` serves `bb-cache-v25`, `<title>` = `Billiards Buddy`, mobile-viewport headless screenshot shows chrome unclipped.

**Next actions (resume here) — Phase B, needs owner go-ahead:**
1. ⚠ **Confirm decision D4 (Play account type) first** — it drives the timeline.
2. `npm i -g @bubblewrap/cli` (accept ~2 GB JDK/SDK); `bubblewrap init --manifest .../manifest.json` (package `io.github.tobyhattenburg.billiardsbuddy`, location+notification delegation ON, **new keystore**); `bubblewrap build`.
3. Inspect `AndroidManifest.xml` (targetSdk 36, INTERNET/LOCATION/**CAMERA**/POST_NOTIFICATIONS).
4. 🔒 **OWNER backs up the keystore ×2 off-machine** — irreversible gate.
5. Then Phase C: create `tobyhattenburg-beep.github.io` user-pages repo with `.well-known/assetlinks.json`.

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
