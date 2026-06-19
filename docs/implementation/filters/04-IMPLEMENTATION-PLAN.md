# 04 — Implementation Plan (Gate 4)

> Sequenced so Catalyst stays green at every commit. TDD per CLAUDE.md (failing test first). One logical change per commit. Stage explicit paths only (never `git add -A`). Project Hub first, then canonicalize.
> **Nothing here is executed yet — this is the plan. Implementation needs a separate `proceed`.**

## Phase A — Safety, flags, test baseline
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| A1 Confirm test runner green pre-change | — | `npx vitest run` baseline | Low | record pass count |
| A2 Audit current filter tests | `src/**/__tests__`, `lib/filters/__tests__` | inventory existing coverage | Low | list |
| A3 Delete orphan hook | `src/hooks/useSavedFilters.ts` (0 importers), `src/modules/tasks/hooks/useSavedFilters.ts` (stub) | remove dead code (G6/G11) | Low | grep proves 0 importers; build passes |
| A4 ADS audit baseline on filter files | `design-governance/cli` | record current violations | Low | audit exit code |

## Phase B — Data model & backend / RLS reconciliation
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| B1 Add `ph_saved_filter_can_edit(filter_id, uid)` SECURITY DEFINER fn — qualified params (2026-06-10 lesson) | new migration | helper fn: owner OR user_id OR `editors_config->'user_ids' ? uid` | Med | direct SQL: editor uid → true, stranger → false |
| B2 Rewrite `ph_saved_filters_update` USING to `user_id OR owner_id OR can_edit` (G4) | same migration | editors can write query/name/desc/visibility | **P0** | **2-user RLS isolation test** (editor saves OK, stranger 403) |
| B3 Add 4 indexes (G5): `owner_id`, `product_key`, GIN `starred_by_user_ids`, GIN `viewers_config` | migration | non-destructive `CREATE INDEX` | Low | EXPLAIN shows index use on directory query |
| B4 Apply via `apply_migration` MCP | — | deploy to `lmqwtldpfacrrlvdnmld` | Med | re-probe pg_policies / pg_indexes |

## Phase C — JQL engine consolidation (G2)
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| C1 Golden-output tests for all 3 forward serializers + 3 parsers (snapshot current output FIRST) | new `__tests__` | pins current byte-output before refactor | Low | snapshots committed |
| C2 Delete 2 local `jqlToFilterState` dupes; point preview pages at lib | `FilterPreviewPage.tsx:280`, `ProductFilterPreviewPage.tsx:305` | -2 forks; single parser | Med | golden tests stay green |
| C3 Introduce `FilterQueryModel` adapter; route Basic/Advanced/Caty/Templates through it | new `lib/filters/queryModel.ts` | one serialize + one parse path | High | golden tests + new model round-trip tests |
| C4 Collapse 3 forward serializers behind adapter (keep byte-identical for canonical builder) | `lib/filters/*`, `AllWorkToolbar.tsx` | single serialize | High | saved-filter re-serialize diff = 0 |

## Phase D — Directory refactor (G1)
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| D1 `detailHref` → `/:key/filters/:filterId`; add `editHref` for kebab | `FiltersListPage.tsx` | row click → detail, Edit → builder | Low | route assertion test per hub |
| D2 Directory columns: health, linked-views, star-count, last-used (already mostly present — verify) | `FiltersListPage.tsx` | column parity w/ widget | Low | render test |

## Phase E — Builder & preview (G3 wiring + dirty-state)
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| E1 Real `useLinkedEntities(filterId)` hook (boards + derived views) | new `src/hooks/workhub/useLinkedEntities.ts` | replaces both stubs | Low | hook returns real rows test |
| E2 Wire both preview pages to the hook | `FilterPreviewPage.tsx`, `ProductFilterPreviewPage.tsx` | linked-entities UI populated | Low | render test |
| E3 Unsaved-changes guard verify | preview pages | confirm dirty-state present | Low | dirty test |

## Phase F — Filter detail as source of truth (G10)
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| F1 Add editors + subscribers chips | `FilterDetailPage.tsx` | reuse existing config fields | Low | render |
| F2 Add full action bar (star/subscribe/copy/share/transfer/whatsapp) reusing existing hooks | `FilterDetailPage.tsx` | actions on detail, not just kebab | Med | action-fires test |
| F3 Add derived-views traceability section (reuse `useLinkedEntities`) | `FilterDetailPage.tsx` | kanban+roadmap+dashboard links | Low | render |
| F4 Add activity feed (if activity table exists — else defer) | `FilterDetailPage.tsx` | reuse existing activity pattern | Med | **verify activity source first** |

## Phase G — Derived Kanban/Roadmap/Dashboard wiring (G7)
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| G1 Verify create-from-filter idempotency (existing-view detection) | `FilterKebabMenu.tsx`, `useCreateKanbanFromFilter` | "open existing" vs "create new" | Med | duplicate-prevention test |
| G2 Flip project-hub flags after parity verified | `featureFlags.ts` (env) | enable on project hub | Low | manual verify |
| G3 Edit-impact notification to derived-view owners | new logic | notify on JQL change | Med | notification test (if notif system present) |

## Phase H — WhatsApp + Caty (G9)
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| H1 `buildDeterministicSummary(ctx)` pure fn | new `lib/filters/whatsappFallback.ts` | template summary from counts | Low | unit test — no AI, stable output |
| H2 Fallback wiring: AI fail / flag off → deterministic + banner | WhatsApp UI component | graceful degrade | Low | mock AI-down test |
| H3 Caty JQL gen: preview-before-save + validation (verify existing `AskCatyInlineBar`) | `AskCatyInlineBar.tsx` | confirm no auto-execute | Low | verify guardrails |

## Phase I — Notifications, activity, audit
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| I1 Confirm activity/notification system exists for filters; if not, scope separately + ASK | grep | decision | Low | — |
| I2 Filter lifecycle events (created/renamed/query-changed/shared/owner-changed) IF a pattern exists | existing activity hooks | reuse, don't invent | Med | event-fires test |

## Phase J — i18n, RTL, a11y, responsive
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| J1 New strings via existing i18n hook (no hardcoded labels in new surfaces) | new code | i18n keys | Low | grep no literals |
| J2 Keyboard + ARIA on share modal / action bar (`@atlaskit/*` gives most) | new surfaces | a11y | Low | axe / manual |
| J3 RTL spot-check new surfaces | new code | direction-agnostic | Low | manual |

## Phase K — Production readiness
| Task | Files | Expected change | Risk | Test |
|---|---|---|---|---|
| K1 `npx tsc --noEmit` | — | typecheck clean | Low | exit 0 |
| K2 `npx vitest run` | — | all tests green | Low | exit 0 |
| K3 ADS audit on touched files | `design-governance/cli` | 0 new violations | Low | exit 0 |
| K4 Manual critical-flow verify (CRUD + derive + share + whatsapp) | live :8080 | functional proof (DOM/DB probes, NOT screenshots) | Med | checklist |
| K5 Update `07-IMPLEMENTATION-REPORT.md` + ledger | docs | final report | Low | — |

## Sequencing rationale
- **B before C/F**: the editor RLS fix (G4 P0) and indexes are foundational; UI that lets editors save must have backend enforcement first or it 403s.
- **C before D/E/F**: consolidating JQL first means the directory/detail/builder all read one query model — avoids re-touching them after.
- **Golden tests (C1) before any serializer change**: saved filters must not silently re-serialize differently (saved JQL is persisted; drift = wrong results for existing filters).
- **G8 Releases last among features**: it's pure reuse of the now-consolidated trio; doing it after C/D/F means it inherits all fixes for free.
- **ASK-gates**: G6 (SearchPage), G11 (drop table), G12 (tighten fn), Phase F4/I (activity system existence) — do not proceed on these without explicit Vikram confirmation.
