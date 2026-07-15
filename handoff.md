# Session Handoff — Billiards Buddy

_Read this first when resuming. It's the living "you are here" for the Android/iOS push. Update the top block at the end of every working session (also mirrored in the `billiards-mobile-app-pivot` memory). Companion docs: `store/ANDROID-ROADMAP.md` (full A–H plan), `decisions.md` (forks in the road), `store/OWNER-RUNBOOK.md` (owner steps)._

---

## ▶ YOU ARE HERE (last updated: 2026-07-15)

**Phase B — ✅ COMPLETE.** Signed AAB v1.0.0 built, verified, and delivered to owner. Write access was granted 2026-07-15; everything below is pushed.

**Done this session (remote Claude Code session, branch `claude/billiard-buddy-play-store-9n342p`):**
- `android/` TWA project generated with Bubblewrap CLI 1.24.1 from `android/twa-manifest.json` — package `io.github.tobyhattenburg.billiardsbuddy`, v1.0.0 (code 1), minSdk 21, **targetSdk 36**, portrait, location delegation, notification delegation, **CAMERA** permission added (roadmap B.4), launcher/maskable/splash/notification icons generated. Post-generation patches documented in `android/README.md`.
- **Permanent upload keystore minted** (RSA-4096, 30 yr, alias `billiardsbuddy`). SHA-256 `FB:90:36:9F:D6:62:0D:88:93:13:8B:F9:1E:E8:01:F8:18:E0:F2:27:5C:40:A3:D3:D1:CF:FA:33:EF:4C:AB:1A`. Keystore + KEY-INFO delivered to owner in-session — **owner must back up ×2 off-machine (irreversible gate)**. Keystore is NOT in git, by design.
- `.github/workflows/android-build.yml` — CI builds the unsigned release AAB/APK and commits to `dist/`; signing stays offline with the keystore (see `android/README.md`).
- Phase C kit ready: `store/user-pages-repo/` (assetlinks.json with the **real** upload-key SHA-256 + .nojekyll + instructions).

**AAB build result (2026-07-15):** CI (`Android build` workflow) builds the unsigned AAB/APK into `dist/`; bundletool `validate` + manifest dump run in CI and passed. Final AAB signed offline with the upload keystore (`jarsigner`, `jar verified.`), signer SHA-256 confirmed = assetlinks fingerprint. Manifest verified: package `io.github.tobyhattenburg.billiardsbuddy`, versionCode 1 / versionName 1.0.0, minSdk 21 / targetSdk 36, INTERNET + CAMERA + FINE/COARSE_LOCATION + POST_NOTIFICATIONS, `autoVerify` on `tobyhattenburg-beep.github.io/billiards-buddy/`. **`billiards-buddy-1.0.0-signed.aab` delivered to owner in-session** — this is the Play upload file.

**Next actions (resume here):**
1. Phase C: create `tobyhattenburg-beep.github.io` user-pages repo from `store/user-pages-repo/` (3-min owner task, or Claude if given access to that repo).
2. Phase D/E (owner): Play Developer account, then Console setup per `store/OWNER-RUNBOOK.md` + `store/SUBMISSION-CHECKLIST.md`; upload the signed AAB to Internal testing; real-device smoke test.
3. Phase F gate: after first upload, copy the **Play App Signing** SHA-256 from Console → App integrity and add it as the second fingerprint in `.well-known/assetlinks.json` (instructions in `store/user-pages-repo/README.md`).
4. Merge branch → master when owner approves (GitHub Pages deploys from master; `android/` + workflow + `dist/` are inert for the PWA).
5. ⚠ **Decision D4 (Play account type)** still open — decide before Phase D; if Personal, start recruiting ~15 testers day 1.

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
