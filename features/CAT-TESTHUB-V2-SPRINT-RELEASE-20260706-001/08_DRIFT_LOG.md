# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Drift Log

> All drift events, rebaseline decisions, superseded Plan Locks.
> Append — never delete.

---

## Drift entries

### DRIFT-001 (2026-07-06, Phase B) — migration versions rebased
Plan Lock named versions 2026070614xxxx–15xxxx; cyij ledger already carried 20260706140000/150000 from concurrent sessions (files not on main). All B-slice versions rebased to 20260706170000–181000. No scope change. Plan Lock version strings are now indicative, not literal.

### DRIFT-002 (2026-07-06, Phase B) — discovery corrections from live DB
- tm_test_cases/cycles/plans.release_id → **ph_releases** (not `releases`); D-001 bridge unaffected (uses rh_release_test_cycle_links), but Phase E/G release pickers must read ph_releases for tm FKs and rh_releases for readiness.
- tm_defect_links.test_run_id correctly FKs tm_test_runs on live DB; B6 "repair" became a cycle_scope_id denormalization instead.
- Live scope-add trigger fn = tm_cycle_scope_populate_locked_version (bootstrap fn_lock_scope_version unattached).
- Bucket tm-attachments missing on cyij → CycleDetailPage execution-time uploads broken today (pre-existing); D-006 code fix covers it.

### DRIFT-003 (2026-07-06, Phase B) — B1 types regen blocked
Supabase CLI access token stale (Unauthorized); MCP regen unusable (2MB payload). Workaround: typedQuery in new hooks (repo precedent). ACTION FOR VIKRAM: run `supabase login`, then `npx supabase gen types typescript --project-id cyijbdeuehohvhnsywig > src/integrations/supabase/types.ts` at a lane boundary.

### DRIFT-006 (2026-07-06) — ai-tm-assist deploy blocked by function cap
`mcp__supabase__deploy_edge_function` returned `PaymentRequiredException: Max number of functions reached for project`. cyij is at its edge-function ceiling (~100+ fns; ai-generate-test-artefacts IS already deployed v2). Code is committed + correct. ACTION FOR VIKRAM: raise the function cap (upgrade/disable spend cap) OR delete a stale fn, then re-deploy ai-tm-assist (MCP deploy_edge_function with inline content, verify_jwt=true). Also still needs ANTHROPIC_API_KEY set on cyij for both this fn and the generator to run. D6 UI is built against the contract and degrades gracefully (config_error surfaced) until deploy lands.

### DRIFT-005 (2026-07-06) — screenshot evidence blocked on auth
Worktree dev server runs on :8081 (origin session owns :8080). App redirects to /auth; no authenticated session exists for :8081 and credential entry is prohibited for the agent. ACTION FOR VIKRAM: open http://localhost:8081, sign in once; screenshots then captured per 10_SCREENSHOT_CHECKLIST.md. (Alternative: after merge to main, capture on :8080 where a session exists.)

### DRIFT-004 (2026-07-06) — isolation move
Concurrent Release Ops session committed Phase 4 to origin checkout mid-activation. This session moved to worktree `.claude/worktrees/testhub-v2` (branch worktree-testhub-v2) per CLAUDE.md concurrent-session rules. Landing to main = detached-worktree cherry-pick or merge once phases stabilize.
