# 01 — OBJECTIVE

## Problem Statement

Face avatars in Catalyst consume from multiple data sources inconsistently.
Some render paths bypass the CDN-ban filter (`isBannedAvatarSrc()`), meaning
Jira/Gravatar external URLs can leak into the UI. Some surfaces use legacy hooks
that skip the admin-override merge layer.

## Goal

**Every face avatar in the app must:**
1. Resolve through the canonical chain: admin override → bundled photo → initials
2. Never render a banned CDN URL (gravatar.com, atl-paas.net, atlassian avatar CDN)
3. Pull from one single hook path (`useApprovedProfiles` or `useAvatarUrl`) — not raw `profiles.avatar_url`

## Canonical Single Source (confirmed by audit)

| Layer | Source | Mechanism |
|-------|--------|-----------|
| 1st | Admin override | `catalyst_resource_avatars` table via `useResourceAvatarOverrides()` |
| 2nd | Bundled photo | `resolveAvatarUrl(name)` from `/src/assets/avatars/*.{png,jpg}` |
| 3rd | Initials fallback | `CatalystAvatar` deterministic-color tile |
| BANNED | External CDN | `isBannedAvatarSrc()` — reject gravatar, atl-paas.net, atlassian avatar CDNs |

## Out of Scope
- `jira-user-sync → profiles.avatar_url` propagation gap (separate feature)
- `standup_sessions.driver_avatar_url` orphaned column (needs migration approval)
- Avatar staleness/invalidation system
- Admin avatar page
