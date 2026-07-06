# CAT-STRATA-20260705-001 — Handover

> State handover for next session. **Checkpoint: 2026-07-05, session 003 — STRATA ON MAIN @ 3cf792749.**
> State handover for next session. **Checkpoint: 2026-07-06, session 004 (functional recovery — operating loop closed).**

## Feature Work ID
CAT-STRATA-20260705-001

## Status
PHASE 3 + D-012 lift + D-013 entrypoint wiring **MERGED TO MAIN @ 3cf792749** (core a4e81a8b8 → lift db38e46cd →
entrypoint 2c3f8c15f → merge w/ main's wiki-restore preserved + CRE duplicate-block dedupe, amended into 3cf7927).
Route to main: PR #321 was merged early by owner with a "keep main layout" resolution that reverted the nav wiring;
this session re-merged origin/main into the branch, restored the STRATA wiring (HubSwitcher/SidebarBase), fixed a
merge-duplicated isCREGovernedType block that boot-crashed the app, verified /strata + /wiki live, and pushed main.
DRIFT-004 (cwd-reset commit on the wiki branch, fully recovered, zero loss) is in 08_DRIFT_LOG.

## Branch / HEAD
- Worktree: `.claude/worktrees/strata-20260705`
- Branch: `worktree-strata-20260705` (base origin/main @ ef796d36f)
- HEAD: **db38e46cd** (design lift) on top of a4e81a8b8 (core). Lift contents:
  `src/modules/strata/components/shared.tsx` (v2: StrataPageChrome, StrataStatStrip, StrataScoreRing/BandBar/TrendSpark,
  StrataPanel v2, StrataChipMenu, formatted evidence drawer), `src/modules/strata/components/format.ts` (NEW),
  `src/modules/strata/hooks/useStrata.tsx` (useProfileNames + evidence-first default period),
  `src/modules/strata/domain/index.ts` (frozen line hydration), and all 12 page files.
- `.env.local` in the worktree = staging env copy — NEVER commit.

## What changed visually (summary)
Canonical JiraTables replace 9 hand-rolled tables; owner names (never UUIDs, never "Set"); labelized enums;
fmtScore/fmtSar/fmtDate everywhere; score rings + band-colored weight bars + sparklines; icon page chrome +
panel headers with counts; typed element chips; perspective-colored map nodes + tokenized xyflow chrome;
stateful pipeline stepper + segmented row counts; governed weight bars with validity lozenge; ads Modal replaces
window.prompt; dead controls removed; per-panel error degradation; light+dark verified.

## Gates (final, session 003)
tsc -p tsconfig.app.json = 183 errors (baseline exactly, 0 in strata) · lint:colors:gate 0 = baseline ·
audit:ads:gate all categories = baseline · banned-color grep on module = 0. Vitest still broken on Node 20 → CI.

## Known follow-ups
- ads DropdownMenu wrapper bug (custom-trigger drops triggerRef) — spawned as a separate task chip for the
  design-system owner; STRATA uses StrataChipMenu (fixed-position pattern per AllProjectsTable precedent) meanwhile.
- @atlaskit/tabs direct import in StrataAdminConfigPage is pre-existing (no ads Tabs wrapper exists).
- Remaining evidence debt: empty/loading/error/responsive PNG variant sets per surface (core light+dark done).
- Deferred slices unchanged: upload wizard, Jira adapter, board packs, AI advisory service, es_* cleanup (DRIFT-003).

## Next exact actions (ordered)
1. **PROD migration apply (owner-gated, now urgent):** main serves prod Supabase by default and STRATA tables
   exist only on staging — prod users on /strata see handled query errors until the 7 strata_ migrations + flag
   are applied to prod (lmqwtldpfacrrlvdnmld) via the staging-first sign-off.
2. PR #322 (StrataChipMenu → ads DropdownMenu wrapper migration): needs light/dark anchoring screenshots on the
   4 chip surfaces or owner waiver, AND likely a rebase — main moved (3cf792749 touches shared.tsx).
3. Second-approver strata_role_assignments for SoD flows.
4. Evidence debt: empty/loading/error/responsive PNG variant sets per surface.
5. Follow-up slices per TRACEABILITY_MATRIX: upload wizard, Jira→ProjectCard adapter, board packs (PDF+PPTX),
   AI advisory service, es_* cleanup (DRIFT-003 — destructive, owner sign-off).

## RED FLAGS
None open. (The dropdown mis-anchoring regression found during verification was fixed at source in-session, not patched over.)
SESSION 004 (STRATA Functional Build Recovery) complete on branch
`feat/CAT-STRATA-RECOVERY-20260705` (base main @ f40089749). The
create → link → measure → trace → govern → snapshot loop is implemented and
**proven end-to-end on staging through product write paths** (rebuild proof
with two real users, SoD enforced, all negative tests rejecting correctly).
Controlling docs: STRATA Implementation Recovery Ledger + Functional
Implementation Spec (owner-supplied 2026-07-05); implementation map at
13_RECOVERY_IMPLEMENTATION_MAP.md; full narrative in sessions/004.

## What landed (4 commits)
- 7daaeed backend: migration 20260705190000 (51 write RPCs + needs-attention
  rule engine + KPI evidence chain + hardened promote + snapshot entity
  names + gate subject 'element') + domain/hooks wiring + StrataFormModal.
  Also applied+ledgered the previously-unapplied 20260705140000/140100.
- ef267cb authoring UI across all 11 STRATA surfaces (6 lanes).
- f737680 live-verified fixes: strata_is_admin checked non-existent product
  roles (→ public.is_admin, migration 20260706093000); useStrataRoles admin
  affordance; ads Modal isOpen missing at 7 call sites (modals silently never
  mounted — including the PRE-EXISTING lock/close/decision modals).
- b598c74 proof-caught fixes: promote_element array_append; project-card
  manual uniqueness (migration 20260706101000 — partial unique index).

## DB state (STAGING cyijbdeuehohvhnsywig ONLY — prod untouched)
Applied + ledger-recorded: 20260705140000, 20260705140100, 20260705190000,
20260706093000, 20260706101000, 20260706120000, 20260706130000 (es_* drops). Ledger rows match committed files 1:1.
Proof dataset (FY2027 Recovery Proof + "(proof)"-suffixed entities) remains
on staging as authored evidence; safe to delete by name filter.
Validator roles for khan.jahanara granted via strata_assign_role (audited).

## Gates
tsc -p tsconfig.app.json = 183 (baseline, 0 strata) · lint:colors:gate 0 =
baseline · audit:ads:gate = +6 INHERITED from main pre-branch (branch is net
−1; six remaining strata offenders are pre-existing untouched files) ·
banned-color grep on touched files = 0. Vitest still broken on Node 20 → CI.

## Known follow-ups
- PROD migration apply for ALL strata migrations remains a separate
  owner-approved step (staging-first per D-011; prod has none of this).
- Update-RPCs use COALESCE patch semantics → UI cannot clear a set field to
  NULL (owner/validator/description). Needs clear_* flags like
  strata_update_element if required.
- Persisted react-query cache (localStorage catalyst-rq-cache) can serve
  stale role/affordance results after grants — a cache-bust on role change
  would help.
- Benefit realization is time-aware (future periods → index 0, has_data
  false): correct, but worth a UI caption.
- needs-attention benefit rows drill to portfolio index (no per-benefit
  deep-link resolution); snapshot links go to reviews index.
- DONE in follow-up commits a1767ae/6fbb078 (owner items 5,7,8,9,10,11,12):
  Jira connector (strata_sync_jira, live-verified JIRA-SYNC-1000), AI advisory
  edge function strata-advisory (deployed ACTIVE; full run needs a logged-in
  user), board-pack entity names + provenance appendix, es_* decommission
  (migration 20260706130000 + 48 files deleted, DRIFT-003 closed), clear_*
  flags (migration 20260706120000) + UI, my-roles persist exclusion, benefit/
  snapshot deep links. Still deferred: ERP/BI connectors only.

## Next exact actions
1. Owner review/merge of the recovery branch PR.
2. Owner re-login on staging (session was killed by a Supabase 522 outage
   mid-verification) and click-through of the authoring flows (New cycle
   modal verified live pre-outage; rest verified via product-RPC proof).
3. Prod migration apply (owner-gated), then rerun rebuild proof on prod.

## Next prompt
`continue feature CAT-STRATA-20260705-001`
