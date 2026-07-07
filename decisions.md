# Decisions Log — Billiards Buddy → Android/iOS

_Forks in the road and why we took the branch we did. Append a new row when a real choice is made; never rewrite history — if a decision reverses, add a new entry that supersedes the old one and mark the old one `SUPERSEDED`._

Legend — **Status:** `SETTLED` (decided, acting on it) · `OPEN` (still to be decided) · `SUPERSEDED`. **Reversible:** how hard to undo.

---

### D1 — Android packaging approach
- **Date:** 2026-06-25 (confirmed 2026-07-06)
- **Status:** SETTLED · **Reversible:** Medium (could re-wrap later)
- **Options:** (a) TWA via Bubblewrap, (b) Capacitor native shell, (c) full native rewrite.
- **Choice:** **(a) TWA/Bubblewrap.**
- **Why:** The app is a content/community PWA that already works fully in Chrome; its only "native" needs (geo, camera, notifications) are web APIs TWA supports via delegation, rendering in real Chrome. Web deploys then update the app instantly with no store review. Capacitor adds a native project + WebView quirks + per-release review for zero benefit here. A rewrite is months to reproduce 11 working screens.

### D2 — Build tooling: local CLI vs cloud
- **Date:** 2026-07-06
- **Status:** SETTLED · **Reversible:** High
- **Options:** (a) Bubblewrap CLI locally, (b) PWABuilder.com cloud wrapper.
- **Choice:** **(a) Bubblewrap locally** (PWABuilder wraps this same engine).
- **Why:** Claude can run, verify AndroidManifest output, and rebuild future updates reproducibly instead of relying on an opaque cloud step.

### D3 — This-session scope
- **Date:** 2026-07-06
- **Status:** SETTLED · **Reversible:** n/a
- **Options:** (a) Phase A only then pause, (b) through the AAB build (A+B+C), (c) Phase A + create assetlinks repo.
- **Choice:** **(a) Phase A only, then pause.**
- **Why:** Phase A (PWA hardening + deploy) is fully reversible. Phase B installs ~2 GB of JDK/SDK and mints a **permanent** signing keystore — owner wants to review before that irreversible step.

### D4 — Play Console account type
- **Date:** 2026-07-06
- **Status:** ⚠️ **OPEN** · **Reversible:** Low (hard to change after signup)
- **Options:** (a) Personal — $25 + photo ID, but a **12-tester / 14-continuous-day** closed test before production (~3-week critical path). (b) Organization — needs a **D-U-N-S** number for the business entity, skips the 12-tester gate, but D-U-N-S issuance can take days.
- **Current lean:** Plan defaults to **Personal** (the safe path). Decide before Phase D. Org is only worth it if Hattenburg Masonry qualifies for D-U-N-S.
- **Blocks:** the launch timeline; recruiting testers (Personal) should start day 1.

### D5 — Package id
- **Date:** 2026-06-26
- **Status:** SETTLED · **Reversible:** ❌ None (permanent from first Play upload)
- **Choice:** `io.github.tobyhattenburg.billiardsbuddy` (matches the store kit + assetlinks template).

### D6 — Signing keystore
- **Date:** 2026-07-06 (executes in Phase B)
- **Status:** SETTLED · **Reversible:** ❌ None (permanent from first upload)
- **Choice:** Mint a **new** keystore in Phase B; **OWNER backs it up to ≥2 off-machine locations immediately.** Losing it = the app can never be updated.

### D7 — Venue data source for v1
- **Date:** 2026-07-06
- **Status:** SETTLED (for v1) · **Reversible:** High
- **Choice:** Ship on the free **OSM/Overpass** baseline; `VENUE_PROXY_URL`/`AI_PROXY_URL` stay blank. Google Places + Yelp Fusion (via Cloudflare Worker secrets) are a post-launch upgrade — owner task, see `docs/VENUE-API-RUNBOOK.md`.

### D8 — "Contains ads" data-safety declaration
- **Date:** 2026-06-26
- **Status:** SETTLED · **Reversible:** High (edit + resubmit)
- **Choice:** Declare **"contains ads: No"** — affiliate links (Amazon/eBay) open in a Chrome Custom Tab and there is no ad SDK. Defensible; if a reviewer pushes back, flip the declaration and resubmit.

### D9 — iOS approach (deferred)
- **Date:** 2026-06-25
- **Status:** OPEN (deferred until Android traction) · **Reversible:** High
- **Lean:** **Capacitor** shell + native plugins (Geolocation/Camera/Push) to pass Apple Guideline 4.2 — a thin PWABuilder iOS wrapper gets rejected. No Mac ⇒ cloud build (try free GitHub Actions macOS runners first, else Codemagic ~$20/mo). Apple Developer $99/yr.
