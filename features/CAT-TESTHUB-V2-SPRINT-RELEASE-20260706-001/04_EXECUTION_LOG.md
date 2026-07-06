# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

### 2026-07-06 — Phase B complete (commit cbac0de47 on worktree-testhub-v2)

**Environment:** isolated worktree `.claude/worktrees/testhub-v2` (concurrent Release Ops session active on origin checkout — isolation per CLAUDE.md). DB = cyij (verified per batch).

**Landmines hit + resolved:**
1. Migration version collision — cyij ledger already had 20260706140000 (docex) + 20260706150000 (kb) from other sessions with files not yet on main. Rebased all B versions to 20260706170000+.
2. Live-DB vs bootstrap-file divergences: tm_* release FKs target **ph_releases** (not `releases`); tm_defect_links.test_run_id correctly FKs tm_test_runs (bootstrap "misnamed FK" claim stale); live scope-add trigger is tm_cycle_scope_populate_locked_version (fn_lock_scope_version unattached).
3. Bucket 'tm-attachments' does not exist on cyij — CycleDetailPage execution uploads target it (live defect; code fix queued Phase E/F).
4. B1 types.ts regen BLOCKED: Supabase CLI token stale (Unauthorized), MCP regen output too large for context. New hooks use typedQuery. **Needs Vikram: `supabase login` refresh, then regen at a lane boundary.**

**Applied + verified on cyij (ledger 1:1 with committed files):**
- 20260706170000 folder system (idempotency probe: 6 rows stable on re-run)
- 20260706171000 origin + enforcement (probes: draft scope-add rejected, version UPDATE rejected; origin backfill 16 ai / 89 manual)
- 20260706172000 execution/cycle split (backfill 4/4 cycles linked, EX- keys assigned; synthetic closed-cycle probe: guard_fired=t)
- 20260706173000 variance + sprint health + locked_snapshot (probe: snapshot populated with title/steps)
- 20260706174000 hold verdict + defect lineage (hold in enum; backfill 1/1)
- 20260706175000 evidence consolidation (entity index + D-006 comment)
- 20260706180000 release gate bridge (live probe on real rh_release: gate=warn "no test scope linked" + 4 checks upserted)
- 20260706181000 case table view + pull-latest + sprint health RPCs (view returns 13 cols with honest nulls; sprint RPC computes + snapshots)

**Code:** useTestExecutions / useCaseVariance / useSprintTestHealth hooks + barrel exports. tsc = 183 errors (exact baseline). All pre-commit gates green (lint:colors:testhub 0/68 files).

### 2026-07-06 — Phases C/D/E/F/G first waves (9 commits on worktree-testhub-v2)

| Commit | Slices | Content |
|---|---|---|
| cbac0de47 | B2–B9 | data foundation (8 migrations + 3 hooks) |
| 592d98152 | C1/C2/C6a | repositoryCase route + TestCaseDetailPage fullPageMode + ?case= repair + 13-col table + key-cell→full page |
| a560e051c | C3 | tm_move_folder RPC + folder DnD + system locks |
| (g1g3) | G1/G3 | SprintTestHealthSection + tm_compute_ph_release_gate + ReleaseTestReadinessSection (kind-gated) |
| 8f633ea59 | E5/E6 | 480px drawer→canonical modal (ban cleared), CSV RFC-4180, cycles full-width + delete confirm |
| (e1e2) | E1/E2 | TestPlanDetailPage NEW (lock/live, add/remove refs, folder column) + plans list clickable + error states + 20260706184000 is_locked |
| (e3e4) | E3/E4 | ExecutionsPage + ExecutionDetailPage (scope picker, attach cycles, complete action) |
| (f5e7) | F5/E7 | variance banner + explicit pull-latest in CycleDetailPage; Sets deleted → /testhub/plans redirects (D-004) |
| (d2) | D2 | step editor uplift (96px rows, chevron icons, copy via tm_clone_step, Cmd+Enter add) |
| (g5) | G5 w1 | TestCasesSection requirementType prop + mounted on Epic + Feature |

All commits: pre-commit gates green, tsc pinned 183, lint:colors:testhub 0 violations.

**Migrations on cyij (ledger 1:1):** 20260706170000, 171000, 172000, 173000, 174000, 175000, 180000, 181000, 182000, 183000, 184000 — eleven total.

**Blocked (needs Vikram):** types.ts regen (`supabase login`); screenshot evidence pass (sign in once at http://localhost:8081 — worktree dev server; :8080 owned by other session); merge-to-main call.

**Remaining slices:** F1–F4 run player (verdicts incl. hold, timer, force-pass, per-step evidence, defect prelink), D4 attachments repoint (tm-attachments bucket missing = live bug), D6/G6 AI CTAs, G5 wave 2 (BR/Defect/Incident hosts), H1–H4 ai-tm-* edge fns (need ANTHROPIC_API_KEY), H5–H7 traceability views, I1–I7 reports + RTL sweep + gate-path extension + evidence pack.
