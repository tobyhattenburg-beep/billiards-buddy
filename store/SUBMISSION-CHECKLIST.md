# Billiards Buddy — App Store Submission Checklist

Everything Claude could automate is done and pushed. This is the **owner action list** to get the app live. Files in this `store/` folder are ready-to-use drafts.

---

## A. Google Play (Android) — primary, ship first

### 1. Accounts & prerequisites
- [ ] Create a **Google Play Developer account** — $25 one-time, photo-ID verification (hours–2 days). https://play.google.com/console/signup
- [ ] Decide account type: **personal** (no D-U-N-S, but triggers the 12-tester rule below) vs **organization** (needs a free D-U-N-S number, exempt from the tester rule).

### 2. Build the app package (no local tooling needed)
- [ ] Go to **https://www.pwabuilder.com** → enter `https://tobyhattenburg-beep.github.io/billiards-buddy/`.
- [ ] Fix anything it flags (manifest is already prepped: `id`, maskable icon, screenshots all present).
- [ ] **Package For Stores → Android → Google Play**.
- [ ] Set a permanent **Package ID**, e.g. `io.github.tobyhattenburg.billiardsbuddy` (cannot change later).
- [ ] Download the zip → it contains the **`.aab`** (upload this), **`signing.keystore` + `signing-key-info.txt`**, and **`assetlinks.json`**.
- [ ] 🔒 **BACK UP `signing.keystore` + `signing-key-info.txt` off your machine, permanently.** Losing them means you can never update the app.

### 3. Digital Asset Links (removes the URL bar → true full-screen app)
- [ ] The file must be served at the **domain root**: `https://tobyhattenburg-beep.github.io/.well-known/assetlinks.json`.
- [ ] That root belongs to your **user-pages repo** `tobyhattenburg-beep.github.io` (NOT the billiards-buddy repo). If it doesn't exist, create it (a repo literally named `tobyhattenburg-beep.github.io`), add an empty `.nojekyll` file, and put `assetlinks.json` in a `.well-known/` folder.
- [ ] Use the `assetlinks.json` PWABuilder gave you (see `assetlinks-template.json` here for the shape). After your first Play upload, also paste in the **Play App Signing SHA-256** (Play Console → Setup → App integrity → App signing) and redeploy — that's the fingerprint real installs use.
- [ ] Verify in a browser that the URL returns 200 + JSON.

### 4. Verify the generated Android project (PWABuilder/Bubblewrap quirks)
- [ ] Open `AndroidManifest.xml` in the downloaded project and confirm these permissions are present (Bubblewrap sometimes omits CAMERA):
  - `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`
- [ ] Confirm **location delegation** and **notification delegation** are enabled.

### 5. Play Console listing & policy
- [ ] App name, short & full description → copy from `listing.md`.
- [ ] Upload assets: 512 icon (`../icon-512.png`), feature graphic (`../feature-graphic.png`), ≥2 phone screenshots (`../screenshots/`).
- [ ] **Privacy policy URL:** `https://tobyhattenburg-beep.github.io/billiards-buddy/privacy.html` (already hosted).
- [ ] **Data safety form** → answers in `data-safety.md`.
- [ ] **Content rating** questionnaire → notes in `content-rating.md` (declare user-to-user chat).
- [ ] **Target API level 36** (PWABuilder output handles this if generated recently).

### 6. Release
- [ ] Upload the `.aab` to an **Internal testing** track first; install on a real device and confirm: full-screen (no URL bar), location/camera/notification prompts work, venues load.
- [ ] ⚠️ **If personal account:** run **Closed testing with ≥12 testers opted in for 14 continuous days** before you can apply for production. Start this ASAP — it's the longest pole.
- [ ] Promote to Production → submit for review.

---

## B. Apple App Store (iOS) — deferred until Android traction

You have no Mac, so iOS needs a cloud build. Recommended when ready:
- [ ] **Apple Developer Program** — $99/year.
- [ ] Wrap the PWA with **Capacitor** (adds real native push/geo/camera — needed to pass Apple Guideline 4.2, which rejects thin web wrappers).
- [ ] Build the signed `.ipa` on a **cloud-Mac CI** (Codemagic ~$20/mo) and upload via App Store Connect.
- [ ] Do **not** rely on PWABuilder's thin iOS wrapper as the primary path (high rejection risk).

---

## C. Activate richer venue search (optional, anytime)
- [ ] Get a **Google Places API key** (billing on; free monthly tier) → Cloudflare secret `GOOGLE_PLACES_KEY`.
- [ ] Get a **Yelp Fusion API key** (free ~5k/day) → Cloudflare secret `YELP_API_KEY`.
- [ ] Deploy `worker.js` to Cloudflare Workers; copy the worker URL.
- [ ] In `index.html`, set `VENUE_PROXY_URL` (line ~1683) to `https://<your-worker>.workers.dev/venues` and `AI_PROXY_URL` to the worker root (for Shot Analyzer AI coaching).
- [ ] Commit + push; bump `sw.js` cache. Until then, the free OpenStreetMap baseline works.

---

## Cost summary
| Item | Cost | When |
|------|------|------|
| Google Play Developer | $25 one-time | Now (Android) |
| Apple Developer | $99 / year | Later (iOS) |
| Cloud-Mac CI (Codemagic) | ~$0–20 / mo | Later (iOS) |
| Google Places / Yelp | Free tiers | Optional |
