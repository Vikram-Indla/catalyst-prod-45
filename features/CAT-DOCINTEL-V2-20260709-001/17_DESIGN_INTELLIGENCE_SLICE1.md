# Design Intelligence Brief v3.0 — Doc Intel Slice 1

**Scope:** Catalyst `localhost:8080/doc-intelligence`
**Design system:** Atlassian Design System only
**Verdict:** HALT pending Drift Event 5 rebaseline

## 1. ADS canonical component audit

| Slot | Required | Detected / proposed | Status |
|---|---|---|---|
| Page shell | `AtlaskitPageShell` | Current padded div; proposed canonical shell | Fix in approved slice |
| H1 | `PageHeader` | Present | Keep; exactly one H1 |
| Peer navigation | ADS Tabs / accessible canonical links | Absent | Add progressively |
| Library list | `JiraTable` | Present | Preserve |
| States | ADS EmptyState/Spinner/SectionMessage | Present in current page | Preserve |
| Colors | ADS tokens | No raw color found in authorized current files | Pass |
| Spacing | ADS 4/8 rhythm | One targeted `gap:12` / `margin:12px 0 20px` finding | Fix when moving Library |

References: [ADS components](https://atlassian.design/components),
[tokens](https://atlassian.design/foundations/tokens),
[spacing](https://atlassian.design/foundations/spacing),
[accessibility](https://atlassian.design/foundations/accessibility).

## 1b. Lessons-applied pre-scan

Twenty governance anchors were checked. No colored work-type dots, shadcn controls, custom modal,
custom table, uppercase section header, ADF editor or non-ADS popup is introduced by Slice 1.

Active findings:

1. Operations (“Knowledge Health”) are foregrounded in the user page.
2. Repeated READY rows provide weak information hierarchy and omit source identity.
3. Proposed one-segment static destinations can shadow frozen source slugs.
4. Three proposed destinations have no real pages in Slice 1.

## 2. Foundation Council synthesis

- **Saffer:** Navigation feedback must derive from URL state; browser history is part of the loop.
- **Tufte:** Repeated READY and duration/page telemetry consume space without advancing the user job.
- **Rams:** Home must be truthful and minimal; no fictional recent analysis or placeholder product.
- **Norman:** For you and Library need explicit, keyboard-operable signifiers and one active state.
- **Ive:** Remove duplicate inventory chrome; preserve whitespace and ADS elevation rather than cards.
- **Raskin:** Expose only two real destinations in Slice 1; add Themes/Deliverables when implemented.
- **Cooper:** Home must answer the review job and use an ADS EmptyState action until Slice 2.
- **AtlasKit Architect:** Use installed controlled `@atlaskit/tabs` semantics or canonical accessible
  links; do not reuse legacy custom tab bars.

References: [ADS Tabs](https://atlassian.design/components/tabs),
[Empty State](https://atlassian.design/components/empty-state),
[Button](https://atlassian.design/components/button),
[motion](https://atlassian.design/foundations/motion).

## 3. Jira parity to ADS opportunity

| Gap | ADS opportunity | Verdict |
|---|---|---|
| Inventory is the landing page | Goal-led Home with explicit peer navigation | Exceed current |
| Operations mixed with user work | Relocate after backend authorization | Required later |
| No active destination state | URL-derived ADS navigation | Required now |
| Source rows lack useful identity | Preserve until Slice 8A; do not invent early | Defer truthfully |

## 4. AI use cases

No new AI output is introduced in Slice 1. Home uses an ADS EmptyState and navigation only. Scoped
Ask/Review/Create behavior belongs to Slice 2–3; presenting it now would overclaim capability.

## 5. Sibling standardisation

`AtlaskitPageShell`, `PageHeader`, ADS Tabs, ADS EmptyState and `JiraTable` are the approved sibling
standards. `CatalystQuickTabBar`, `ForYouTabs` and Project Hub TopNav are rejected due custom/legacy
semantics and token debt.

## 6. Design elevation score

| Dimension | Score |
|---|---:|
| Canonical slots | 2/3 |
| Token compliance | 3/3 |
| Motion/interaction | 1/3 |
| AI rendered honestly | 2/3 |
| Sibling parity | 1/3 |
| **Total** | **9/15 — HALT** |

## 7. Blocking findings

| Finding | Rule | Required fix |
|---|---|---|
| One-segment route collision | Frozen slug contract | Two-segment `views/*` and `actions/*` namespace |
| Missing destination pages | Goal-directed/truthful UI | Progressive navigation; no placeholders |
| Annotated baseline unavailable | design-intelligence evidence rule | User-approved raw screenshot + structured log exception |
| Existing spacing debt in moved page | ADS spacing | Fix the touched composition without increasing audit counts |

## Evidence status

The signed-in raw baseline and DOM were captured. Temporary SVG arrow injection was attempted through
the permitted browser API, but the browser security policy rejected page-script mutation and
explicitly prohibited workarounds or alternate browser surfaces. No source implementation began.
