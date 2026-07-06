# Decisions

| # | Date | Decision | Why |
|---|------|----------|-----|
| D-001 | 2026-07-03 | User consent "proceed" interpreted as: run full audit + prepare PR fix plans, no code changes, per-PR approval required before any fix lands | Conservative superset of consent options 1–3; all forbid code changes |
| D-002 | 2026-07-03 | Runtime browser probes (light/dark screenshots, heap snapshots) deferred — no confirmed test login for localhost:8080; catalyst-storybook/supabase MCP unauthorized | Static + tooling evidence is sufficient for issue universe; runtime pass listed as follow-up gap |
| D-003 | 2026-07-03 | Feature folder placed in-repo `features/` (matches CAT-SPRINTS-NATIVE-20260702-002 precedent) not `~/catalyst/features/` | Follow current repo practice |
| D-004 | 2026-07-03 | Mass patterns (e.g. 6,876 Tailwind color hits) logged as one schema issue per component/cluster + enumerated occurrence appendix | Keeps register reviewable while keeping totals evidence-backed |
| D-005 | 2026-07-03 | Descope API key rotation (CAT-AUDIT-1006) from the active PR sequence; reorder remaining PRs around functional bugs + code health, not security/compliance hygiene | User: "ignore API key rotation, focus more on functional and code health" — consistent with [[feedback-functionality-over-migrations]]. Finding stays logged in MASTER_AUDIT_REPORT §18/21 for whenever the user wants it, just not actioned now. |
| D-006 | 2026-07-03 | Further deprioritize PR 0 (CI/build repair), PR 11 (git hygiene), PR 12 (security) — move all three to the bottom of the sequence | User: "deprioritize 0,11,12". Since CI won't be green during PRs 1–9, validation for those PRs relies on manual gate commands (tsc/lint/build run directly, not via CI) and screenshot/DOM evidence per CLAUDE.md — logged as a caveat, not a blocker. |
