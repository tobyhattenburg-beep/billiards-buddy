# Phase C — Digital Asset Links (user-pages repo)

The TWA verifies app↔site ownership via
`https://tobyhattenburg-beep.github.io/.well-known/assetlinks.json` — the **origin
root**, which only the *user-pages* repo can serve (the project repo serves under
`/billiards-buddy/`). Without it, the installed app shows a browser URL bar.

## Create the repo (~3 minutes, or ask Claude once it has access)

1. New **public** repo named exactly `tobyhattenburg-beep.github.io`.
2. Add two files:
   - `.nojekyll` — empty file (Jekyll would otherwise ignore the `.well-known` dotfolder).
   - `.well-known/assetlinks.json` — the `assetlinks.json` in this folder, verbatim.
3. Repo Settings → Pages → deploy from `master`/`main` root (user-pages repos
   usually enable this automatically).
4. Verify: `https://tobyhattenburg-beep.github.io/.well-known/assetlinks.json`
   returns the JSON (may take a minute after the first push).

## The fingerprint in assetlinks.json

`FB:90:36:9F:…:AB:1A` is the real SHA-256 of the **upload keystore** minted
2026-07-14 (alias `billiardsbuddy`) — already filled in, nothing to replace.

## After the first Play upload (Phase F gate — do not skip)

Play App Signing re-signs the app with Google's key. Copy its SHA-256 from
**Play Console → Test and release → Setup → App integrity → App signing key
certificate** and add it as a second entry in `sha256_cert_fingerprints`:

```json
"sha256_cert_fingerprints": [
  "FB:90:36:9F:D6:62:0D:88:93:13:8B:F9:1E:E8:01:F8:18:E0:F2:27:5C:40:A3:D3:D1:CF:FA:33:EF:4C:AB:1A",
  "<PLAY-APP-SIGNING-SHA256-HERE>"
]
```

Production installs are verified against the *Play* key, so this second entry is
what removes the URL bar for real users.
