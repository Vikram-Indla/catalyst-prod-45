# Decisions — CAT-STRATA-ADS-UPLIFT-20260706-001

- **DEC-1**: Fix breadcrumb clip inside StrataPageShell (drop negative-margin
  overhang) rather than touching ProjectPageHeader or the HubSurface clip
  wrapper — those are shared by 5 other hubs (regression ban).
- **DEC-2**: Detail pages use "crumbs end at parent + H2 = entity name"
  (Jira issue-view pattern) instead of duplicating the entity name as both
  terminal crumb and H2.
- **DEC-3**: Prefer fit-without-scroll for STRATA tables (rebalanced column
  units, fixed name column) over enabling h-scroll; scoped overflow-x:auto kept
  as a safety net for narrow viewports.
- **DEC-4**: Needs-attention lozenges get an explicit short-label map; severity
  continues to drive lozenge appearance (critical=removed, warning=moved).
- **DEC-5**: Strategy Map MiniMap removed rather than restyled — blank with
  custom node types and worthless at <10 nodes.
- **DEC-6**: No new dependencies (no @atlaskit/progress-tracker); hand-rolled
  token-pure pipeline stepper stays.
