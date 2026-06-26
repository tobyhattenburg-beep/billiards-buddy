# Billiards Buddy — TODO / Backlog

_Last updated: 2026-06-26. This is the comprehensive project backlog: shelved work, the active mobile-app plan, and known findings. Plan file: `~/.claude/plans/hashed-twirling-flamingo.md`._

---

## 🎯 Active: ship as a real mobile app (Android + iOS)

- [x] **Phase 0 — Shelve both pool games** — entry points removed; backlog created. (commit d0188fe)
- [x] **Phase 1 — Full functional QA pass + fixes** — headless smoke over every screen (0 errors); geolocation fixes shipped. (commit 5574906)
- [x] **Phase 2 — Venue overhaul (Google + Yelp)** — Yelp route + 3-source merge shipped. (commit 339ebc5) _Activation gated on owner API keys._
- [x] **Phase 3 — PWA store-readiness** — manifest (`id`/`screenshots`/maskable), icons, screenshots, feature graphic, `privacy.html`, chat block, cache v23. (commit cdafc77)
- [x] **Phase 4 prep — submission package** — `store/` docs ready (checklist, listing, data-safety, content-rating, assetlinks template). (commit a8bede3)
- [ ] **Phase 4 — Android packaging & Play submission** — OWNER actions in `store/SUBMISSION-CHECKLIST.md` (PWABuilder, Play account, asset links at github.io domain root, 12-tester/14-day test, API 36).
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

## 🔧 QA findings (Phase 1 — DONE)

- [x] `isSecure` was computed but unused → now gates geolocation with a clear "needs HTTPS" message.
- [x] `mpGeoSuccess` `d.address.city` could throw on no-address → guarded `(d.address||{})`.
- [x] Venues "Refresh" button only re-rendered stale data → now `refreshLocation()` re-acquires a fresh GPS fix + re-searches.
- [x] `watchPosition` high-accuracy battery drain → watch now low-accuracy, one-shot fix stays high.
- [x] Venues sparse because `VENUE_PROXY_URL` blank → Phase 2 added Google+Yelp+OSM merge (OSM still the free baseline until keys set).
- [x] Chat report/block — report + profanity filter already existed; added per-user **block** (local blocklist) for Apple UGC compliance.
- [ ] _Still TODO:_ tighten Firebase Realtime DB security rules (cap message length, scope writes to auth) — owner sets these in the Firebase console.

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
