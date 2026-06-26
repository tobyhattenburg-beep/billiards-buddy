# Billiards Buddy — TODO / Backlog

_Last updated: 2026-06-26. This is the comprehensive project backlog: shelved work, the active mobile-app plan, and known findings. Plan file: `~/.claude/plans/hashed-twirling-flamingo.md`._

---

## 🎯 Active: ship as a real mobile app (Android + iOS)

- [ ] **Phase 0 — Shelve both pool games** (in progress) — entry points removed; this backlog created.
- [ ] **Phase 1 — Full functional QA pass + fixes** — headless smoke harness over every screen; fix confirmed geolocation bugs (below) + anything surfaced.
- [ ] **Phase 2 — Venue overhaul (Google + Yelp)** — Yelp route in `worker.js`, merge OSM+Google+Yelp. _Gated on owner API keys._
- [ ] **Phase 3 — PWA store-readiness** — manifest (`id`, `screenshots`, maskable icon), icons/screenshots, `privacy.html`, chat report/block (UGC), `sw.js` cache bump.
- [ ] **Phase 4 — Android packaging & Play submission** — PWABuilder TWA, `assetlinks.json` at github.io domain root, Play account, 12-tester/14-day closed test, target API 36.
- [ ] **Phase 5 — iOS** (deferred until Android traction) — Capacitor + cloud-Mac CI (Codemagic) + Apple Developer ($99/yr).

### Owner actions required (Claude can't do these)
- [ ] Google Play Developer account ($25 one-time) + ID verification.
- [ ] Google Places API key → Cloudflare secret `GOOGLE_PLACES_KEY`.
- [ ] Yelp Fusion API key → Cloudflare secret `YELP_API_KEY`.
- [ ] Deploy `worker.js` to Cloudflare; paste worker URL into `VENUE_PROXY_URL` (index.html).
- [ ] Recruit 12 Play testers for the 14-day closed test.
- [ ] Back up the PWABuilder keystore + key-info OFF-MACHINE forever (lose it = can't update the app).
- [ ] (Later, iOS) Apple Developer Program ($99/yr) + cloud-Mac CI.

---

## 🔧 Known QA findings to fix (Phase 1)

- [ ] `index.html:~3355` — `isSecure` is computed but never used; either gate geolocation on it with a clear message or remove the dead var.
- [ ] `index.html:~3324` — `mpGeoSuccess` reads `d.address.city`; throws if Nominatim returns no `address`. Guard `(d.address || {})`.
- [ ] Venues — GPS only fires once at `window.onload` with no retry. Add a **"Refresh location"** button on the Venues screen that re-calls `getCurrentPosition`.
- [ ] `index.html:~3367` — `watchPosition` runs continuously with `enableHighAccuracy:true` (battery drain). Use one high-accuracy fix + lower-accuracy watch, or a toggle.
- [ ] Venues feel "broken" mostly because `VENUE_PROXY_URL` is blank → sparse OSM/Overpass fallback. Fixed by Phase 2 (activate Google + add Yelp).
- [ ] Add chat **report/block** to Community (Play UGC requirement) and tighten Firebase security rules.

---

## 📦 Shelved / Backlog (resume later)

### Both in-app pool games (shelved 2026-06-26)
Entry points removed from `index.html` (home cards, More drawer, sidebar nav, challenge toast). Code left **dormant** — no UI reaches it, so nothing initializes. To un-shelve, restore the nav entries.
- **In-app "Play Pool" 9-ball game** — the `game` screen (`initGame`/`stopGame`, still in `showScreen` `all[]` + `DRAWER_SCREENS`, just unreachable).
- **3D Career game** — standalone `pool/` (`open3DGame()` at `index.html:~874` still defined but unlinked).

### 3D pool engine v2 (the rebuild — committed + pushed, paused)
Clean modular ES-module engine in `pool/src/` (pure `PhysicsManager`, `RenderManager`, `CameraManager`, `InputManager`, `UIManager`, `Game.js`), verified headless.
- Commits: `9fa6544` (engine), `519786b` (break tuning + contract fixes).
- Port slices done: `08d6797` (`PlayerStore`), `8251669` (`MatchManager`).
- **Remaining slices:** AI (`aiPlan`/`aiTurn` from `pool/game3d.js`), Pro Shop + cue traits, career ladder + venue theming, wire all into `Game.js`, new `pool/index.html`, SW cache + swap off old `game3d.js`.

### CI + unit tests (not started)
- [ ] GitHub Actions on each build. `PhysicsManager` is pure → Node/Vitest; integration via Playwright. The `pool/test/*.html` harnesses (physics-selftest, PlayerStore, MatchManager) are the seed suite.
