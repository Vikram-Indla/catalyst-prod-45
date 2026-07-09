# S3 Session Log — Seed Implementation

**Date**: 2026-07-09 | **Status**: ✅ READY FOR STAGING | **Work**: Scoring models, workflow lifecycle, guards, notifications, admin roles

---

## What Got Done

### 1. **Scoring Models** (idn_scoring_models + idn_scoring_drivers)

Seeded three models (D4 / D5):
- **Default (v1)** — Value (0.6, higher) × Effort (0.4, lower) — **ACTIVE** (status='approved')
- **RICE (v1)** — Reach(0.25) × Impact(0.25) × Confidence(0.25) × Effort(0.25) — **DRAFT**
- **WSJF (v1)** — UserValue(0.3) × BusinessValue(0.3) × TimeCriticality(0.2) × Effort(0.2) — **DRAFT**

All bilingual (label_en + label_ar) per D7 roadmap.

### 2. **Ideation Workflow** (ph_wf_versions + statuses + transitions)

Registered **ideation** as a new entity_key in the default canonical scheme:

**States** (10):
- draft (initial) → submitted → screening → evaluation
- ⟶ approved, declined, parked, merged (decisions)
- ⟶ converted → delivered (terminal)

**Transitions** (12):
- Draft → Submitted (intake)
- Submitted → Screening (triage)
- Screening → Evaluation (evaluation)
- Evaluation → Approved/Declined/Parked (decision)
- Approved → Converted → Delivered (success path)
- Declined/Parked → Evaluation (reopen, audited)
- Screening → Submitted (backward, for pre-triage info)

Terminal states per 03 §4: Converted, Merged, Delivered (RLS-enforced read-only).

### 3. **Workflow Roles + Guards** (ph_wf_transition_roles + ph_wf_transition_guards)

**Roles per transition**:
- Submitter: draft → submitted
- Reviewer: submitted → screening, screening → evaluation, evaluation → declined/parked, screening → merged
- Approver: evaluation → approved, approved → converted, reopens declined/parked
- System: converted → delivered (auto)

**Guards** (advisory, not blocking):
- `strategy_link_present` — idn_ideas.strategy_element_id required at Approve
- `scores_complete` — all active model drivers scored at Approve
- `duplicate_review_complete` — duplicate suggestions reviewed at Approve
- `reason_required` — decline/park/merge/reopen require reason_text

Extended ph_wf_transition_guards CHECK constraint in migration to allow new guard types.

### 4. **Guard Evidence Registry** (src/lib/workflow/canonical/runtime.ts)

Added three entries:
```typescript
strategy_link_present:       { evidence: 'real',    blockingSafe: true,  note: 'idn_ideas.strategy_element_id IS NOT NULL' },
scores_complete:             { evidence: 'real',    blockingSafe: true,  note: 'all active scoring model drivers have ≥1 score' },
duplicate_review_complete:   { evidence: 'real',    blockingSafe: true,  note: 'duplicate suggestion status <> proposed' },
```

### 5. **Notification Triggers** (notification_trigger_config)

Seeded 11 IdeationHub events per 03 §8 with quiet defaults (P3/P4 in-app only per 04 §I.8):

| Event | Priority | Recipients | Channels |
|---|---|---|---|
| idea_submitted | P2 | triage_queue_owners | in_app |
| idea_triage_assigned | P2 | assigned_triage_owner | in_app |
| idea_status_changed | P3 | submitter, watchers | in_app |
| idea_comment_added | P2 | mentioned_users, submitter, watchers | in_app |
| idea_mentioned | P2 | mentioned_users | in_app |
| idea_vote_milestone | P4 | submitter | in_app |
| idea_decision | P2 | submitter, watchers | in_app |
| idea_merged | P2 | submitter, target_submitter | in_app |
| idea_converted | P2 | submitter, voters, watchers | in_app |
| idea_delivered | P2 | submitter, voters | in_app |
| idea_ai_suggestions_ready | P4 | triage_owner | in_app |

### 6. **Admin Role Defaults** (admin_role_module_permissions)

Registered **ideation** module with role matrix per D8:

| Role | can_create | can_edit | can_delete | can_publish | can_manage_access | Use Case |
|---|---|---|---|---|---|---|
| superadmin | ✓ | ✓ | ✓ | ✓ | ✓ | Full control |
| admin | ✓ | ✓ | — | — | — | Config only |
| reviewer | — | ✓ | — | — | — | Triage, score, decline/park |
| approver | — | ✓ | — | ✓ | — | Approve, convert, reopen |
| user | — | — | — | — | — | Submit, vote, comment |

---

## Migration File

**20260709160000_idn_seeds_phase1.sql** — idempotent, no destructive ops.

Includes:
- Constraint update (ph_wf_transition_guards guard_type CHECK)
- Scoring model seed (3 models, 10 drivers)
- Workflow definition (ideation entity, states, transitions, roles, guards)
- Notification trigger seed (11 events)
- Admin role defaults (5 role levels)

**All guarded with ON CONFLICT DO NOTHING** — safe to re-run.

---

## What's NOT in S3 (S4–S5)

- Module flag + feature toggle (VITE_ENABLE_IDEATION)
- ModuleGuard wiring (src/hooks/useModuleAccess.ts)
- Shell navigation (sidebar config, HubSwitcher, CatalystShell routes)
- Legacy route decommission (FullAppRoutes.tsx)
- Module scaffold (src/modules/ideation/)
- UI empty states (Phase 2 scope)

---

## Commits (to follow)

1. **S3 migration + guard registry** — single commit, exact files:
   - supabase/migrations/20260709160000_idn_seeds_phase1.sql
   - src/lib/workflow/canonical/runtime.ts (guards added to GUARD_EVIDENCE_REGISTRY)

---

## Next: S4–S5 (Staging readiness)

Requires:
1. Apply migration to staging (cyijbdeuehohvhnsywig) via Supabase MCP
2. Verify seed idempotence: re-run, check no errors
3. Verify scoring models live in DB (query idn_scoring_models)
4. Verify workflow states registered (query ph_wf_versions where entity_key='ideation')
5. Verify guards in registry (grep GUARD_EVIDENCE_REGISTRY runtime.ts)
6. **Then** branch to S4 (module registration + flag + ModuleGuard wiring)

---

## Cautions for Next Session

- ⚠️ **Ledger discipline**: After migration applies, manually verify supabase_migrations.schema_migrations has a row for 20260709160000 with timestamp
- ⚠️ **Test table creation**: If any ph_wf_* migration failed on staging, some tables may not exist; check foundation migration success first
- ⚠️ **ph_workflow_templates**: Workflow seed uses ph_workflow_templates FK; verify that table exists on staging (it should from the foundation migration)
- ⚠️ **RLS on idn_user_roles**: S4 will need to set up idn_user_roles table; S3 assumes it exists (created in S1)

---

## Validation Script (Post-Apply)

```sql
-- Verify scoring models
SELECT slug, status FROM idn_scoring_models ORDER BY slug;
-- Expected: 3 rows (default-v1 APPROVED, others DRAFT)

-- Verify workflow
SELECT entity_key, version_no, lifecycle FROM ph_wf_versions WHERE entity_key='ideation';
-- Expected: ideation, 1, published

-- Verify guards are in registry (TypeScript check)
grep -c "strategy_link_present" src/lib/workflow/canonical/runtime.ts
-- Expected: 1 match
```

---

**Status**: S3 code-ready. Awaiting staging migration apply + validation before proceeding to S4.
