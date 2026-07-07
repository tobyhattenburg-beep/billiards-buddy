# Venue API Runbook — Google Places + Yelp via Cloudflare Worker

_Owner playbook, written 2026-07-05. Everything here is dashboard-only — no Node, no command-line tools needed (verification uses `curl.exe`, built into Windows 11)._

The app already works with free OpenStreetMap data. Completing this runbook adds **Google Places** (rich results, photos, ratings) and optionally **Yelp** on top. Total time: ~30–45 minutes.

> **Heads up on what changed (July 2026):**
> - Google's **legacy** Places API can no longer be enabled on new projects — `worker.js` now uses **Places API (New)** (Text Search + Place Photos). Enable that exact API, not the legacy one.
> - **Yelp killed its free tier.** Plans start at ~$7.99 per 1,000 calls. Yelp is now **optional** — skip step 2 unless you want to pay; the worker merges whichever providers have keys.

---

## 1. Google Places API key (~15 min)

1. Go to <https://console.cloud.google.com/> and sign in (create the free account if asked — a credit card is required for Maps Platform, but there are free monthly call allowances before anything bills).
2. Top bar → project dropdown → **New Project** → name it `billiards-buddy` → Create → make sure it's selected.
3. Menu ☰ → **APIs & Services → Library** → search **"Places API (New)"** → open it → **Enable**.
   ⚠️ There is also a plain "Places API" (legacy) in the list — do NOT pick that one; it won't work.
4. Menu ☰ → **APIs & Services → Credentials** → **+ Create credentials → API key**. Copy the key somewhere safe.
5. Restrict the key (click the key → edit):
   - **API restrictions** → Restrict key → check **Places API (New)** only → Save.
   - Leave **Application restrictions** on "None" — the key is called from the Cloudflare Worker (server-side), so website/referrer restrictions would break it. It never ships to browsers.

**Pricing:** since March 2025 each SKU has its own free monthly allowance (roughly: Essentials 10K, Pro 5K, Enterprise 1K calls/month — verify at <https://developers.google.com/maps/billing-and-pricing>). Because the search returns **rating + open-now**, calls bill at the **Enterprise** tier (~1,000 free searches/month; each app search can use up to 4 calls as the radius expands). If you ever want more free headroom, open `worker.js` and set `GOOGLE_RICH_FIELDS = false` — venues lose the ★ rating and "Open now" tag but the search moves to the Pro tier (~5,000 free/month). Consider setting a billing budget alert in Google Cloud (Billing → Budgets & alerts).

## 2. Yelp Fusion API key (OPTIONAL — now paid)

Only do this if you want Yelp results merged in (extra coverage of bars/halls Google misses).

1. Go to <https://business.yelp.com/data/products/places-api/> → sign up for Fusion API access (plans start ~$7.99/1,000 calls; no free tier anymore).
2. Once approved, your **API Key** is in the developer portal under your app.
3. That key becomes the `YELP_API_KEY` secret in step 3. If you skip Yelp entirely, just don't add the secret — the worker handles it.

## 3. Cloudflare Worker — create, paste, add secrets, deploy (~15 min)

1. Go to <https://dash.cloudflare.com/sign-up> → create a **free** account (no card needed; free plan = 100,000 requests/day, far more than enough).
2. Left sidebar → **Workers & Pages** → **Create** → **Create Worker** → name it `bb-api` (this becomes part of your URL) → **Deploy** (it deploys a hello-world first — that's fine).
3. Click **Edit code** → select-all in the editor and delete → open `C:\Users\Toby\Projects\games\billiards-buddy\worker.js` on your PC (Notepad is fine) → copy the whole file → paste into the editor → **Deploy** (top right).
4. Add the secrets: go back to the worker's page → **Settings** tab → **Variables and Secrets** → **+ Add**:
   - Type: **Secret** · Name: `GOOGLE_PLACES_KEY` · Value: the key from step 1 → Save
   - (optional) Type: **Secret** · Name: `YELP_API_KEY` · Value: the key from step 2 → Save
   - (optional, for AI Shot Coaching) Type: **Secret** · Name: `ANTHROPIC_KEY` · Value: your Anthropic API key → Save
   - Names must match EXACTLY (all caps, underscores).
5. Copy your worker URL from the worker's overview page — it looks like:
   `https://bb-api.<your-account>.workers.dev`

## 4. Point the app at the worker

In `C:\Users\Toby\Projects\games\billiards-buddy\index.html`, near line 1698, find:

```js
const AI_PROXY_URL = '';
const VENUE_PROXY_URL = '';
```

Set them to (using YOUR worker URL):

```js
const AI_PROXY_URL = 'https://bb-api.<your-account>.workers.dev';
const VENUE_PROXY_URL = 'https://bb-api.<your-account>.workers.dev/venues';
```

(`AI_PROXY_URL` only matters if you added `ANTHROPIC_KEY`.)

Then tell Claude the URLs are in — the commit needs a `sw.js` `CACHE_NAME` bump alongside it or installed PWAs keep serving the old file.

## 5. Verify

**A. Worker direct (PowerShell — note `curl.exe`, not `curl`):**

```powershell
curl.exe -s -X POST "https://bb-api.<your-account>.workers.dev/venues" -H "Content-Type: application/json" -d "{\"lat\":34.0522,\"lng\":-118.2437,\"radius\":8000}"
```

Expected: JSON starting `{"venues":[{"id":"gp_...","name":"...","lat":34...,"lng":-118...,"rating":4.5,...}]}`. An empty `{"venues":[]}` for downtown LA means the Google key/API-enable step went wrong. `{"error":"No venue provider configured..."}` means the secret name is wrong or missing.

**B. Photo proxy:** copy any `photoUrl` value from the response and open it in a browser — a venue photo should render.

**C. In the app:** open the live app → **Venues** → allow location. Cards should now show photos, ★ ratings and review counts, and "Open now" tags (OSM-only results have none of those). If you still see plain results, hard-refresh (the service-worker cache bump in step 4 must be deployed).

---

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `{"venues":[]}` everywhere | "Places API (New)" not enabled, or key restricted to the wrong API |
| `{"error":"No venue provider configured..."}` | Secret missing or misnamed (`GOOGLE_PLACES_KEY`) |
| Photos broken but venues fine | Key restriction excludes Places API (New) photo/media, or ref malformed |
| Worked, then stopped mid-month | Free-tier call allowance exhausted — check Google Cloud billing report |
| App unchanged after editing index.html | `sw.js` cache not bumped, or GitHub Pages not redeployed yet |
