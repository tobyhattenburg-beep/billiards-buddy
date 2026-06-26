# Play Data Safety form — answer sheet

Fill these in Play Console → App content → Data safety. **Must match `privacy.html`.**

## Does your app collect or share any of the required user data types? → **Yes**

## Data types

### Location — Approximate & Precise location
- Collected: **Yes** · Shared: **Yes** (sent to Google Places / Yelp / OpenStreetMap to return nearby venues)
- Processed ephemerally: partly (last position cached on-device)
- Required or optional: **Optional** (user grants location permission)
- Purpose: **App functionality** (find nearby venues)

### Photos/Videos (camera) — Shot Analyzer
- Collected: **Yes** (a still image may be sent for AI coaching when the user requests it) · Shared: **Yes** (to the AI coaching provider, Anthropic, only on request)
- Required or optional: **Optional**
- Purpose: **App functionality**
- Note: camera is only used while the Analyzer is open, after permission.

### Messages / User-generated content — Community chat
- Collected: **Yes** · Shared: **No**
- Purpose: **App functionality** (chat, highlights)
- Stored in Firebase. Users sign in anonymously.

### App activity / In-app actions — game stats, leaderboard
- Collected: **Yes** (skill, wins/losses, display name, avatar choice) · Shared: **No**
- Purpose: **App functionality** (leaderboard, profile)

### Device or other IDs
- Collected: **Yes** (Firebase anonymous auth ID) · Shared: **No**
- Purpose: **App functionality**

## Security practices
- Data encrypted in transit: **Yes** (HTTPS/Firebase).
- Users can request data deletion: **Yes** — via the contact email; local data is cleared by uninstalling / clearing site data.
- No data is sold.

## Account creation
- No account / no email or password required (anonymous sign-in).
