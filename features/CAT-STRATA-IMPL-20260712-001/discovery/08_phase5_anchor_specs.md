# Phase 5 (configuration & system states) — Anchor digests

> Design authority = claude.ai anchors, read IN FULL by the parent (DesignSync parent-only). Build order per HANDOFF:
> **03 → 04 → 05 → 25 → 26 → 27 → 28.** ADS `--ds-*` tokens only. Map protection absolute.
> 03·04·27 read in full at planning (below). 05·25·26·28 = HANDOFF one-line spec here + **re-read IN FULL at slice start** (drift protocol).

## 03 — Config Landing · `/strata/admin` (StrataAdminConfigPage — bare route)
Breadcrumb "STRATA / Governance"; H2 "Configuration" + "GOVERNED CONTROL PLANE" lozenge + "You are strata_admin · every
change here is versioned, approved and audited". **Approval band** (AWAITING APPROVAL · N changes + "needs an independent
approver" + Open approval queue →). **6 consequence-domain cards** (grid 3-col; each icon+name+flag+"governs" prose+stats,
card → full domain page `/strata/admin/:domain` with left section-nav): Strategy framework · Measurement[1 PENDING] ·
Value & governance · Data & integration[2 STALE] · Workflow & access · Reference & display. **Change-log JiraTable**:
Change · Version · Status · Downstream impact · Effective. Safety: publish/retire 2-step (server impact preview → typed
confirm); effective-dated never reinterprets history ("calculated under v2"); self-approval blocked server-side + UI explains.
Canonical: StrataPanel+Lozenge cards; JiraTable change log; StrataDecisionModal approval queue (SoD in-modal).

## 04 — Taxonomy & Perspective Manager · `/strata/admin/measurement` (governed-object editor — the 04/05/25 shell)
Left section-nav (Perspectives & taxonomy[active] / Scorecard models[3] / KPI types & formulas / Threshold schemes[1
pending] / Units & currencies) + "← Configuration". H2 "Perspectives & taxonomy" + "v3 · LIVE SINCE 01 JAN 2026" +
"Compare versions" + "Draft a change". **2-col 1fr/380px**: perspectives **JiraTable** (Perspective[swatch+name+desc] ·
Weight · Used by · Lifecycle ACTIVE; header "✓ Weights total 100" integrity; retired footer "historical scorecards
calculate under v1" + View version history) + **edit rail** (CatalystViewBase-style, "EDITING CREATES v4 DRAFT"; Name/
Weight/Effective-from canonical form fields; **IMPACT PREVIEW — SERVER-CALCULATED** [recalcs N models/N KPIs · no locked
snapshot changes · score shift −1.8]; Discard/Save draft/**Submit for approval** + "Requires a second strata_admin").
States: empty teaches consequence; draft-in-flight banner (prevents parallel edits); restricted route hidden from nav +
permission explanation. Weight integrity = inline SectionMessage, never toast.

## 27 — Roles & Access · `/strata/admin/access`
Left section-nav (Role assignments[active] / SoD rules / Workflow transitions / Approval authorities). H2 "Roles & access"
+ "6 roles · 41 assignments · 3 SoD rules — UI mirrors the server role engine, never replaces it" + "View as…" + "+ Assign
role". **2-col 1fr/380px**: assignments **JiraTable** (Person · Role · Scope[chips] · **SoD: CLEAN/GUARDED/CONFLICT** ·
Since; "GUARDED = legal but constrained by an SoD rule") + **CatalystViewBase rail** (selected person → roles + "WHAT THESE
ROLES MEAN" domain language + "COMBINED EFFECT" SoD explanation quoted + GUARDED warning + "ACTS AS (PREVIEW)" + Edit
scopes/Remove role/**View as**). Assign-role modal (person→role→scope, **live server SoD check**, refusal quotes the rule).
View as = read-only impersonation preview + persistent banner, audit-logged. GUARDED is first-class (between CLEAN/CONFLICT).
Restricted strata_admin-only. <1100 rail→overlay.

## 05 — Scorecard Model Builder (HANDOFF; re-read in full at slice start)
Same measurement domain. Draft-first; integrity band (blocking); preview-with-data; diff vs live.
DISCOVERY: only `setModelPerspectiveWeights` + `approveScorecardModel` exist — **no model draft-create RPC** → scoped.

## 25 — Threshold Schemes (HANDOFF; re-read in full at slice start)
Same measurement domain. Band editor with meaning column; tile 0–100 validation; v3↔v4 compare; impact preview.
DISCOVERY: threshold schemes are **display-only, NO authoring RPC** → scoped (display + compare + lifecycle; band edit deferred).

## 26 — Data & Integration (HANDOFF; re-read in full at slice start)
`/strata/admin/data`. Source registry w/ owners+feeds; template contracts; retire safety (dependents preview + typed confirm).
DISCOVERY: `strata_data_sources` has **NO admin surface** (lives on StrataDataPipelinePage); templates display-only. → registry + template contract read; retire-safety FLAG.

## 28 — System States (HANDOFF; re-read in full at slice start)
Canonical not-found (search + best match + recents), restricted (gate explained + owner), notification landing (object+state+
provenance band; expired variant). DISCOVERY: `StrataNotFound` inline hand-rolled (StrataRoutes.tsx:34); restricted = ad-hoc
EmptyState per page; no notification landing page. → extract canonical shared components.
