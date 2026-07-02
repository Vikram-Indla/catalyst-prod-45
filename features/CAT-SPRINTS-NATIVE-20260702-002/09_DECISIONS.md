# CAT-SPRINTS-NATIVE-20260702-002 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

### D-001 — Terminology: "Owner", never "Driver" (2026-07-02, JK)
Jira's create modal uses "Driver"; Catalyst uses **Owner** (aligns with existing `owner_user_id` on ph_releases). Jira DOM probes inform ADS structure/CSS/typography ONLY — vocabulary comes from JK's requirements and existing Catalyst schema. Applies to all fields, labels, docs in this feature.

### D-002 — Membership = sprint_id FK only (2026-07-02, council unanimous)
All work-item↔sprint reads/writes move to the `sprint_id` FK. JSONB `sprint_release` name-match and `sprint_name` text are read-legacy only during migration, then dead for sprints. Reason: auto-naming makes rename first-class; name-based links are silent data loss (710→2 row Jira-sync revert evidenced).

### D-003 — Auto-name format (2026-07-02)
`<KEY>-Sprint <M>.<W> - <DD Mon YY>`; M = start month, W = ceil(startDay/7), end date = start+4d (1w) / start+11d (2w), Sun→Thu. JK's sample corrected: Thursday end for a 04 Jan 26 start is 08 Jan 26 (07 Jan is a Wednesday). Name recomputes read-only in Auto mode; Custom mode frees it; uniqueness (project_id, name) + dedupe trigger; slug frozen.

### D-004 — DoD satisfaction → awaiting_approval, never auto-complete (2026-07-02, council)
Sprint auto-transitions active → awaiting_approval when all items reach their per-type DoD. Completion always requires approval policy satisfaction (or explicit confirm when zero approvers). Prevents silent sprint closure.

### D-005 — Status vocabulary replaces release vocabulary (2026-07-02)
planning / active / awaiting_approval / completed / canceled / archived. Migration maps in_progress→active, released→completed. Aligns with the dormant ph_wf Sprint SDLC catalog (its first read surface). "Unreleased"/"released" die on sprint surfaces.

### D-006 — Common-status injection split out (2026-07-02, council unanimous)
In QA/In UAT/In Beta/In Production across all work-item types is a separate Feature Work ID — statuses are hardcoded in ~6 TS files; global regression surface. Sprint DoD v1 reads each type's existing status catalog.

### D-007 — Analytics gated on three proofs (2026-07-02, Q4 renegotiation)
Time-in-status, efficiency, scope history, health ship only after: (1) changelog backfill validated for one project (partially met: 2,085 transition rows on staging), (2) native status changes write transition rows (FAILS today: 0 native rows → new required slice), (3) FK is sole membership read path. Until then: disabled UI with tooltip, zero-assumption.

### D-008 — Efficiency formula (2026-07-02)
`40%·completion + 25%·flow-efficiency + 20%·scope-stability + 15%·approval-timeliness`, all ratios → comparable across 1w/2w lengths. Not shown until D-007 gates pass.

### D-009 — 1W/2W indicator is a Lozenge, not a ribbon (2026-07-02)
Corner ribbons are not an ADS pattern. Length shows as an @atlaskit/lozenge next to the sprint name (list + detail) and in the create modal header area. (Pending A3 critic confirmation.)

### D-010 — Feature folder consolidation (2026-07-02)
Council verdict originally at features/CAT-SPRINTS-NATIVE-20260702-001/ merged into this folder as 13_COUNCIL_VERDICT.md; 001 folder removed. This feature's canonical ID is CAT-SPRINTS-NATIVE-20260702-002.
