
## Execution progress (2026-07-05)
- Prototype removed; module unified.
- Root-cause fix: src/hooks/test-management/useTestHubProject.ts created (resolver, defaults to active project w/ most cases = Senaei BAU, switchable). Wiring the 7 operational surfaces delegated to Wave-1 scoping agent.
- AI ELEVATION: supabase/functions/ai-generate-test-artefacts/index.ts created — Claude claude-opus-4-8, structured outputs (json_schema), 3 modes (work_item/defect/incident) + prompt, server-side context assembly (ph_issues ACs + children + existing-case dedup; tm_defects; incidents), per-case test_type+rationale + coverage_area + covers[] traceability + coverage_map + gaps, reuses tm_ai_usage_log governance (quota 30/day, cooldown 8s). DEPLOY REQUIRED + set ANTHROPIC_API_KEY secret. Frontend rewiring (useAIGeneration→new fn, stop fabricating DEFAULT_TYPE_ID in TestCasesSection, defect/incident "Generate" buttons) = pending wave.
- Wave-1 agents running: (A) project scoping 7 pages + dashboard FK + my-work filter; (B) linkage L001 TestCoveragePanel on Story/Feature/Epic + L004 defect parent + L005 widen picker.
- Sprint decision locked: ph_jira_sprints canonical (backs project sprint_release field); iterations = empty SAFe, never wire.
