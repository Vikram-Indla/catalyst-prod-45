# 02 — Design Widget Spec (Gate 2)

> Widget: [`filters-end-to-end-design-widget.html`](filters-end-to-end-design-widget.html) — self-contained, light+dark, Catalyst-native (ADS tokens via CSS vars, JiraTable chrome).
> **Scope decision (approved option #2):** only NEW/CHANGED surfaces are mocked. The directory list, builder, basic-filter bar, version history, template gallery, and the live results table already render in production and are NOT re-mocked — re-mocking working surfaces is theater.

## Surface map

| Surface | Purpose | Route | Existing components to reuse | New components required | Backend dependency | Permission rule | Risk |
|---|---|---|---|---|---|---|---|
| Directory row-click (CHG) | Open read-only detail, not builder | `/project-hub/:key/filters` | `FiltersListPage`, JiraTable | none — change `detailHref` target | `ph_saved_filters` SELECT RLS | viewers_config gates row visibility | Low (1-line route change) |
| Filter detail (CHG) | Source of truth for a saved filter | `/:key/filters/:filterId` | `FilterDetailPage` (live, 436 LOC), `FilterResultsPanel`, `FilterVersionHistory`, `FilterUsageSparkline` | editors/subscribers chips; action bar; derived-views section; activity feed | `ph_saved_filters`, `filter_derived_views`, `boards`, version table | owner/editor gates edit actions | Med — adds 3 sub-sections to a live page |
| Share / governance modal (CHG) | Set visibility + editors | modal on detail/builder | `@atlaskit/modal-dialog`, `@atlaskit/select` user picker, existing `TransferOwnershipModal` pattern | editors multi-select section | **RLS UPDATE must honor `editors_config` (G4)** | owner sets editors; editors set query | **High — security: design + RLS ship together** |
| Consolidated query arch (CHG) | One serialize/parse/execute path | n/a (lib) | `lib/jql/*`, `lib/jql-supabase` | `FilterQueryModel` adapter | none (pure TS) | n/a | High — touches saved-filter serialization; golden tests mandatory |
| Releases hub filters (NEW) | Filters for release hub | `/releases/filters` (+`/create`,`/:id`) | canonical trio (`hubType="release"`), `ReleasesHubSidebar` | nav item; `FilterHubType += 'release'` | `ph_issues` filtered to fixVersions; sentinel `projectKey='RELEASES'` | same scoped-visibility RLS | Low-Med — mounts existing trio |
| WhatsApp summary + fallback (NEW) | Copyable status update | kebab + detail action | `FilterKebabMenu` entry, `generate-whatsapp-summary` edge fn | deterministic client fallback builder | edge fn (AI) + `FilterSummaryContext` builder | filter must be visible to user | Med — must never hallucinate; fallback required |
| Universal states | empty/load/error/denied | all | existing empty/spinner patterns | none | n/a | denied uses RLS result | Low |
| Filter health | health lozenge states | directory + detail | health_status column | none | server-computed `health_status` | n/a | Low |

## Design constraints honored
- **Reuse-first**: zero new component libraries. Every new surface mounts the canonical trio / JiraTable / `@atlaskit/*`.
- **ADS tokens only**: widget uses `var(--ds-*)` with CLAUDE.md fallbacks; light + dark both themed.
- **No consumer animations**: no spinning/rainbow on non-AI controls. (WhatsApp/Caty are AI CTAs — eligible for the static-rainbow carve-out if a CTA is added, but the widget does not introduce one.)
- **Banned fields**: no MDT Ref / Story Points / Service Now# / Assessment Feature anywhere.
- **JiraTable canonical**: directory + results tables are JiraTable, never raw `<table>` in production.

## States covered (master prompt §3.2 checklist)
Directory ✅ · detail ✅ · builder (live, not re-mocked) ✅ · basic builder (live) ✅ · advanced JQL (live) ✅ · validation (live `jql-validate`) ✅ · preview results (live) ✅ · save modal (live) ✅ · share modal ✅ (new editors section) · kebab ✅ · kanban/roadmap/dashboard derivation (live, flag-gated) ✅ · WhatsApp ✅ + fallback · Caty AI (live `AskCatyInlineBar`) ✅ · empty/loading/error/denied ✅ · health states ✅ · responsive (canonical trio already responsive — see 2026-06-11 lesson) · dark+light ✅ · RTL: ADS tokens + flex layouts are direction-agnostic; no hardcoded left/right in new surfaces.
