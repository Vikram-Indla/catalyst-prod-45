# 02 — CANONICAL DISCOVERY

Discovery agents ran in parallel (2026-06-26). Full audit of:
- All face avatar components + call sites (Agent 1 — 78k tokens, 59 tool uses)
- Backend DB schema + edge function sync paths (Agent 2 — 83k tokens, 55 tool uses)

---

## Avatar Component Hierarchy (found in src/)

| Component | Path | CDN Filter | Override-aware | Status |
|-----------|------|------------|----------------|--------|
| `CatalystAvatar` (shared) | `components/shared/CatalystAvatar.tsx` | ✅ `isBannedAvatarSrc()` | Yes (accepts src prop) | **CANONICAL** |
| `UserAvatar` | `components/shared/UserAvatar.tsx` | ✅ strips external | Yes (wraps CatalystAvatar) | **CANONICAL** |
| `CatalystOwnerAvatar` | `components/ui/catalyst/CatalystOwnerAvatar.tsx` | ✅ via resolveAvatarUrl | Yes | OK |
| `CurrentUserAvatar` | `components/project-hub/shell/CurrentUserAvatar.tsx` | ✅ via UserAvatar | Yes | OK |
| `PresenceAvatar` | `features/chat-v2/components/shared/PresenceAvatar.tsx` | ✅ bundled-only | No (ignores avatarUrl prop) | ⚠️ E1 |
| `AtlaskitAvatar` | `components/chat/main/AtlaskitAvatar.tsx` | ✅ via resolveAvatarUrl | No | OK |
| `KanbanAvatar` | `components/kanban/KanbanAvatar.tsx` | ✅ prefers bundled | No | OK |
| **`CapacityAvatar`** | `components/capacity/CapacityAvatar.tsx` | ❌ **MISSING** | No | **FIX E3** |
| **`AvatarChip`** | `components/workhub/shared/AvatarChip.tsx` | ❌ **MISSING** | No | **FIX E3** |

---

## Data Sources

| Source | Table/Path | Column | Synced By | Runtime Use |
|--------|-----------|--------|-----------|-------------|
| Bundled photos | `src/assets/avatars/*.png` | (file) | `jira-avatar-sync` (dev-time) | `resolveAvatarUrl(name)` |
| Admin overrides | `catalyst_resource_avatars` | `avatar_url` | Admin upload | `useResourceAvatarOverrides()` |
| Profiles (Jira CDN) | `profiles` | `avatar_url` | `wh-jira-sync`, `wh-jira-bulk-sync` | BANNED at render by `isBannedAvatarSrc()` |
| Jira identity map | `jira_identity_map` | `avatar_url` | `jira-user-sync` | Filtered at render via `CatalystAvatar` |
| Notification metadata | `notifications` | `metadata.actor_avatar_url` | `wh-jira-sync` | **E4: not filtered in Layer 3** |

---

## Issues Found

### E4 — HIGH — `resolveActorIdentity.ts` Layer 3 missing CDN filter
**File:** `src/features/notifications/resolveActorIdentity.ts`
**Problem:** Layer 3 fallback returns raw `metadata.actor_avatar_url` without `isBannedAvatarSrc()` check.
If actor not in approved profiles and metadata contains Jira CDN URL → CDN URL renders.
**Fix:** Wrap `metaActorAvatar` with `isBannedAvatarSrc(metaActorAvatar) ? null : metaActorAvatar`

### E3 — HIGH — `CapacityAvatar` + `AvatarChip` render CDN URLs unfiltered
**Files:** `components/capacity/CapacityAvatar.tsx`, `components/workhub/shared/AvatarChip.tsx`
**Problem:** Both accept `avatarUrl` prop and pass directly to `<img>` or Atlaskit without ban check.
**Fix:** Import `isBannedAvatarSrc` from `shared/CatalystAvatar`; apply before rendering.

### E2 — MED — Legacy `profiles.avatar_url` direct queries bypass override merge
**Files:** `components/releases/test-case-detail/TestCaseComments.tsx`, `components/projecthub/MemberStack.tsx`
**Problem:** Direct `.select('avatar_url')` from profiles — skips `catalyst_resource_avatars` override.
**Fix:** Migrate to `useApprovedProfiles()` or `useAvatarUrl(profileId, name)`.

### E1 — LOW — `PresenceAvatar` callers pass dead `avatarUrl` prop
**Files:** `features/chat-v2/components/Search/WorkspaceSearchModal.tsx`, `features/chat-v2/components/Activity/ActivityRow.tsx`
**Problem:** `PresenceAvatar` has NO `avatarUrl` in its prop type; callers silently waste prop.
**Fix:** Remove `avatarUrl={...}` from those 2 call sites.

---

## Backend Gaps (noted, out of scope for this feature)

- **Gap 1:** `jira-user-sync` writes `jira_identity_map.avatar_url` but never propagates to `profiles.avatar_url`. Users created via jira-user-sync have no profile avatar. (separate feature needed)
- **Gap 2:** `standup_sessions.driver_avatar_url` column exists (migration 2026-06-14) but no code populates it. (needs migration approval to fix/drop)
- **Gap 3:** No staleness detection — `profiles.avatar_url` keeps old Jira CDN URL when Jira user changes avatar. (separate feature)

---

## Canonical Hooks (DO NOT MODIFY)

| Hook | File | Purpose |
|------|------|---------|
| `resolveAvatarUrl(name)` | `src/lib/avatars.ts` | Bundled photo resolver |
| `useApprovedProfiles()` | `src/hooks/useApprovedProfiles.ts` | All profiles with override merge |
| `useResourceAvatarOverrides()` | `src/hooks/useResourceAvatarOverrides.ts` | Admin override map |
| `useAvatarUrl(profileId, name)` | `src/hooks/useAvatarUrl.ts` | Override-aware single-profile |
| `isBannedAvatarSrc(src)` | `src/components/shared/CatalystAvatar.tsx` (exported) | CDN ban guard |
