# Firebase Realtime Database — Production Security Rules

**Status: the database may still be in test mode (open writes). Setting these rules is an OWNER action — Claude cannot do it.**

## How to apply (2 minutes)

1. Open <https://console.firebase.google.com> → project **billiards-buddy-fd045**.
2. Left sidebar → **Realtime Database** → **Rules** tab.
3. Replace the entire contents with the JSON below → **Publish**.
4. Sanity-check in the app: chat send still works, leaderboard still updates, and posting/liking a highlight works. (Everything the app does is anonymous-auth'd, so `auth != null` is satisfied.)

## Paths the app uses (inventoried from index.html, 2026-07-05)

| Path | Written by | Notes |
|---|---|---|
| `community/<room>/<pushId>` | `sendCommunityMessage()` | `{text,user,uid,ts}` — text ≤ 400 chars |
| `reports/<room>/<msgKey>` | `reportMessage()` | `{reporter,ts}` — write-only for users |
| `leaderboard/<uid>` | `publishLeaderboardEntry()` | own entry only |
| `feed/<pushId>` | `submitHighlight()` | `{user,seed,cap,url,likes,ts,uid}` |
| `feed/<pushId>/likes/<uid>` | `toggleLike()` | own like only |
| `challenges/<uid>/<pushId>` | `sendChallenge()` (to another's inbox), `respondChallenge()` (own inbox) | recipient reads/updates own inbox |
| `matchClaims/<oppUid>/<id>` | `submitRankedMatch()` (claimant), `respondMatch()` (recipient) | recipient confirms/disputes |
| `matchConfirms/<claimUid>/<id>` | `respondMatch()` (opponent), removed by claimant | verdict hand-back |

## Rules JSON (paste verbatim)

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "community": {
      "$room": {
        ".read": true,
        "$msgId": {
          ".write": "auth != null && !data.exists()",
          ".validate": "newData.hasChildren(['text','user','uid','ts']) && newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 400 && newData.child('user').isString() && newData.child('user').val().length <= 40 && newData.child('uid').val() === auth.uid && newData.child('ts').isNumber()"
        }
      }
    },

    "reports": {
      "$room": {
        "$msgId": {
          ".write": "auth != null && !data.exists()",
          ".validate": "newData.hasChildren(['reporter','ts']) && newData.child('reporter').val() === auth.uid"
        }
      }
    },

    "leaderboard": {
      ".read": true,
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['name','skill','wins']) && newData.child('name').isString() && newData.child('name').val().length <= 40 && newData.child('skill').isNumber() && newData.child('skill').val() >= 800 && newData.child('skill').val() <= 3000 && newData.child('wins').isNumber() && newData.child('wins').val() >= 0"
      }
    },

    "feed": {
      ".read": true,
      "$postId": {
        ".write": "auth != null && !data.exists() && newData.child('uid').val() === auth.uid",
        ".validate": "newData.hasChildren(['user','url','ts']) && newData.child('user').isString() && newData.child('user').val().length <= 40 && newData.child('url').isString() && newData.child('url').val().length <= 500 && newData.child('cap').val().length <= 200",
        "likes": {
          "$uid": {
            ".write": "auth != null && auth.uid === $uid",
            ".validate": "newData.val() === true"
          }
        }
      }
    },

    "challenges": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$chalId": {
          ".write": "auth != null && ((!data.exists() && newData.child('fromUid').val() === auth.uid) || auth.uid === $uid)",
          ".validate": "!newData.exists() || newData.isString() || (newData.hasChildren(['fromUid','fromName','status']) && newData.child('fromName').val().length <= 40)",
          "status": { ".validate": "newData.val() === 'pending' || newData.val() === 'accepted' || newData.val() === 'declined'" }
        }
      }
    },

    "matchClaims": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$claimId": {
          ".write": "auth != null && ((!data.exists() && newData.child('fromUid').val() === auth.uid) || auth.uid === $uid)",
          "status": { ".validate": "newData.val() === 'pending' || newData.val() === 'confirmed' || newData.val() === 'disputed'" }
        }
      }
    },

    "matchConfirms": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$claimId": {
          ".write": "auth != null",
          ".validate": "!newData.exists() || (newData.hasChildren(['confirmed','by']) && newData.child('by').val().length <= 40)"
        }
      }
    }
  }
}
```

## What these rules enforce

- **Default deny** — anything not listed is unreadable/unwritable.
- **Chat**: read-open (public rooms), write requires anonymous auth, message immutable once posted (`!data.exists()` — no edits/deletes by users), text capped at 400 chars, `uid` must match the sender (no spoofing another uid — this also backs the client-side block feature).
- **Leaderboard**: anyone can read; you can only write **your own** entry; skill clamped to a sane 800–3000 range.
- **Feed**: read-open; posts immutable and must carry the author's real uid; likes only settable/removable under your own uid.
- **Challenges / matchClaims**: only the recipient can read their inbox; senders may only **create** (not modify) an entry that names them as `fromUid`; only the inbox owner can update status or delete.
- **matchConfirms**: only the claimant can read their verdicts; opponents can write a verdict; claimant removes processed ones.
- **Reports**: write-only for users (nobody can read reports except via the console/Admin SDK), immutable.

## Caveats (accepted trade-offs for an anonymous-auth app)

- Anonymous auth means one physical user can mint many uids; rules can't stop leaderboard self-inflation via fresh identities. Real accounts (Google sign-in) would be the fix if this becomes a problem.
- `challenges` create-writes allow any authed user to put an entry in anyone's inbox — that's the feature; the recipient can decline/remove and the client blocklist hides abusers.
- Old data written during test mode isn't retro-validated; if there's junk in the DB, clear the offending nodes from the console once, after publishing these rules.
