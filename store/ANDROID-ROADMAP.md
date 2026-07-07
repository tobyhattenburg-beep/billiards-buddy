# Billiards Buddy → Android app (then iOS) — Execution Roadmap

_Durable, committed copy of the approved plan. Last verified against live + git: 2026-07-06._

Billiards Buddy is a live PWA (`C:\Users\Toby\Projects\games\billiards-buddy\`, repo `tobyhattenburg-beep/billiards-buddy`, deployed at https://tobyhattenburg-beep.github.io/billiards-buddy/). Goal: ship it on Google Play as a real Android app (iOS later), packaged as a **TWA via Bubblewrap CLI** run locally so builds are verifiable and repeatable for future updates.

## Verified current state (2026-07-06)

- **Security hardening is committed AND pushed** (`747e9d3`); `master` == `origin/master`; **live site serves `bb-cache-v24`**. XSS escaping (venue cards / chat / leaderboard), worker.js venue-proxy changes, and the maskable icon are all deployed.
- **Store kit committed** in `store/`: `OWNER-RUNBOOK.md`, `SUBMISSION-CHECKLIST.md`, `listing.md`, `data-safety.md`, `content-rating.md`, `assetlinks-template.json` (package `io.github.tobyhattenburg.billiardsbuddy`, both fingerprint slots). Plus `docs/FIREBASE-RULES.md`, `docs/VENUE-API-RUNBOOK.md`.
- **Manifest store-ready** (live): `id`, `portrait-primary`, 4 screenshots, a `maskable` icon.
- `gh` authed as `tobyhattenburg-beep` with `repo` + `workflow` scopes → can create the user-pages repo.
- **Tooling:** Node v24.18 / npm 11.16 present; **no JDK**; Bubblewrap not installed.

## Phase A — Deploy & harden the PWA (Claude) ✅ THIS SESSION

Edits in `index.html`, `sw.js`, plus this roadmap doc.

0. Save this roadmap (done) + refresh memory. Commit before code edits.
1. **Safe-area / edge-to-edge** — viewport meta → `width=device-width, initial-scale=1.0, viewport-fit=cover`; add `env(safe-area-inset-*)` (via `max(existing, env(...))` so desktop is unchanged) to the fixed chrome:
   - `#bottom-nav` (`bottom:0`) → `padding-bottom: env(safe-area-inset-bottom)`.
   - `#more-drawer` → bottom padding + inset.
   - `#notif-bell` (`top:14px; right:14px`) → offset by top/right insets.
   - `#toast-container` (`top:16px`) → offset by top inset.
2. **Title** → `<title>Billiards Buddy</title>`.
3. **Cache bump** — `CACHE_NAME` `bb-cache-v24` → `bb-cache-v25`.
4. **Repo hygiene** — move unrelated files (installer EXEs, zip, art folder, `hustle_kings*`, master-prompt txt, stray jpg) out of the repo dir (never delete); gitignore the `_smoke.html` / `test-server.ps1` dev harnesses.
5. **Commit + push** to `master`.
6. **Verify** — curl live `sw.js` for `v25`, live `<title>`, headless-Chrome screenshot of the live URL.

**Then STOP** — do not install Bubblewrap or mint a keystore this session.

## Phase B — Build the AAB (Claude, next session; keystore backup = OWNER)

1. `npm i -g @bubblewrap/cli`; accept its JDK 17 + Android SDK download (~1.5–2 GB into `%USERPROFILE%\.bubblewrap`).
2. New folder `C:\Users\Toby\billiards-buddy-android\`, then `bubblewrap init --manifest https://tobyhattenburg-beep.github.io/billiards-buddy/manifest.json`
   - Package `io.github.tobyhattenburg.billiardsbuddy` (**permanent**); name "Billiards Buddy", version 1.0.0 (code 1), portrait, theme `#d4a017`.
   - Location delegation ON, notification delegation ON; **create a new keystore** (record passwords in a key-info file).
3. `bubblewrap build` → signed `app-release-signed.aab`; capture upload-key SHA-256 (`bubblewrap fingerprint`).
4. **Inspect `AndroidManifest.xml`**: `targetSdkVersion 36` (required for new apps from 2026-08-31; 35 min today), and `INTERNET`, `ACCESS_FINE/COARSE_LOCATION`, **`CAMERA`** (Bubblewrap sometimes omits — patch if missing), `POST_NOTIFICATIONS`.
5. 🔒 **OWNER: back up `signing.keystore` + key-info to ≥2 off-machine locations immediately.** Losing it = the app can never be updated. This is the irreversible gate — the reason Phase A pauses first.

## Phase C — Digital Asset Links (Claude, after Phase B)

Create repo `tobyhattenburg-beep.github.io` (**user-pages root**, NOT the project repo) with `.nojekyll` + `.well-known/assetlinks.json` from `store/assetlinks-template.json`, upload-key SHA-256 filled in. Verify `https://tobyhattenburg-beep.github.io/.well-known/assetlinks.json` → 200 JSON. After the first Play upload, add the **Play App Signing** SHA-256 as the second fingerprint (owner copies from Play Console → App integrity; Claude commits it) — without it, production installs show a URL bar.

## Phases D–H — Owner-driven (answers pre-written in `store/OWNER-RUNBOOK.md`)

- **D. Accounts & testers (day 1, parallel):** Play Developer account ($25 + photo-ID). **Default = personal account ⇒ closed test with ≥12 testers opted in for 14 continuous days before production (~3-week critical path)** — recruit ~15 testers day one. Org account (needs a D-U-N-S number) skips the gate but D-U-N-S issuance can take days — choose before Phase D.
- **E. Console setup + internal test (~90 min):** content rating (declare user-to-user chat), data safety (from `store/data-safety.md`), target audience 18+; listing from `store/listing.md`, privacy URL `…/billiards-buddy/privacy.html`; upload AAB to internal testing; real-device smoke test.
- **F. Closed-test clock:** owner pastes Play App Signing SHA-256 → Claude adds to assetlinks + redeploys; 12 testers × 14 continuous days; owner tightens Firebase RTDB rules per `docs/FIREBASE-RULES.md` before public launch (chat is reviewer-visible).
- **G. Production:** apply → roll out → live.
- **H. iOS (later):** Capacitor shell + native plugins (Geolocation/Camera/Push) for Apple Guideline 4.2 (thin PWABuilder wrapper rejected). Apple Developer $99/yr; no Mac ⇒ cloud build (try GitHub Actions macOS runners first, else Codemagic ~$20/mo). Safe-area CSS from Phase A + UGC report/block carry over.

## Native behavior inside the TWA (reference)

- **Firebase** (anon auth + RTDB chat): web SDK over HTTPS in Chrome — unchanged. `google-services.json` unused. Clearing Chrome data resets anon identity.
- **Geolocation** (Overpass/Nominatim): web API; delegation shows native dialog. Google/Yelp proxy is the upgrade path (`VENUE_PROXY_URL`/`AI_PROXY_URL` still blank — owner task via Cloudflare secrets).
- **Camera** (Shot Analyzer): `getUserMedia` works; `CAMERA` is the perm Bubblewrap may omit (checked in B.4).
- **Notifications:** local-only while app open — works; delegation renders native-style. Background FCM/web-push not implemented (fine for v1).
- **Affiliate links** (Amazon/eBay/YouTube): open in a Chrome Custom Tab — expected; `rel="sponsored noopener"` set. Data-safety declares "contains ads: No" (no ad SDK) — flip and resubmit if a reviewer pushes back.

## Packaging rationale (settled)

TWA/Bubblewrap fits a content/community PWA whose only "native" needs (geo, camera, notifications) are web APIs supported via delegation; it renders in real Chrome, so web deploys update the app instantly with no store review — only manifest/icon/package changes need a new AAB. Capacitor rejected for Android (native project, WebView quirks, per-release review); it's the right tool for iOS. Full rewrite rejected. Known risk: Play "minimum functionality / web wrapper" rejection — mitigated by listing copy leading with GPS venue finder + camera Shot Analyzer + offline; resubmission script in the runbook.

## Risks & unknowns

- **Timeline:** the 12-tester / 14-day rule dominates (~3 weeks to production on a personal account). Org account skips it only if the entity qualifies for D-U-N-S.
- **Review:** "minimum functionality" rejection is the main content risk; affiliate-link ads ambiguity is minor.
- **Technical:** Bubblewrap `CAMERA` omission (checked in B.4); Play App Signing fingerprint easy to forget (Phase F gate); Overpass rate limits if traffic arrives before Google/Yelp keys.
- **Irreversible:** package id + keystore are permanent from first upload — both locked; keystore is why this session stops after Phase A.
