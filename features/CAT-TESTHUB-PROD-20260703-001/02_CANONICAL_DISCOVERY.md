# 02 — Canonical Discovery (index + synthesis)

14 evidence-backed discovery reports live in `discovery/`. This file is the executive synthesis. Every claim below carries file:line evidence in the underlying report.

## The headline (read this first)

**TestHub is NOT a stub shell anymore — it is ~80% real, but it lies to users in specific, fixable places.** The routed `/testhub/*` module (21 routes) has verified Supabase reads and writes on repository, cycles, execution (including a working offline queue and attachment uploads), sets, and all 26 reports. The rot is concentrated in: fake-data fallbacks, silently swallowed errors, two orphaned/duplicated stacks per domain, missing FK integrity, and dark-mode/ADS debt.

## Report index

| # | Report | One-line verdict |
|---|---|---|
| 01 | `01_testhub_code_map.md` | 21 routes real; 8 pages are canonical adapters (good); 5 bespoke heavy pages; 4 banned raw tables; 1 broken row-click route; dead orphans (DefectsPage 468 LOC, testhub.css 46.6K unimported) |
| 02 | `02_hooks_data_layer.md` | 54 hooks; 40 silent `{data}` destructures in 16 files; stub no-op mutations feeding live pages; **useAssignmentTable returns 85 randomized fake rows on error**; query-key fragmentation with dead invalidations |
| 03 | `03_db_schema.md` | 6 schema families; tm_* canonical (55 typed tables, 110 RLS policies, ~65 RPCs); `tm_cycle_sets` used in UI but **no migration exists**; set-membership + audit-log split-brains; zero slug columns on tm_* |
| 04 | `04_linkage_model.md` | Requirement linking is **split-brain**: `tm_test_cases.linked_story_key` vs `tm_requirement_links.external_key` — two unsynced models; requirement_id has no FK; link entry is free-text, no ph_issues picker |
| 05 | `05_project_module_ui_patterns.md` | JiraTable (3,197 LOC) declares TestHub an intended consumer — full grouping/inline-edit/bulk feature set available; violations table lists every TestHub deviation |
| 06 | `06_reports_inventory.md` | 26/26 reports wired (CAT-REPORTS-HUB closed). REUSE ONLY — refactoring banned by Vikram |
| 07 | `07_lessons_past_mistakes.md` | 26 numbered lessons; TESTHUB_BUILD_HANDOVER.md itself caused a live bug and contradicts today's color law + DB targeting rules |
| 08 | `08_canonical_components.md` | 4 component tiers; shared/ = Tier-1; 36 @atlaskit wrappers in ads/; ~50 shadcn legacy files to avoid |
| 09 | `09_cre_permissions_routing.md` | CRE: TESTHUB owns QA Bug, Test Case, Test Cycle; lint:cre blocking in pre-commit; sets/filters routes violate slug contract |
| 10 | `10_stubs_drivers_audit.md` | Routed module substantially REAL — the "all stubs" fear is outdated; residual stubs cataloged with severity |
| 11 | `11_ads_dark_audit.md` | 0 bare hex (good) but 95 Tailwind color hits, shadow-token-as-color bug ×10, unreadable .th-badge pattern, 540-line hand-written dark override block, **lint:colors gate is blind to all of it** |
| 12 | `12_ai_gateway.md` | **Gemini test-gen already exists and works** (`ai-generate-story-test-cases`, gemini-2.5-flash, cache + sanitizer). Dead caty-* hook layer. No auth/quota on edge functions — credit-protection gap |
| 13 | `13_release_sprint_integration.md` | **Entire enterprise quality-gate stack (6 gate types, waivers, templates, readiness RPCs, hooks, UI) exists but is UNMOUNTED**; 19 orphaned release pages; test↔release FKs point at legacy `releases` table (wrong id-space) |
| 14 | `14_competitor_feature_baseline.md` | The yardstick: 16 domains, ~180 capabilities, HAVE/PARTIAL/MISSING rubric. Xray=coverage moat, TestRail=execution UX, Zephyr/qTest=versioning, AIO=defect flow |

## The ~10 root causes behind everything

1. **Trust failures**: fake fallback data (assignment table), silent `{data}` destructures ×40, stub mutations that no-op — UI lies instead of erroring.
2. **Split-brains**: two requirement-link models, two defect stacks, two cycle CRUD stacks, two set-membership tables, two audit-log tables, four release id-spaces.
3. **Missing referential integrity**: requirement_id no FK, defects↔issues no FK, tm_cycle_sets unmigrated, untyped tables queried `as any`.
4. **Immutable-execution gap**: runs reference live case rows — editing a case rewrites execution history (worst-in-class architectural risk vs all competitors).
5. **Canonical-component drift**: 4 raw tables, dynamic-table use, hand-rolled badges/colors where JiraTable/Lozenge exist.
6. **Dark-mode debt**: light-metaphor surfaces with zero `dark:` coverage + a 540-line manual override block masking root causes.
7. **Orphaned duplication**: dead pages/components/css still in tree, resurrectable by mistake (release pages, DefectsPage, testhub.css).
8. **Coverage engine absent**: manual coverage_status text instead of computed OK/NOK/NOT-RUN from execution results.
9. **No automation ingestion**: zero CI/JUnit import path — engineering-buyer credibility gate unmet.
10. **Ungoverned AI**: working Gemini pipeline with no auth, no quota, no usage ledger (dropped table), dead parallel AI surface.

## What we inherit for free (build on, don't rebuild)

- JiraTable full feature set; canonical adapters pattern (Dashboard/Board/MyWork/Defects/Filters/Timeline already reuse project surfaces).
- Working execution runner incl. offline localStorage queue + `testhub-attachments` storage bucket.
- 26 wired reports + AI insight cards pattern (CatyIconCTA, aggregates-only, graceful degradation).
- Unmounted quality-gate/readiness stack (schema+RPCs+hooks+UI) — lift, don't build.
- `ai-generate-story-test-cases` edge function (complete, sanitized, cached).
- ph_wf_* versioned workflow engine for status configuration.
- tm_* RLS everywhere + `tm_next_entity_key` RPC for race-safe keys (defects still bypass it — fix).
