# UI/UX Review — CAT-DOCINTEL-V2-20260709-001

Discovery review completed; no UI changes made yet (v2 Plan Lock DRAFT, pre-implementation).

Current-state verdict: the capability is substantial but the interface is backend-shaped. Library
rows obscure source identity; a document defaults to extracted page prose; seven equal tabs expose
entities rather than the review job; Ask and Deliverables lack guidance and continuity. Keep exact
citations user-facing. Move OCR/extraction/provider/queue/prompt telemetry to Admin only after
backend authorization is enforced.

See `13_DOCINTEL_UI_REVAMP_STUDY.md` for live screenshots, five-platform pattern comparison,
proposed screens and blind spots. See `14_ADVANCED_COUNCIL_UI_REVAMP.md` for the council verdict.

Reference material from the discovery audit's live-probe UI findings:
`docs/audits/doc-intel-current-state-discovery.md` §5 (UI/UX). Key baseline facts to compare
against post-fix:

- Citation drawer today shows claim + quoted excerpt + page + block hash — functional, correct
  layout. Confidence *value* shown is the mis-scaled number under fix in Slice 1.
- No console errors specific to DocIntel observed at baseline (two pre-existing app-wide warnings
  unrelated to this feature: `@atlaskit/select` legacy-context warning, `component_config` missing
  table warning).
