# CAT-WF-GAPCLOSURE-20260629-001 — Objective

## Goal

Close 7 known gaps in the Versioned Canonical Workflow module.

## Success criteria

1. Role audit: ph_wf_audit shows resolved_roles + required_roles + role_decision for every gated transition
2. Guard safety: runtime never hard-blocks from guards with no evidence source; admin warns visually
3. Canonical labels: Product Milestone MilestoneCard uses canonical labels (Incident/Sub-task already covered via CatalystStatusPill)
4. Reason modal: At least Defect list surfaces ReasonCaptureModal instead of error toast when reason is required
5. Admin writes: enforcement toggle + reason code toggle + version clone all operational with ph_wf_admin_audit writes
6. Field requirements: at least 1 real field requirement evaluated in gateTransition; audit records missing fields
7. Live audit: Feature gains audit rows via real status transitions; Incident + PM audit confirmed via staging test data

## Anti-goals

- Do not expand to new entities
- Do not enable blocking enforcement (toggle added but stays off)
- Do not touch production
- Do not fake audit rows via SQL
