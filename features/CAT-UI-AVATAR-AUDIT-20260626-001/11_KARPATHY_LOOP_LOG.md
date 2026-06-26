# 11 — KARPATHY LOOP LOG

## Loop 1 — CDN filter coverage

**Hypothesis:** `isBannedAvatarSrc()` is applied everywhere external avatar URLs could render.  
**Experiment:** Grep all avatar components for `avatarUrl` prop usage; check each for filter call.  
**Evidence:** `CapacityAvatar.tsx` passes `avatarUrl` to Atlaskit directly. `AvatarChip.tsx` passes to `<img>` directly. `resolveActorIdentity.ts` Layer 3 returns raw `metadata.actor_avatar_url`.  
**Result:** FALSIFIED — filter missing at 3 points.  
**Decision:** Fix E3 (CapacityAvatar, AvatarChip) + E4 (resolveActorIdentity Layer 3).

---

## Loop 2 — Single source for approved profiles

**Hypothesis:** All user roster queries go through `useApprovedProfiles()` (override-aware).  
**Experiment:** Search for direct `.select('avatar_url')` on profiles table in src/.  
**Evidence:** `TestCaseComments.tsx` fetches `profiles.avatar_url` directly. `MemberStack.tsx` same.  
**Result:** FALSIFIED — 2 legacy callers bypass override merge.  
**Decision:** Fix E2 — migrate to `useApprovedProfiles()` or `useAvatarUrl()`.

---

## Loop 3 — PresenceAvatar prop contract

**Hypothesis:** `PresenceAvatar` prop type includes `avatarUrl`, and callers correctly supply it.  
**Experiment:** Read PresenceAvatar component signature; compare to call sites.  
**Evidence:** Component accepts only `{name, size, presence, displayLabel}`. WorkspaceSearchModal + ActivityRow pass `avatarUrl` prop that is silently dropped.  
**Result:** FALSIFIED — dead prop at 2 sites.  
**Decision:** Remove dead prop from call sites (E1).

---

## Loop 4 — Backend sync completeness

**Hypothesis:** All Jira user identity paths propagate avatar to `profiles.avatar_url`.  
**Experiment:** Trace `wh-jira-sync`, `wh-jira-bulk-sync`, `jira-user-sync` for writes to profiles.  
**Evidence:** `jira-user-sync` updates `jira_identity_map.avatar_url` ONLY — never touches `profiles.avatar_url`. Users created via jira-user-sync lack profile avatar.  
**Result:** FALSIFIED — gap exists.  
**Decision:** Out of scope for this feature (no migration approved). Note as Gap 1 for separate feature.
