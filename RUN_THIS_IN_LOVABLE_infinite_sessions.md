# Infinite Session Persistence (Jira-like)

## What this does
Extends Supabase refresh token lifetime from 7 days → 30 days so users
stay logged in like Jira/Atlassian (never unexpectedly signed out).
The access token (JWT) stays at 1 hour but auto-refreshes silently.

---

## Step 1 — Paste this into Lovable chat

```
Update the Supabase project auth settings for project mqgshobotcvcjouzxdbi:
- Set refresh token expiry to 2592000 seconds (30 days)
- Keep JWT expiry at 3600 seconds (1 hour) — auto-refresh handles it
- Enable "Refresh Token Rotation" if not already enabled

Use the Supabase Management API or dashboard settings to apply this.
Do not modify any code files.
```

---

## Step 2 — Verify in Supabase Dashboard

Authentication → Policies → confirm:
- JWT Expiry: 3600
- Refresh Token Expiry: 2592000
- Refresh Token Rotation: enabled

---

## What's already live in code (no Supabase changes needed for these)

| Change | Effect |
|---|---|
| `storageKey: 'catalyst-auth-token'` | Session stored under a stable key in localStorage |
| `detectSessionInUrl: true` | OTP magic-link callbacks restore session correctly |
| `checkSession` only clears on 401 | Network offline / slow → stay logged in, don't sign out |
| Background `getUser()` verify | Token silently validated without blocking the UI |
| `autoRefreshToken: true` | Access token refreshed every ~55 min automatically |

Together these match Atlassian's session model:
- Fast app load (session from localStorage, no network wait)
- Stay logged in when offline
- Never signed out unless you explicitly sign out or the refresh token expires
- Refresh token expiry: 30 days (after Lovable step above)
