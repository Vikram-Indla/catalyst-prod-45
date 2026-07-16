# 03 — PLAN LOCK · CAT-STRATA-IMPL-20260712-001 · Phase 5 (configuration & system states)

> STATUS: **PROPOSED — awaiting Vikram approval. NO CODE until approved.** (Phase-4 auto-commit authorization does NOT
> carry into Phase 5.) Slice order: 5A(03) → 5B(04) → 5C(05) → 5D(25) → 5E(26) → 5F(27) → 5G(28).
> Scope: STRATA design-pack **Phase 5** per HANDOFF build-order "configuration & system states": anchors
> **03 · 04 · 05 · 25 · 26 · 27 · 28**. Grounded in: HANDOFF.md build-order (re-read in full, session 022, anchor set
> confirmed — NO drift vs D-12/CLAUDE.md); anchors 03·04·27 read IN FULL via DesignSync (digest `discovery/08_phase5_
> anchor_specs.md`); admin-infra discovery agent (StrataAdminConfigPage + configApi + governed lifecycle + system states);
> staging schema probe (governed-object envelope). 05·25·26·28 re-read IN FULL at each slice start (drift protocol).

## Objective
Reorganize the STRATA governed **control plane** to its anchors — the flat 2,600-line 12-tab `StrataAdminConfigPage`
becomes a **consequence-domain landing** (03) fanning out to domain pages (Measurement 04/05/25, Data 26, Access 27) that
present config as **governed objects** (version · lifecycle · effective-dating · usage · mandatory impact preview ·
submit-for-approval with server-enforced SoD), plus canonical **system-state** surfaces (28). Reuse canonical components +
`--ds-*` tokens only, **honestly scoped to the RPCs that exist** (only perspectives has authoring writes today), leaving
`StrataStrategyMapPage.tsx` byte-for-byte unchanged. NO migration this phase.

## Surfaces (confirmed by discovery)
| Anchor | Route | Today | Nature |
|---|---|---|---|
| 03 Config Landing | `/strata/admin` (bare) | flat 12-tab page (falls to tab 0) | add a LANDING branch (domain cards + approval band + change log) |
| 04 Taxonomy | `/strata/admin/measurement` | `perspectives`/`value-taxonomy` tabs | domain page w/ section-nav; perspectives editor (authoring EXISTS) |
| 05 Model Builder | measurement domain | `scorecard-models` tab (weights only) | weights editor + integrity + preview; **model draft-create DEFERRED (no RPC)** |
| 25 Threshold Schemes | measurement domain | `thresholds` tab (display-only) | display + version-compare + lifecycle; **band editor DEFERRED (no RPC)** |
| 26 Data & Integration | `/strata/admin/data` | `upload-templates` tab; **sources have NO admin surface** | registry (read) + template contracts (read); **retire-safety FLAG** |
| 27 Roles & Access | `/strata/admin/access` | `roles` tab (assignments + catalog) | assignments+SoD lozenges+rail+assign/revoke (EXIST) + **View-as (net-new client)** |
| 28 System States | wildcard `*`, per-page | inline `StrataNotFound`; ad-hoc restricted EmptyState; no notif landing | extract canonical shared not-found/restricted + notification landing |

## PROPOSED DECISIONS (need Vikram ruling — recommendation first)
- **P5-D0 · Config landing = ADD a landing branch to the bare `/strata/admin` route** (currently silently renders tab 0).
  Landing = approval band + 6 consequence-domain cards + recent-changes JiraTable (readers exist: `changeRequests`,
  `auditEvents`). Domain cards link to the domain pages (measurement/data/access as they're built) or the existing
  `:section` tabs (transitional) for domains not yet migrated. The 12-tab page stays reachable via `:section` until each
  domain is migrated. → **Recommend CONFIRM.**
- **P5-D1 · Measurement domain page (04) = the governed-editor shell that 05/25 reuse** — left section-nav (Perspectives /
  Scorecard models / KPI types / Threshold schemes / Units) + list (JiraTable) + edit rail (canonical form controls, version/
  lifecycle band, effective-from, impact preview, Save draft / Submit for approval). The existing tab sections restyle INTO
  this shell. Perspectives authoring (`createPerspective`/`updatePerspective`, draft-only) is fully wired. → **Recommend CONFIRM.**
- **P5-D2 · Impact preview = client-derived USAGE impact, NOT a server-calculated score-shift.** The anchor's
  "IMPACT PREVIEW — SERVER-CALCULATED (score shift −1.8)" has no backing RPC (discovery found none). Render the honest,
  backable half: usage counts (N models · N KPIs referencing the object, from existing readers) + the immutable-history
  guarantee ("locked snapshots keep their config version — calculated under vN"). The numeric score-shift preview is a
  **DEFERRED** backend RPC — render a labeled gap, never a fabricated number. → **Recommend CONFIRM** (usage-impact now; score-shift RPC later).
- **P5-D3 · Threshold band editor (25) + model draft-create (05) + data-source registry/retire (26) are SCOPED-DOWN to what
  the backend supports** (like 3C/4B/4G). `configApi` has authoring writes ONLY for perspectives; the other governed tables
  are display + generic lifecycle (`submitRecord`/`approveRecord`/`retireRecord`) only, and `strata_data_sources` has no
  admin authoring. So: 25 = band DISPLAY (meaning column) + v-compare + lifecycle actions on existing records, band EDITING
  deferred; 05 = weights editor (`setModelPerspectiveWeights`) + integrity + preview + `approveScorecardModel`, model
  draft-CREATE deferred; 26 = read-only source registry (from `useDataSources`) + template contracts, source create/retire
  deferred. Each new authoring RPC (band-editor, model-draft, source-retire) = **separate backend feature (own migration +
  Plan Lock)**; the UI renders the honest "editing this needs the authoring feature" affordance, never a dead form. → **Recommend CONFIRM scoped-down.**
- **P5-D4 · "View as" (27) = read-only client impersonation PREVIEW** (renders the target user's home/permitted-surface
  summary from their role set, with a persistent banner), NOT a backend session switch. Audit the view event if a write RPC
  exists; else client-only preview + FLAG the audit-log write. SoD conflict detection stays **DB-enforced** (no client SoD
  engine); the UI surfaces the server's refusal text verbatim + explains GUARDED/CONFLICT. → **Recommend CONFIRM read-only preview + confirm audit path.**
- **P5-D5 · System states (28) = extract canonical shared components** — `StrataNotFound` (search + best-match + recents,
  replacing the inline StrataRoutes.tsx:34 version) + `StrataRestricted` (gate explained + owning role, replacing the ad-hoc
  per-page EmptyState) + a notification landing (object + state + provenance band; expired variant) reachable from the bell.
  Wire the bare `/strata/admin` unknown-`:section` to the canonical not-found instead of silently falling to tab 0. → **Recommend CONFIRM.**
- **P5-D6 · NO migration this phase** (all client-derive or existing RPC). FLAG-BEFORE-BUILD if any slice turns out to need a
  new RPC (band-editor, model-draft, source create/retire, impact-score RPC, view-as audit, SoD-check preview). → **Recommend CONFIRM.**

## Canonical components (reuse-first — verified by discovery)
REUSE: `StrataPanel`, `JiraTable` (admin-list rule), `StrataDecisionModal` (approval queue + SoD in-modal), `Lozenge`/
`StatusLozenge`, the existing governed primitives `GovStatusLozenge`/`GovEnvelope`/`GovActions`/`GovRecordCard`/`SectionState`
(StrataAdminConfigPage:64-221), `StrataPageShell`, `CatalystTag` (scope chips), ADS form controls (Textfield/DatePicker/
Select), `CatalystViewBase`-style edit rail (or the reviews-page rail idiom). BUILD NEW: `StrataNotFound`/`StrataRestricted`
canonical (28); domain-page shell w/ left section-nav; the config-landing domain cards; "View as" preview + banner (27);
client usage-impact-preview helper (P5-D2). Thin additive hooks (plain select, no migration) only if a reader is missing.

## Slices (each ≤ 2h; one commit; stop/split per CLAUDE.md). Order: landing → measurement triad → data → access → states.
- **5A · Config Landing (03)** — bare-route landing branch: approval band + 6 domain cards + recent-changes JiraTable.
  Domain cards route to domain pages/`:section`. States: empty/loading/restricted (strata_admin-only).
- **5B · Measurement domain + Taxonomy (04)** — `/admin/measurement` domain-page shell (left section-nav) + perspectives
  editor to the anchor (list JiraTable w/ weight-integrity header + edit rail w/ version band + effective-from + usage-impact
  preview + Save draft / Submit-for-approval SoD). SPLIT if >2h (5B-1 shell + list; 5B-2 edit rail + submit).
- **5C · Model Builder (05, scoped P5-D3)** — Scorecard-models section in the measurement shell: model list + perspective-
  weights editor (`setModelPerspectiveWeights`) + blocking integrity band + usage preview + `approveScorecardModel`. Model
  draft-create DEFERRED (labeled).
- **5D · Threshold Schemes (25, scoped P5-D3)** — Thresholds section: band DISPLAY with meaning column + v-compare +
  lifecycle actions. Band editing DEFERRED (labeled "authoring is a later feature").
- **5E · Data & Integration (26, scoped P5-D3)** — `/admin/data` domain page: read-only source registry (owners/feeds/
  freshness — reuse 4D's `StrataFreshnessGlyph`) + template contracts (column_schema). Source create/retire DEFERRED (FLAG).
- **5F · Roles & Access (27)** — `/admin/access` domain page: assignments JiraTable (Person·Role·Scope chips·SoD lozenge·
  Since) + CatalystViewBase rail (role meaning + SoD explanation + View-as) + assign/revoke (EXIST) + assign-role modal
  (server SoD check, refusal quotes rule) + **View-as** read-only preview + banner (P5-D4).
- **5G · System States (28)** — canonical `StrataNotFound` + `StrataRestricted` shared components + notification landing;
  rewire wildcard + unknown-`:section` + ad-hoc restricted EmptyStates to the canonical pair.

## Files forbidden (do not touch)
`src/modules/strata/pages/StrataStrategyMapPage.tsx` + its graph/inspector/edge/filter/legend deps. `EnterpriseSidebar.tsx`
styling (IA relabels only if needed, no restyle). Top-nav styling. `CatalystViewBase`/`CatalystDetailRouter` entity-kind
unions. No new design tokens. No new migration (P5-D6).

## UI/UX rules (enforced every slice)
ADS `--ds-*` tokens only (no hex/rgb/hsl/Tailwind color util/named color/local map/hex fallback); font-weight ∈
{400,500,600,653,700}; `var(--ds-space-*)` / on-grid px for spacing. Color never alone (lifecycle/SoD lozenges carry
words). Layout-matched skeletons; per-panel SectionMessage (page never blanks); explained restricted (never bare 403);
weight/band integrity = inline SectionMessage never toast. Effective-dated changes never reinterpret history ("calculated
under vN"). Self-approval blocked server-side + UI explains ("you authored vN — a second strata_admin must approve").
Both themes; grayscale-distinguishable states; keyboard-only path for submit/approve/assign.

## Data / backend rules
NO migration this phase. Governed lifecycle via `configApi.submitRecord/approveRecord/retireRecord` (generic table+id, SoD
DB-enforced) + `approveScorecardModel`; perspective authoring via `createPerspective/updatePerspective` (draft-only, RLS);
weights via `setModelPerspectiveWeights`; roles via `governanceApi.assignRole/revokeRole` (server SoD). Every write surfaces
the server rejection verbatim (§17). **Zero-assumption:** render a labeled gap where no authoring RPC exists (band editor,
model draft-create, source create/retire, score-shift preview, view-as audit) — never a dead form or a fabricated number.
FLAG-BEFORE-BUILD if any slice needs a migration/RPC.

## Parallel execution plan
5A (landing) precedes the domain slices. Measurement triad (5B→5C→5D) shares the domain-page shell (5B builds it). Data (5E)
and Access (5F) are independent after 5A. System states (5G) is cross-cutting (any slice can adopt the canonical not-found/
restricted once 5G lands, or 5G lands first if a slice needs it). One slice = one commit. Branch stays `strata/impl-phase01`.

## Screenshot + probe acceptance (QA)
Per slice, light+dark, 1440/1024: (1) DOM/DB probe proving function (not screenshots) — e.g. a perspective draft-create +
submit-for-approval round-trip surfacing the SoD rejection honestly; (2) ADS + CRE gates green; (3) grayscale-distinguishable
lifecycle/SoD states; (4) keyboard-only submit/approve/assign path. **Map baseline:** diff `/strata/strategy/map` after each
slice — zero change is a HARD gate.

## Validation commands
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre` (Vitest can't run).
Merge to main via the fast-forward path ([[github-noff-merge-push-rejected]]). Verify staged set before every commit.
NB the dev session at localhost:8080 expires every few minutes — verify+commit each slice promptly ([[dev-session-expires-mid-verify]]).

## Stop conditions
Any ADS/CRE gate regression; any map diff ≠ zero; any slice exceeding 2h (split); any anchor verb needing a migration/RPC
(raise before adding — esp. band-editor, model-draft, source create/retire, impact-score RPC, view-as audit); any PROPOSED
decision (P5-D0…D6) unresolved for the slice it gates; any field the schema/RPCs can't back honestly (render gap + flag,
never a wrong default). Self-approval / SoD is DB-enforced — never build a client bypass.

## Drift / rebaseline
Re-read the slice's anchor in full at slice start (05·25·26·28 not yet read in full). If it contradicts this plan, log to
`08_DRIFT_LOG.md` and stop for re-decision. The authoring-RPC gaps (band editor 25, model draft-create 05, source create/
retire 26, score-shift impact preview) are KNOWN vs backend (P5-D3) — the honest scoped-down build is the plan, not a drift.

## Open debt carried (do not lose)
1. Prod migrations `20260713100000` + `20260713110000` — staging-ledgered, prod-parked (no prod access). Apply on next prod run.
2. Backend defect `task_65642237` — `strata_promote_element` references dropped `strata_play_charters`.
3. Phase-4 DEFERRED backend features (own migration + Plan Lock): board-pack editorial builder + Issue; run-downstream
   blast-radius RPC; quarantine validation tier; `strata_reviews` entity; mapping-memory write.
4. **Phase-5 DEFERRED backend features (own migration + Plan Lock): threshold band-editor authoring; scorecard-model
   draft-create; data-source create/retire + retire-safety; server-calculated score-shift impact-preview RPC; view-as
   audit-log write.** All flagged by P5-D3/D2/D4.
