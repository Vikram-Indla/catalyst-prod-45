# CAT-STRATA-20260705-001 — Agent Outputs

> Consolidated outputs from the 10 parallel Phase 1 discovery agents (2026-07-05).
> Lane mapping to the contract's 7 mandatory agents: Canonical Component Discovery = Lane 3; Canonical Screen Discovery = Lanes 1+4; UI/UX Critic = Lane 4; Integration Architect = Lane 7; Data/Safety Guard = Lanes 2+10; Implementation Planner = consolidation (03_PLAN_LOCK + discovery report); QA/Screenshot Validator = Lane 9.
> One section per lane. Append — never delete.

---

## Lane 1 — Repo Agent (routes, shell, strategy residue)

### Routing architecture
- `src/App.tsx` (~210–293): 4-tier routes — auth (unprotected), redirects (OUTSIDE shell), hub roots, protected shell routes inside `<CatalystShell>` via FullAppRoutes.
- `src/routes/FullAppRoutes.tsx` (1092 lines): single source of truth for hub routes. Pattern: `<Route path="/hub/:key/*" element={<MG k="flag" t="Title"><S><Page/></S></MG>} />`. Modules do NOT self-register.
- `src/lib/routes.ts` (266 lines): slug-keyed URL builders; never string-concat URLs.
- `src/lib/hubs.ts` (71 lines): `HUBS[]` array — one entry adds a hub to the 9-dot switcher. Existing entry: `{ id: 'enterprise', label: 'Strategy Hub', path: '/strategyhub', tileColor: 'purple' }`.
- Module gating: outer `ModuleGate k="flag"` (feature_flags table) + inner `ModuleGuard moduleCode` (admin_role_module_permissions); MG_ROLE_KEY maps flag→role (`strategyhub → 'enterprise'`) at FullAppRoutes.tsx:375.
- **CRITICAL trap:** `<Navigate>` inside FullAppRoutes is swallowed (CatalystShell re-render loop). All redirects must live in App.tsx OUTSIDE the shell (precedents: ProducthubLegacyRedirect App.tsx:134–138).

### Strategy residue inventory
| Path | What | Routed? | Verdict candidate |
|---|---|---|---|
| src/types/strategy/index.ts | es_* types (OkrStatus, HealthCategory, StrategyLayer) | yes | REUSE as reference, not as STRATA schema |
| src/contexts/strategy/RoleContext.tsx | strategy_owner/contributor/viewer RBAC from es_strategy_roles | yes | REUSE pattern |
| src/modules-dormant/strategy/StrategyRoom.tsx | dormant Strategy Room page | yes @ /strategyhub | REPLACE |
| src/modules-dormant/strategy/StrategyComingSoon.tsx | stub | yes @ /strategyhub/* | DELETE |
| src/modules-dormant/strategyhub/StrategicThemesPage.tsx, GoalsKeyResultsPage.tsx | themes/OKR pages | yes | pattern reference only |
| src/components/strategy/** (room, intelligence, themes, widgets, shared) | dashboards, AI panel, viz widgets (ExecutionDials, OkrTree, StrategyPyramid, OkrHeatmap) | yes | selective REUSE (viz widgets), else replace |
| src/hooks/strategy/useStrategyData.ts, useStrategyMutations.ts, useStrategyRoomIntelligence.ts | es_* queries/mutations/AI | yes | pattern reference |
| src/modules/okr-v2/ (StrategyCockpit, OkrTree, analytics) | OKR hub | yes @ /enterprise/okr | pattern reference; scope question |
| portfolio | /portfolio/:portfolioKey/* separate hub | yes | UNRELATED to STRATA residue |
| benefit / kpi modules | none exist | — | build new |

### Shell/nav integration points
- HubSwitcher (src/components/layout/HubSwitcher.tsx) reads HUBS[]; CatalystHeader derives at runtime; HubLanding pattern for hub roots; NavigationContext for breadcrumbs.

### Risks
Shell redirect trap (test day 1); feature flag + MG_ROLE_KEY wiring; es_* naming collision with new STRATA schema; routeRegistry breadcrumb metadata.

---

## Lane 2 — Schema Agent (Supabase migrations, RLS, conventions)

- 1,165 migrations, naming `YYYYMMDDHHMM00_description.sql`; bootstrap dump `20260516120000_bootstrap_full_schema.sql` (887 tables).
- Conventions STRATA must follow: UUID PK `gen_random_uuid()`; `created_at/updated_at TIMESTAMPTZ DEFAULT now()` + update trigger; slug contract via `catalyst_slugify()` + `{table}_generate_slug()` BEFORE INSERT trigger, slug frozen on creation (20260701000006_slug_infrastructure.sql); `organization_id UUID` column scoping (no global FK); RLS enabled per table with `current_user_is_approved()` / ownership / org-join policies; COMMENT on tables.
- Existing strategy-adjacent tables: `es_initiatives`, `es_snapshots`, `es_strategy_roles`, `es_goal_initiatives`, `es_kr_initiatives` (active, referenced); `ph_initiatives` (Jira legacy); `epic_benefits`, `epic_scorecard_responses`, `strategy_missions/visions/values`, `snapshot_configurations`, `snapshot_strategy_links` (dormant/unreferenced).
- **Gaps:** no scorecard model/instance/line tables, no KPI targets/actuals, no value gates, no decision register, no upload-run tracking, no versioned-config manifest.
- Versioning precedents: `version INTEGER` + `{entity}_versions` snapshot JSONB (tm_test_case_versions); locked_version pinning (20260703100623_tm_cycle_scope_locked_version.sql); immutable snapshot denormalization (20260703100001_tm_step_results_immutable_snapshot.sql).
- Audit precedents: `work_item_changelogs` + SECURITY DEFINER triggers (20260703180000_sprint_membership_changelog.sql); `audit_action` enum; `activity_logs` with before/after JSONB.
- Risks: migration ledger drift (HIGH — known staging/prod drift), org-scoping inconsistency, slug race on concurrent insert, orphaned snapshots, RLS per-row function cost.

---

## Lane 5 — Governance/RBAC Agent

- RBAC core production-ready: `user_product_roles` + `product_roles` (+ legacy `user_roles`, `profiles.approval_status` gate); `admin_nav_modules` + `admin_role_module_permissions`; `admin_permission_audit` (20260129080048). Hooks: `useProductRoles()` (86 granular perms), `useUserRole()` (hierarchy admin=4…user=1).
- Approval precedent: `ph_release_approvers` / `ph_sprint_approvers` (pending|approved|rejected; first-person-only RLS hardening 20260703260000). No request→approve→apply engine, no sequential/quorum logic.
- Audit precedent: `activity_logs` (before/after JSONB) + `src/lib/auditLogger.ts`; trigger-based changelogs. No decision/action register anywhere.
- Immutability precedent: tm_step_results snapshot denormalization (reusable for config snapshots).
- **Hard gaps STRATA must build:** versioned config records with approval gates (draft|pending_approval|approved|rejected|superseded), snapshot immutability enforcement + supersede flow, segregation of duties (owner ≠ validator ≠ approver; no self-approval), approval workflow engine, decision + action register, config/audit admin surfaces.
- Risks: approval enforcement historically client-side (RLS closed it late); activity_logs unbounded; no rollback on rejected config.

---

## Lane 6 — Lineage Agent (uploads, staging, validation, runs)

- Run tracking precedents: `ph_sync_log` (Jira sync runs: counts, warnings, duration); `mock_runs`/`mock_run_files`/`mock_run_entity_map` (status machine draft→…→error, file retention incl. storage_path + extracted_text) at 20251227091608.
- Staging/validation precedents (built, NOT wired): `injira_import_jobs` (status, failed_items, error_log JSONB), `injira_import_manifests` (validation_errors, is_valid), `injira_import_diff_reports` (row-level diffs), `injira_import_mappings` (source↔canonical keys).
- Upload precedents: useStagedAttachments (chat-v2), ph_attachments + useUnifiedAttachments, BR attachments; `xlsx@0.18.5` present (export-only today via UWVExport.tsx). Buckets: chat-attachments, attachments.
- **Provenance gaps:** canonical rows lack source_run_id / raw-row linkage; no raw file retention per run; no staged→canonical transition wired; Jira sync upserts directly with no staging/quarantine; no point-in-time data snapshots.
- STRATA needs new: upload_runs (with file hash, row counts, status machine), raw row staging with row-level validation errors + quarantine, source_run_id on all canonical actuals, calculation provenance log, snapshot store. Reuse: mock_runs status machine, ph_sync_log counters, injira manifest pattern, staged-attachment upload flow.

---

## Lane 4 — Executive UX Agent (benchmarks, IA, anti-patterns)

- IA map: Project/Product/Release/Incident/Test hubs share pattern — breadcrumb nav + entity tab bar + canonical ProjectDashboardPage reused via `mode` prop; detail pages route-param based; drawers for config, modals for quick-create.
- **Benchmarks (strongest):**
  1. `src/pages/releasehub/CommandCenterPage.tsx` — gold-standard executive overview: 8 KPI stat cards w/ drilldown, health bars, pending approvals, ADS tokens + Atlaskit lozenges/avatars.
  2. `src/pages/project-hub/ProjectDashboardPage.tsx` — 12-col widget grid, edit mode w/ @atlaskit/pragmatic-drag-and-drop, widget registry with 5 executive scan-order sections.
  3. `src/pages/releasehub/ReleaseDetailPage.tsx` — rich detail shell: lifecycle tracker, 8 Atlaskit tabs, status/health lozenges.
- Anti-patterns: ComingSoon/placeholder pages (src/pages/enterprise/ComingSoon.tsx, modules-dormant), self-rolled kebab menu (CommandCenterPage:47–117, @atlaskit/popup bug workaround), CRUD-grade admin surfaces (AdminAccessPage), Tailwind/ADS dark-mode mixing, modal-first nav.
- UX risks: responsive debt (only 768px breakpoint; exec tablet use), dark-mode inconsistency, modal-vs-route undefined (STRATA rule: route-first, bookmarkable drilldowns), static widget registry won't scale to config-driven KPI widgets (STRATA needs DB-driven registry), dense-grid performance (lazy-load below fold), breadcrumb overload on mobile, admin config engine UX unpaved.

---

## Lane 3 — UI System Agent (canonical components)

**Approved for STRATA reuse (strong fit):** JiraTable (src/components/shared/JiraTable/JiraTable.tsx — TanStack columns, selection, sort, keyboard nav, resize/reorder, groups, sticky header, density, inline editor suite: StatusLozengeDropdown/AssigneeEditCell/DateEditCell/ParentEditCell/PriorityEditCell/SummaryInlineEdit); StatusLozenge + statusPalette.ts (LOCKED colors, change only there); DangerConfirmModal; EmptyState (src/components/ads/EmptyState.tsx, default+compact); PageContainer (standard 1280 / wide 1600 / full); CatyIconCTA + CatyPulseIcon (only sanctioned AI CTA); @atlaskit/pragmatic-drag-and-drop (canonical DnD via PragmaticBoard pattern).

**Available but unused deps (candidates, need ADS styling review):** @xyflow/react ^12.10.2 (node/edge canvas — strategy map candidate); react-resizable-panels ^2.1.9 (split panes). Present: recharts ^3.5.1, framer-motion, date-fns, @atlaskit/editor-core, BlockNote, Tiptap, full @atlaskit form suite (@atlaskit/tokens ^13.0.1).

**Moderate/weak:** CatalystDetailPanel/DrawerPanel/RightDetailsPanel (drawer patterns, surface-specific); DocumentComments (KB-specific); MetricCard (src/components/dashboard/MetricCard.tsx — dashboard-specific, needs ADS rewrite); SurfaceCard (uses non-ds tokens).

**Gaps (no canonical component — Phase 2 decisions needed):** executive KPI icon registry; node/edge strategy-map canvas; canonical timeline/Gantt (ProductDashboardTimeline is custom, not reusable); unified scorecard/KPI tile surface; split-pane wrapper; non-destructive confirm modal variant.

**Governance locks:** statusPalette 3-tier locked + tests; ADS ratchet gates; JiraTable structural column locks; keyboard a11y conventions (j/k, Esc, Enter).

## Lane 7 — Integration Architect (Jira pipeline abstraction)

- **Pipeline map:** inbound = jira-webhook-receiver (upserts ph_issues directly, queues sync_events, fire-and-forget jira-user-sync) + jira-ingest → jira-sync-projects → wh-jira-bulk-sync (delta sync ph_issues → ph_work_items via sync_hash). Outbound = src/lib/jira-writeback.ts → jira_write_back_queue → jira-write-back edge fn → Jira REST. Identity: jira_identity_map + jira_user_project_perms. Runs: ph_jira_sync_log, sync_events audit.
- **Coupling: TIGHT (7/10).** UI queries ph_issues directly in 20+ files (e.g. src/features/kanban-board/data/useKanbanData.ts:79) on Jira-native columns; status/type normalization duplicated between edge fns (wh-jira-bulk-sync normalizeStatus/normalizeType) and client (src/lib/jiraTypeNormalizer.ts); Jira REST paths + value lists hardcoded.
- **Reusable for STRATA:** sync_events (direction/origin_system/idempotency_key), sync_entity_map (catalyst↔external IDs), sync_status_map, sync_user_map (all 20260402164315); webhook receiver pattern + Svix HMAC verification (email-webhook:33–93); sync_cooldowns idempotency; delta-sync hash (post-normalization only). NOT reusable: hardcoded Jira REST paths, hardcoded type/status lists, env-detection logic.
- **Proposed seam (source-agnostic ProjectCard):** 3 layers — (1) connector-specific ingestion writing sync_events + config-driven field mappings (sync_field_mappings table with transformation rules JSON), (2) source-agnostic canonical store + entity map + per-source sync metadata (raw payload, hash, run id), (3) UI queries canonical STRATA tables only, zero Jira awareness. STRATA project cards should read a mapping table (source_system, source_key, confidence, mapping owner) exactly as blueprint §9 requires — the existing ph_* pipeline stays untouched; STRATA consumes it through the mapping layer, never adopts its schema.
- **Risks:** dual-source conflict precedence, Jira-only audit tables, secret sprawl (use one connection-secrets convention), field type mismatches (transformation rules as config), webhook ordering/idempotency.

## Lane 8 — Calculation Agent (formula/rollup/RAG centralization)

- **Current state is mixed:** server-side precedents exist — WSJF trigger functions (calculate_epic_wsjf/calculate_feature_wsjf in 20251211141446 dump), RPC aggregates (get_command_center_kpis, get_cc_team_performance at 20260211144932, calculate_objective_score) — but most health/progress logic computes CLIENT-SIDE in hooks (useBusinessRequestHealth.ts:92–94, useReleaseHealth.ts:71–72, useFeatureProgress.ts:78, DatePulseEngine/HealthStatusEngine in src/lib/date-pulse/).
- **Anti-patterns confirmed with evidence:** local score calc in hooks (drift risk), trigger formulas hardcoded without versioning, no audit trail on calculated fields.
- **Recommendation (evidence-based): RPC functions + versioned formula table.** `strata_calculation_versions` (component, formula_version, definition, active) + RPCs taking a formula_version param, returning score + RAG + confidence + calculated_at + formula_version atomically; calculation log table for provenance; optional materialized view layer if dashboard volume demands. Edge-function calc rejected (cold start, no batch); client-side calc banned. This matches the blueprint §20 requirement that calculation results store entity ref, period, value, score, status, formula version, inputs, source versions, run ID, confidence.
- statusPalette.ts is a lookup (rendering), not a calc — stays client-side.

## Lane 9 — QA Agent (test stack, gates, evidence)

- **Test stack:** vitest (312 unit tests, vitest.config.ts, jsdom + Atlaskit stubs in src/test/setup.ts — agent found it working; note memory says vitest broken on Node 20, re-verify at Phase 3 start); Playwright parity suite (playwright.config.ts, app :5173, 7 projects) + Playwright-ADS (playwright.ads.config.ts, Storybook :6006, visual pixel-diff 0.01 + axe-core WCAG 2.1 AA).
- **Blocking pre-commit gates:** `npm run lint:colors:gate`, `npm run lint:fallback-hex:gate`, `npm run audit:ads:gate`, `npm run lint:cre` (CRE chokepoint — create/link/parent surfaces must query @/lib/catalyst-rules). CI adds `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit` (baseline ~157–183 errors, continue-on-error), `npx vite build`, `npx vitest run --passWithNoTests`.
- **Evidence conventions:** 7-PNG mandatory set per UI feature (reference, implementation, dark mode via system reload, empty, loading, error, adjacent-regression) per docs/ways-of-working/CATALYST_UI_UX_ACCEPTANCE.md; functionality proven by Chrome MCP DOM probes / API / DB, never screenshots.
- **Risks:** ratchet gates block any NEW color/typography/spacing violations; CRE gate if STRATA adds create/link/parent surfaces; dark mode must be verified via system-level reload; Node engine >=20 <24 with legacy-peer-deps.

## Lane 10 — Security Agent (RLS posture, SoD)

**RLS posture: ~60% sound, 40% weak.** Good: sprint approval RLS hardening (20260703260000, self-only updates + DB-only status transitions), project-membership scoping (20260402164315), immutable snapshots (20260703100001), immutable initiative audit log (20260218204811 — gold standard INSERT-only with old/new values). Bad: `USING (true)` on tm_plan_approvals/scope/team/milestones (20260211183753:145–150) and transition_approvers (20251221165943:44–48); bare `auth.uid() IS NOT NULL` on kb links (20260704200200:58–91) and initiative budget items (20260218204811:409–418).

**Client-trust gaps (anti-patterns STRATA must not repeat):** FixCTCModal.tsx:194–197 client-updates resource_inventory.ctc directly; useBudgetScenarios.ts:150–169 client-inserts unvalidated scenario_data JSONB. Edge functions exist for sensitive ops (governance-config, jira-write-back, login-with-audit) but budget/approval paths bypass them.

**Segregation of duties: NOT enforced anywhere** — no approver ≠ submitter constraint exists in the codebase. STRATA must add it at trigger/RLS level.

**Secrets:** clean — anon key via headers, service role only in tests via env; no keys in src/.

**STRATA requirements derived:** org/ownership-scoped RLS on every table (never `USING(true)`); sensitive writes (actuals attestation, approvals, config changes, gate verdicts, snapshot locks) through SECURITY DEFINER RPCs / edge functions with server-side validation; approver ≠ submitter enforced in DB; immutable audit + snapshot patterns reused from tm_/initiative precedents.
