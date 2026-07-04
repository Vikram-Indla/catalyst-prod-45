# CAT-WORKFLOW-STUDIO-20260702-001 — Workflow Studio revamp

Read order: 01_OBJECTIVE.md → 03_PLAN_LOCK.md (approved 2026-07-02 via plan mode) → sessions/.

One-line: consolidate 3 fragmented workflow editors onto the canonical ph_wf_* versioned engine as a single full-width "Workflow Studio" (/admin/workflows), plus custom work item types, configurable hierarchy (≤10 levels), transition/guard editing, safe status CRUD, AI draft generation.

Key facts (verified live-DB 2026-07-02):
- Empty board root cause: cyij `ph_workflow_statuses` missing `archived_at` + silent error swallow. Prod fine (44 statuses BAU).
- Split-brain: editing UI writes legacy ph_workflow_*; runtime enforces ph_wf_* (Story/Epic blocking live on staging).
- ph_wf_versions.template_id = NOT NULL FK to legacy ph_workflow_templates (load-bearing, keep).
- ph_workflow_type_statuses + ph_workflow_transitions exist in DBs but NO migration creates them.

Council verdict: PROCEED WITH MODIFICATIONS. Sequence: P0 wiring fix → P1 engine write path → P2 Studio UI → P3 types+hierarchy → P4 AI → P5 entity unification → P6 hierarchy depth (last).
