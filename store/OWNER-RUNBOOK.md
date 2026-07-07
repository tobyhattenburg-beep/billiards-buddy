# OWNER RUNBOOK — Ship Billiards Buddy to Google Play

_Follow top to bottom. Everything Claude could do is done; each step below needs YOU (accounts, payments, ID). Verified current as of 2026-07-05. Est. active time: ~2–3 hours spread over a few days, plus the mandatory 14-day test window._

**The one thing you cannot skip or rush:** your Play account is personal and (if created after Nov 13, 2023) requires a **closed test with 12 testers opted in for 14 consecutive days** before production. Start recruiting testers on day 1.

> **Full A–H build roadmap (what Claude does vs. what you do):** see [`ANDROID-ROADMAP.md`](./ANDROID-ROADMAP.md) in this folder.

---

## STEP 1 — Create your Google Play Developer account (Day 1, ~30 min + up to 2 days verification)

1. Go to **https://play.google.com/console/signup**
2. Sign in with the Google account you want to own the app forever (suggest `hattenburgmasonry84@gmail.com` or a dedicated one — cannot easily transfer later).
3. Choose account type: **Personal**. (Organization needs a D-U-N-S number but skips the 12-tester rule — only worth it if you have a registered business entity.)
4. Pay the **$25 one-time fee** (credit/debit card).
5. Complete **identity verification** — photo ID upload. Approval usually takes hours, up to 2 days.
6. While waiting, do Steps 2–4 below — they don't need the account.

---

## STEP 2 — Recruit your 12 testers (Day 1 — longest pole, start NOW)

- You need **at least 12 people with Android phones + Gmail addresses** who will opt in and stay opted in for **14 consecutive days**. Opting out and back in resets their clock; uninstalling does NOT (opt-in is what counts).
- Recruit 15–16 so dropouts don't sink you.
- Collect their **Gmail addresses** in a list — you'll paste them into Play Console in Step 8.
- Friends, family, league teammates, the pool hall group chat — anyone with Android.

---

## STEP 3 — Package the app with PWABuilder (~15 min)

1. Go to **https://www.pwabuilder.com**
2. Enter: `https://tobyhattenburg-beep.github.io/billiards-buddy/` → **Start**.
3. Scorecard should pass (manifest already has `id`, maskable icon, screenshots). Ignore cosmetic suggestions.
4. Click **Package For Stores** → **Android** → **Google Play**.
5. In the options dialog, set:
   - **Package ID:** `io.github.tobyhattenburg.billiardsbuddy` — ⚠️ PERMANENT, cannot change after first upload.
   - **App name:** `Billiards Buddy` · **Short name:** `BB Buddy`
   - **Version:** `1.0.0` (versionCode 1)
   - **Signing key:** choose **"Create new"** (let PWABuilder generate it).
   - **Location delegation:** ON · **Notification delegation:** ON (under "All settings"/advanced if shown).
6. Download the **zip**. It contains:
   - `*.aab` — the file you upload to Play
   - `signing.keystore` + `signing-key-info.txt` — your signing identity
   - `assetlinks.json` — pre-filled with your key's SHA-256

### 🔒 STEP 3b — BACK UP THE KEYSTORE (do it immediately)
Copy `signing.keystore` + `signing-key-info.txt` to **at least two places off this PC** (Google Drive + a USB stick, email it to yourself, etc.). **If you lose these you can NEVER update the app again.** This is the single most common way solo devs brick their app.

### STEP 3c — Sanity-check the generated project (2 min)
Unzip the source it gives you and open `AndroidManifest.xml` in Notepad. Confirm these lines exist (Bubblewrap occasionally omits CAMERA):
- `android.permission.INTERNET`
- `android.permission.ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`
- `android.permission.CAMERA`
- `android.permission.POST_NOTIFICATIONS`

Also confirm `targetSdkVersion` is **36** (required for all new-app submissions from **Aug 31, 2026**; if you submit before that date 35 passes, but 36 future-proofs updates). If anything is missing, re-generate on pwabuilder.com — its output updates with Google's requirements — or ask Claude to patch and rebuild.

---

## STEP 4 — Publish assetlinks.json at your domain ROOT (~10 min)

This removes the browser URL bar so the app looks native. The file must live at
`https://tobyhattenburg-beep.github.io/.well-known/assetlinks.json` — that's your **user-pages repo**, NOT the billiards-buddy repo.

1. Go to **https://github.com/new**
2. Repository name: exactly **`tobyhattenburg-beep.github.io`** · Public · Create.
3. In the new repo: **Add file → Create new file**.
   - Filename: `.well-known/assetlinks.json` (typing the `/` creates the folder)
   - Contents: paste the `assetlinks.json` from your PWABuilder zip. It looks like `store/assetlinks-template.json` with the first fingerprint filled in.
4. Add a second file named `.nojekyll` (empty contents) at the repo root.
5. Wait ~2 min, then open `https://tobyhattenburg-beep.github.io/.well-known/assetlinks.json` in a browser — you must see the JSON (200), not a 404.
6. **AFTER your first upload to Play (Step 7):** Play Console → **Test and release → Setup → App signing** → copy the **App signing key certificate SHA-256** → add it as a second entry in the `sha256_cert_fingerprints` array → commit. That fingerprint is the one real Play installs use — without it users get a URL bar.

---

## STEP 5 — Create the app in Play Console (~10 min)

1. **https://play.google.com/console** → **Create app**.
2. App name: `Billiards Buddy` · Default language: `en-US` · **App or game:** App · **Free or paid:** Free.
3. Accept the declarations → **Create app**.

---

## STEP 6 — App content forms (Policy → App content) (~30 min)

Work through every item on the **App content** page:

### 6a. Privacy policy
Paste: `https://tobyhattenburg-beep.github.io/billiards-buddy/privacy.html`

### 6b. Ads
**No** — the app contains no ad SDKs (affiliate links are not ads in this form's sense).

### 6c. App access
**All functionality is available without special access** (no login required).

### 6d. Content rating (IARC questionnaire)
Category: **Utility / Reference** (or "Social" if forced). Paste-ready answers:
- Violence, sexuality, profanity, controlled substances, gambling: **No** to all.
- **Users can interact or exchange content: YES** (community chat + highlights).
- Moderation in place: profanity filter, per-message report, per-user block, contact email for takedowns.
- Does the app share the user's location with other users: **No**.
- In-app purchases: **No**.

### 6e. Target audience
**18 and over** (simplest — avoids child-safety review; the chat makes "under 13" a non-starter).

### 6f. News app: **No** · COVID app: **No** · Government app: **No**

### 6g. Data safety (copy from `data-safety.md`, summary):
- Collects data: **Yes**
- **Location (approx + precise):** collected, shared (Google/Yelp/OSM for venue search), optional, purpose = App functionality.
- **Photos (camera):** collected, shared (Anthropic, only when user requests AI coaching), optional, App functionality.
- **Messages (UGC chat):** collected, not shared, App functionality.
- **App activity (stats, display name, avatar):** collected, not shared, App functionality.
- **Device/other IDs (Firebase anonymous ID):** collected, not shared, App functionality.
- Encrypted in transit: **Yes** · Deletion path: **Yes** (contact email) · Data sold: **No**.
- Account creation: **none / anonymous**.

### 6h. Financial features: **None** · Health: **None**

---

## STEP 7 — Store listing + first upload (~20 min)

### Main store listing (Grow → Store presence → Main store listing)
- **App name:** `Billiards Buddy`
- **Short description:** `Find pool halls near you, sharpen your game, and join the players' community.`
- **Full description:** copy the full block from `listing.md`.
- **App icon:** upload `icon-512.png` (512×512).
- **Feature graphic:** upload `feature-graphic.png` (1024×500).
- **Phone screenshots:** upload `screenshots/phone-1.png`, `phone-2.png`, `phone-3.png`.
- Category: **Sports** · Tags: pool, billiards · Contact email: `hattenburgmasonry84@gmail.com`.

### Upload the build
1. **Test and release → Testing → Internal testing → Create new release**.
2. On first upload, accept **Play App Signing** (default — Google holds the production key; your keystore becomes the upload key).
3. Upload the `.aab` from the PWABuilder zip → Release name `1.0.0` → notes: "First build" → **Save → Review → Roll out to internal testing**.
4. Add yourself as an internal tester (your Gmail), install via the opt-in link on your phone and verify: **no URL bar** (needs Step 4.6 done), location prompt works, camera works in Shot Analyzer, chat sends, venues load.

---

## STEP 8 — Closed testing: the 14-day clock (start ASAP)

1. **Testing → Closed testing → Create track** (or use the default Alpha track) → **Create new release** → promote the same `.aab`.
2. **Testers tab** → create an email list → paste your 12+ tester Gmails → save.
3. Send testers the **opt-in link** (shown on the Testers tab). Each must: open link → "Become a tester" → install from the Play link.
4. Verify the tester count in Play Console shows **≥12 opted in**. The 14-day clock runs from when the 12th stays opted in — **testers who opt out and back in reset their own 14 days**; tell them to just leave it installed (even uninstalling is OK as long as they don't opt out).
5. During the 14 days: nudge testers to actually open the app a few times (Google looks for engagement signals when you apply).

---

## STEP 9 — Apply for production (Day ~15)

1. After 14 continuous days with ≥12 opted-in testers, Play Console shows **"Apply for production"** on the dashboard → click it.
2. Answer the short questionnaire honestly (who tested, what feedback, who the app is for). Approval typically takes a few days.
3. Once granted: **Production → Create new release** → same `.aab` → **Roll out to production** → app goes into review (usually 1–7 days for a first app) → LIVE. 🎱
4. **Now do Step 4.6** if you haven't (add the Play App Signing SHA-256 to assetlinks.json) — production installs use Google's key, not yours.

---

## Fail-safes & gotchas
- **Rejection risk "minimum functionality / web wrapper":** if reviewed harshly, reply/resubmit emphasizing native features (GPS venue finder, camera AR analyzer, push-capable notifications, offline PWA). The listing copy already leads with these.
- **Keystore:** backed up in two places? Check again.
- **Any Play Console form change** (data safety, content rating) requires a new review — get them right the first time from this runbook.
- **After any app-content change on the website**, no store update is needed — the TWA loads the live site. Only manifest/icon/package changes need a new `.aab`.

## iOS (deferred — do after Android traction)
Apple Developer $99/yr + Capacitor wrapper + cloud-Mac CI (Codemagic ~$20/mo). PWABuilder's thin iOS wrapper has high rejection risk under Guideline 4.2. When ready, ask Claude to set up the Capacitor project and Codemagic pipeline.
