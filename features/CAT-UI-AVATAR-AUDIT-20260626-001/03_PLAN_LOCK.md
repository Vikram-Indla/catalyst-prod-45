# 03 — PLAN LOCK
# CAT-UI-AVATAR-AUDIT-20260626-001

**Status:** AWAITING VIKRAM APPROVAL — do not code until approved.  
**Timebox:** ≤ 2 hours  
**Date:** 2026-06-26

---

## Objective

Fix 4 avatar consistency issues found during audit. All fixes are surgical frontend
changes — no migrations, no DB mutations, no new tables.

---

## Non-Scope (explicitly excluded)

- Gap 1: `jira-user-sync` not propagating to `profiles.avatar_url` (needs separate discussion)
- Gap 2: `standup_sessions.driver_avatar_url` orphaned column (needs migration approval)
- Gap 3: Avatar staleness/invalidation system
- New canonical hooks — existing `useApprovedProfiles`, `resolveAvatarUrl` stay unchanged
- Admin avatar page — no changes
- Any migration files

---

## Canonical Pattern (enforced by this Plan Lock)

```
Admin override (catalyst_resource_avatars)
  → resolveAvatarUrl(name) [bundled photo]
    → initials fallback (CatalystAvatar deterministic color)

CDN guard: isBannedAvatarSrc(src) from CatalystAvatar.tsx MUST wrap every
           external avatarUrl before render.
```

---

## Fixes — Ordered by Priority

### FIX 1 — E4: `resolveActorIdentity.ts` Layer 3 CDN leak (HIGH)

**File:** `src/features/notifications/resolveActorIdentity.ts`

Layer 3 currently returns raw `metadata.actor_avatar_url` without CDN filter.
If actor not in approved profiles and metadata contains Jira CDN URL → banned URL renders.

**Change:** Import `isBannedAvatarSrc` from `CatalystAvatar`. In Layer 3:
```typescript
// BEFORE
avatarUrl: p?.avatarUrl ?? metaActorAvatar ?? null

// AFTER
avatarUrl: p?.avatarUrl ?? (isBannedAvatarSrc(metaActorAvatar) ? null : metaActorAvatar) ?? null
```

**Files to touch:** 1 (`resolveActorIdentity.ts`)  
**Risk:** Low — adds null path where CDN URL would have rendered.

---

### FIX 2 — E3a: `CapacityAvatar.tsx` missing CDN filter (HIGH)

**File:** `src/components/capacity/CapacityAvatar.tsx`

Accepts `avatarUrl` prop, passes to Atlaskit Avatar directly, no ban check.

**Change:** Import `isBannedAvatarSrc`. Apply before passing to Avatar:
```typescript
// BEFORE
<AtlaskitAvatar src={avatarUrl} ... />

// AFTER
<AtlaskitAvatar src={isBannedAvatarSrc(avatarUrl) ? undefined : avatarUrl} ... />
```

**Files to touch:** 1 (`CapacityAvatar.tsx`)  
**Risk:** Low — null path falls back to Atlaskit initials (already handled by that component).

---

### FIX 3 — E3b: `AvatarChip.tsx` missing CDN filter (HIGH)

**File:** `src/components/workhub/shared/AvatarChip.tsx`

Accepts `avatarUrl` prop, passes directly to `<img>` or Atlaskit, no ban check.

**Change:** Import `isBannedAvatarSrc`. Apply before render:
```typescript
const safeUrl = isBannedAvatarSrc(avatarUrl) ? undefined : avatarUrl
// use safeUrl everywhere avatarUrl was used
```

**Files to touch:** 1 (`AvatarChip.tsx`)  
**Risk:** Low.

---

### FIX 4 — E2: `TestCaseComments.tsx` direct `profiles.avatar_url` query (MED)

**File:** `src/components/releases/test-case-detail/TestCaseComments.tsx`

Direct `.select('avatar_url')` from profiles — skips admin override merge.

**Change:** Replace direct `.select(...avatar_url...)` with `useAvatarUrl(profileId, fullName)` hook
per profile, OR (if batch) use `useApprovedProfiles()` map.

**Files to touch:** 1 (`TestCaseComments.tsx`)  
**Risk:** Low — functional change: admin overrides now apply here (previously ignored).

---

### FIX 5 — E2b: `MemberStack.tsx` direct `profiles.avatar_url` query (MED)

**File:** `src/components/projecthub/MemberStack.tsx`

Same pattern as E2 — direct `avatar_url` select.

**Change:** Use `useApprovedProfiles()` to get avatarUrl per member.

**Files to touch:** 1 (`MemberStack.tsx`)  
**Risk:** Low.

---

### FIX 6 — E1: Remove dead `avatarUrl` prop from `PresenceAvatar` callers (LOW)

**Files:**
- `src/features/chat-v2/components/Search/WorkspaceSearchModal.tsx`
- `src/features/chat-v2/components/Activity/ActivityRow.tsx`

`PresenceAvatar` has no `avatarUrl` prop. Callers pass it silently (dropped).

**Change:** Remove `avatarUrl={...}` prop from both call sites. No behavior change.

**Files to touch:** 2  
**Risk:** Zero — currently ignored; removing makes prop contract explicit.

---

## Files to Modify (exact list)

| File | Fix | Change Size |
|------|-----|-------------|
| `src/features/notifications/resolveActorIdentity.ts` | E4 | 2 lines |
| `src/components/capacity/CapacityAvatar.tsx` | E3a | 2-3 lines |
| `src/components/workhub/shared/AvatarChip.tsx` | E3b | 2-3 lines |
| `src/components/releases/test-case-detail/TestCaseComments.tsx` | E2 | ~5-10 lines |
| `src/components/projecthub/MemberStack.tsx` | E2b | ~5-10 lines |
| `src/features/chat-v2/components/Search/WorkspaceSearchModal.tsx` | E1 | 1 line |
| `src/features/chat-v2/components/Activity/ActivityRow.tsx` | E1 | 1 line |

**Total: 7 files, all surgical, no new abstractions.**

---

## Files FORBIDDEN to Modify

- `src/lib/avatars.ts` (canonical resolver — do not touch)
- `src/components/shared/CatalystAvatar.tsx` (canonical component — do not touch)
- `src/hooks/useApprovedProfiles.ts` (canonical hook — do not touch)
- `src/hooks/useResourceAvatarOverrides.ts` (canonical hook — do not touch)
- Any `supabase/migrations/` file

---

## UI/UX Rules

- No visual changes for normal paths (bundled/override avatars unchanged)
- CDN URLs → initials fallback (already existing graceful path)
- No new components, no new hooks

---

## Validation Commands

```bash
# TypeScript check
cd ~/catalyst && npx tsc --noEmit

# Verify isBannedAvatarSrc import in modified files
grep -n "isBannedAvatarSrc" src/features/notifications/resolveActorIdentity.ts
grep -n "isBannedAvatarSrc" src/components/capacity/CapacityAvatar.tsx
grep -n "isBannedAvatarSrc" src/components/workhub/shared/AvatarChip.tsx

# Verify dead prop removed
grep -n "avatarUrl" src/features/chat-v2/components/Search/WorkspaceSearchModal.tsx
grep -n "avatarUrl" src/features/chat-v2/components/Activity/ActivityRow.tsx
```

---

## Stop Conditions

- TypeScript errors → fix before commit
- Any new abstraction (hook/component) not in this plan → STOP, re-plan
- Any migration file touched → STOP immediately

---

## Drift / Rebaseline Rules

- If TestCaseComments or MemberStack query turns out complex → scope to E4+E3 only, separate PR for E2
- If `MemberStack.tsx` already uses `useApprovedProfiles()` → skip E2b

---

## Screenshot Checklist

This is a logic/correctness fix. No UI-visible changes for normal cases (bundled photos/overrides
still render identically). CDN URL paths (which should be invisible in prod) → initials fallback.
Screenshots not required per CATALYST_UI_UX_ACCEPTANCE.md for non-visual-change PRs.

---

## ⚠️ AWAITING VIKRAM APPROVAL

**Do not code until Vikram has reviewed and approved this Plan Lock.**

Confirm:
1. Scope correct (7 files, no migration)
2. E2 fixes in scope (MemberStack, TestCaseComments) or defer to separate PR?
3. E1 fixes in scope or skip?
