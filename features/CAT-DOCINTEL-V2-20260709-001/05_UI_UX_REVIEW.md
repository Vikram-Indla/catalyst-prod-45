# UI/UX Review — CAT-DOCINTEL-V2-20260709-001

Not started — no UI changes made yet (Plan Lock DRAFT, pre-implementation).

Reference material from the discovery audit's live-probe UI findings:
`docs/audits/doc-intel-current-state-discovery.md` §5 (UI/UX). Key baseline facts to compare
against post-fix:

- Citation drawer today shows claim + quoted excerpt + page + block hash — functional, correct
  layout. Confidence *value* shown is the mis-scaled number under fix in Slice 1.
- No console errors specific to DocIntel observed at baseline (two pre-existing app-wide warnings
  unrelated to this feature: `@atlaskit/select` legacy-context warning, `component_config` missing
  table warning).
