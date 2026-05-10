# Preflight handover — Home / For You page overhaul — 2026-05-10

## Context
- Surface: `cross-cutting` (ui-bug-fix + ui-feature + ui-refactor + design-only)
- Tier: **high-stake** — adds/removes user-visible components (bulk actions, ageing buckets), reverses dead navigation wiring, touches multiple files across the home surface
- Started: 2026-05-10
- Council ran: no (see Phase 1 note — abridged 3-advisor due to bounded scope)
- Jira probe reference: https://digital-transformation.atlassian.net/jira/for-you

---

## Phase 0 — Bootstrap gates (verbatim)

> **TDD non-negotiable (CLAUDE.md):** Write a failing test first. Write minimal code to pass it. Refactor only after green.

> **Small steps (CLAUDE.md):** After every single logical change — stop, explain, suggest commit, await confirmation.

> **ADS-only (CLAUDE.md 2026-04-28):** All dark/light theme values must come exclusively from Atlaskit tokens. No raw hex, no custom theme libs.

> **Ask before add/remove (CLAUDE.md 2026-05-04):** Before adding any field/component a user would see, or removing anything — STOP and explicitly ask Vikram.

> **jira-compare gate (CLAUDE.md 2026-05-04):** Any UI feature must pass jira-compare before declared done.

> **ads-validator gate (CLAUDE.md 2026-04-28):** Any UI-touching plan row must be gated by ads-validator clean.

> **JiraIssueTypeIcon (CLAUDE.md 2026-05-09):** Never use coloured dots/squares for work item type. Always use JiraIssueTypeIcon from @/lib/jira-issue-type-icons.

> **Anti-pattern #18 (CLAUDE.md 2026-05-05):** Before adding any field, probe getJiraIssueTypeMetaWithFields. Catalyst-side custom fields need explicit per-type Vikram ask.

---

## Phase 0.5 — Design Intelligence Brief

### Defect inventory (code-audited, not visual only)

| # | ID | Severity | File | What is broken |
|---|---|---|---|---|
| 1 | **F1-CRITICAL** | P0 | `AgeingPanel.tsx:217` | `navigate('/issues/${item.key}')` — no `/issues/:key` route exists in `FullAppRoutes.tsx`. Row click is a dead-end 404 navigation. Every ageing ticket click silently fails. |
| 2 | **F2-HIGH** | P0 | `RecommendedProjectsStrip.tsx:89` | `navigate('/projects')` → `ProjectDirectory` (a legacy catch-all). User expects `/project-hub/projects` → `AllProjectsPage` (the correct hubs view). Wrong destination every time. |
| 3 | **L1-HIGH** | P1 | `HomeSidebar.tsx:86` | `{location.projectName}` renders "Senaei BAU" in full. User wants project key "BAU". `RecentLocation` has `projectKey` field — just use it. |
| 4 | **L2-MEDIUM** | P1 | `HomeSidebar.tsx:136` | `ProjectIcon` rendered with `size="small" variant="ghost"` — from screenshots the icons are NOT visible. `variant="ghost"` likely renders transparently. Need to check `ProjectIcon` component's `variant` prop. |
| 5 | **R1-HIGH** | P1 | `RecommendedProjectsStrip.tsx:48-52` | Alpha-sort only — no recency or activity signal. Strip shows same 3 projects forever regardless of what user visited. Should prioritise by `visitedAt` from `useRecentProjects` store. |
| 6 | **A1-HIGH** | P1 | `AgeingPanel.tsx:222-227` | `handleToggleStar` is a complete no-op (comment says "click is a no-op"). Stars render, user clicks, nothing happens. Dead interaction — should either wire or remove the star button from Ageing rows. |
| 7 | **A2-MEDIUM** | P1 | `AgeingPanel.tsx:173-183` | Time buckets missing `2–6 months` and `6+ months` granularity. User requested: 2-month, 3-month, 6-month buckets. Current `older (3+)` is one undifferentiated bucket for everything past 3 months. |
| 8 | **D1-HIGH** | P1 | `ForYouRow.tsx:75-82` | `statusToAppearance()` maps status to Atlaskit Lozenge appearance. But CLAUDE.md §5 (2026-05-08): Atlaskit Lozenge appearance tokens ≠ Jira actual colors. Need DOM probe of Jira for-you row to verify correct appearance. |
| 9 | **D2-HIGH** | P1 | `ForYouRow.tsx:123-135` | Row height `48px` with `paddingBlock: 8`. Jira's For You rows are 56px per spec comment at line 6 of the same file. Height regression — spec says 56px but current impl is 48px. |
| 10 | **C1-MEDIUM** | P2 | `useAiThemes.ts:23-29` | Two-layer cache (server 10-min TTL + RQ 5-min staleTime). The user says "caching broken — delta not pulling". Need to probe: does `forceRefresh=true` actually bust the Supabase `ai_theme_cache` table, or does the EF still return stale? |
| 11 | **B1-MEDIUM** | P2 | Missing entirely | No bulk status change affordance on any For You tab. User explicitly requested it. Requires explicit Vikram design approval (ask-before-add rule). |
| 12 | **S1-LOW** | P2 | `ForYouRow.tsx:244-254` | AssignedPanel "Assign to me" — spacing is awkward per user. `AssignedPanel.tsx` needs probe to confirm where this renders. |

### Design lens summary (7-founder analysis)

| Lens | Finding | Severity |
|---|---|---|
| **Norman** — affordances | Ageing row looks clickable but navigates to a dead route. False affordance — highest trust violation on the page. | P0 |
| **Raskin** — Fitts | Star button is 28×28px in Ageing but click is a no-op — user is trained to expect a response, gets silence. Broken feedback loop. | P1 |
| **Saffer** — microinteraction | Row click Trigger→Rules→Feedback loop is broken in Ageing (no feedback). Star click loop is broken (no Loops persist). | P0 |
| **Tufte** — data-ink | Recommended strip shows 3 static alpha-sorted projects regardless of access pattern — zero data-ink value. | P1 |
| **Ive** — reduction | Sidebar full project name "Senaei BAU" with arrow "›" and section label wastes horizontal space — key "BAU" is the minimal signifier. | P1 |
| **Cooper** — goal-directed | User goal: "jump back to where I was" — sidebar currently shows the full project name and may have invisible icons. Jump-back is impeded. | P1 |
| **Rams** — long-lasting | Typography/contrast gap vs Jira noted by user: "contrast is very rich in Jira, falls bad in Catalyst". ADS density tokens not applied. | P2 |

### Design Elevation Score pre-build: **6/15**
- P0 broken navigation (×2): −4
- P1 dead interactions (×4): −4
- Static/stale data (no recency): −1
- Typography/density gap: −1
- F: 15 − 4 − 4 − 1 − 1 = **5 raw** → normalized ~6/15

**Score < 11/15 → mandatory redesign before implementation.** The P0 broken-navigation and dead-star-click issues must be closed before ANY visual polish work starts.

---

## Phase 1 — Council (abridged — 3 advisor)

**Contrarian:** "The user says `assign to me` is not working and the star is dead in Ageing. These are both interaction regressions — the star was presumably working at some point. Before adding new buckets or bulk actions, prove the existing interaction loop works end-to-end. The Row click fix (F1) is the gating P0 and nothing else ships until it's green."

**First Principles:** "The core contract of a 'For You' page is: click a thing → see the thing. That contract is 100% broken in the Ageing tab. Fix the navigate call to use `useGlobalSearchStore.openDetail()` exactly the same way `handleSelect` in `ForYouPage.atlaskit.tsx:141-156` does. Don't invent a new routing path — reuse the canonical one. Everything else is cosmetics until this is wired."

**Executor:** "Block the plan into 3 phases: (1) fix P0 broken interactions; (2) fix P1 data/display issues (project key, icon, View all projects route, recommended sort); (3) P2 enhancements (ageing buckets, caching investigation, ADS density tokens). Don't start phase 2 until phase 1 is tested. Don't start phase 3 until phase 2 is tested."

**Chairman verdict:** The Contrarian and First Principles advisors agree: P0 broken navigation is the gate. The Executor's 3-phase blocking structure is adopted. Bulk status change (B1) requires explicit Vikram approval before any code — it is flagged but not planned until approval lands. The `data-cp-lozenge-jira-parity` CSS override on Lozenge must be verified in a DOM probe before D1 is claimed fixed. All council lenses require ADS tokens throughout — no raw hex in any fix.

---

## Phase 2 — Plan

| # | Task | Tool | Skill (justified) | Suggested model | Gate | Metric |
|---|---|---|---|---|---|---|
| **PHASE 1 — P0 broken interactions** | | | | | | |
| 1 | Jira for-you live DOM probe — screenshot Jira For You page row click, row spacing, status pill colors, ageing tab layout | claude-code (Chrome MCP) | `jira-compare`: parity baseline before any fix — CLAUDE.md 2026-05-04 | sonnet | DOM JSON captured | Jira row spec recorded |
| 2 | Failing test: AgeingPanel row click navigates to canonical detail (useGlobalSearchStore.openDetail) not /issues/:key | claude-code | `catalyst-feature`: TDD gate — CLAUDE.md non-negotiable | sonnet | Test red | 1 vitest fail |
| 3 | Fix F1: Replace `navigate('/issues/${item.key}')` with `useGlobalSearchStore.getState().openDetail({id: item.phIssueId, itemType, projectKey})` in AgeingPanel.tsx:217 | claude-code | (TDD impl) | sonnet | Test green | 1/1 vitest pass |
| 4 | Failing test: View all projects navigates to /project-hub/projects | claude-code | `catalyst-feature`: TDD gate | sonnet | Test red | 1 vitest fail |
| 5 | Fix F2: Change `navigate('/projects')` → `navigate('/project-hub/projects')` in RecommendedProjectsStrip.tsx:89 | claude-code | (TDD impl) | sonnet | Test green | 1/1 vitest pass |
| 6 | ads-validator gate on Phase 1 changes | claude-code | `ads-validator`: token drift check — CLAUDE.md 2026-04-28 | haiku | Clean | 0 violations |
| **PHASE 2 — P1 data/display fixes** | | | | | | |
| 7 | Investigate L2: What does `variant="ghost"` do in ProjectIcon? Read src/components/shared/ProjectIcon.tsx | claude-code | (read) | haiku | Finding documented | Confirm if icons render |
| 8 | Ask Vikram: sidebar should show `projectKey` (BAU) OR `projectName` (Senaei BAU) truncated? Confirm project icon fix approach (ghost vs undefined). | manual | ask-before-add CLAUDE.md 2026-05-04 | — | Vikram confirms | Design direction |
| 9 | Failing test: HomeSidebar renders projectKey not full projectName in row title | claude-code | `catalyst-feature`: TDD gate | sonnet | Test red | 1 vitest fail |
| 10 | Fix L1+L2: Update LocationRowTitle to use `location.projectKey`; fix ProjectIcon variant | claude-code | (TDD impl) | sonnet | Test green | 1/1 pass |
| 11 | Fix R1: Update RecommendedProjectsStrip to sort by `visitedAt` from useRecentProjects hook rather than alpha — show most-recently-visited 3 first | claude-code | `catalyst-feature`: TDD gate | sonnet | Test green | Sort by recency verified |
| 12 | jira-compare DOM probe: verify row height, spacing, Lozenge appearance vs live Jira for-you | claude-code (Chrome MCP) | `jira-compare`: parity gate — CLAUDE.md 2026-05-04 | sonnet | Drift documented | JSON diff |
| 13 | Fix D2: Correct row height from 48px → 56px in ForYouRow.tsx:123 (Jira spec) | claude-code | (TDD impl — height controlled by snapshot test) | sonnet | Snapshot updated | DOM measurement matches |
| 14 | Fix D1: Verify `data-cp-lozenge-jira-parity` CSS is active for Ageing rows; if not, confirm override path | claude-code | `ads-validator`: token/CSS audit | haiku | Override active | CSS probe confirms |
| 15 | ads-validator gate on Phase 2 changes | claude-code | `ads-validator`: CLAUDE.md 2026-04-28 | haiku | Clean | 0 violations |
| **PHASE 3 — P2 enhancements** | | | | | | |
| 16 | Caching investigation: instrument `useAiThemes` — does `forceRefresh=true` actually bust `ai_theme_cache` server-side? Log cache hit/miss header from Edge Function response | claude-code | (debug) | sonnet | Cache behaviour documented | Logs confirm delta pull |
| 17 | Fix A2: Extend AgeingPanel buckets — split `older (3+)` into `3–6 months` and `6+ months` as user requested | claude-code | `catalyst-feature`: TDD gate | sonnet | Test green | 1/1 pass |
| 18 | Fix A1: Remove star button from AgeingPanel rows (it is a no-op; dead interaction is worse than no interaction per CLAUDE.md UX rule) OR wire it — ask Vikram first | manual | ask-before-add CLAUDE.md | — | Vikram confirms | Direction confirmed |
| 19 | Ask Vikram: bulk status change — confirm this is in scope, agree on interaction pattern (checkbox select + action bar, or shift-click range?) | manual | ask-before-add CLAUDE.md 2026-05-04 | — | Vikram "go" | Design approved |
| 20 | ADS density token audit: replace any raw px spacing in ForYouRow, AgeingPanel, ForYouTabs with `token('space.*')` equivalents | claude-code | `ads-validator`: density tokens — user explicitly requested | sonnet | ads-validator clean | 0 raw-spacing violations |
| 21 | jira-compare final parity check on all Phase 2+3 changes | claude-code (Chrome MCP) | `jira-compare`: done gate — CLAUDE.md 2026-05-04 | sonnet | Drift < threshold | DOM diff JSON |
| 22 | Ask Vikram before merge | manual | — | — | Vikram "go" in chat | — |

---

## Progress
- [ ] Row 1 — Jira DOM probe
- [ ] Row 2 — Failing test (AgeingPanel navigate)
- [ ] Row 3 — Fix F1
- [ ] Row 4 — Failing test (View all projects)
- [ ] Row 5 — Fix F2
- [ ] Row 6 — ads-validator Phase 1
- [ ] Row 7 — ProjectIcon investigation
- [ ] Row 8 — Ask Vikram (sidebar display)
- [ ] Row 9-15 — Phase 2
- [ ] Row 16-22 — Phase 3

## Files to touch (predicted)
- `src/components/for-you/atlaskit/AgeingPanel.tsx` — F1 navigate fix, A2 buckets, A1 star decision
- `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` — F2 View all projects, R1 recency sort
- `src/components/layout/HomeSidebar.tsx` — L1 project key, L2 icon fix
- `src/components/for-you/atlaskit/ForYouRow.tsx` — D2 height, D1 lozenge
- `src/hooks/useAiThemes.ts` — C1 caching investigation
- `src/components/for-you/atlaskit/ForYouTabs.tsx` — D3 density tokens

## Tests to add (predicted)
- `src/components/for-you/atlaskit/__tests__/AgeingPanel.test.tsx` — navigate wiring, bucket splits
- `src/components/for-you/atlaskit/__tests__/RecommendedProjectsStrip.test.tsx` — View all projects route, recency sort

## Open items / next session
- **B1 Bulk status change**: requires Vikram design approval before any code
- **A1 Star in Ageing**: confirm wire vs remove
- **C1 Caching**: investigate if delta is actually broken or a UX perception issue (the Edge Function does signature-invalidate on updated_at drift, which should be delta-only)
- **Density tokens**: full `token('space.*')` sweep is a cosmetic pass — schedule after P0/P1 complete
- **Jira new tabs**: user confirmed "keep existing tabs, no new ones from Jira"

## Lessons candidates (draft — for Vikram review before CLAUDE.md commit)

```
## 2026-05-10 — For You AgeingPanel: navigate('/issues/:key') is a dead route
Surface: AgeingPanel.tsx / ForYouPage ageing tab
Pattern: AgeingPanel.handleSelect used navigate('/issues/${item.key}') instead of the canonical
useGlobalSearchStore.openDetail() path that every other For You panel uses. The route /issues/:key
does not exist in FullAppRoutes.tsx. Row click silently navigated to a 404.
Rule: In ANY For You panel or home-surface component, row click must use
useGlobalSearchStore.getState().openDetail({ id: item.phIssueId ?? item.id, itemType, projectKey })
for Jira-synced work items. The navigate() path for issues is never /issues/:key — it is the
detail modal via the globalSearchStore. This applies to every future home surface component.
```

```
## 2026-05-10 — View all projects must navigate to /project-hub/projects not /projects
Surface: RecommendedProjectsStrip.tsx / Home page
Pattern: "View all projects" button used navigate('/projects') which resolves to ProjectDirectory
(a legacy catch-all). The canonical all-projects surface is /project-hub/projects (AllProjectsPage).
Rule: Any "View all projects" / "See all projects" link on the home surface must navigate to
/project-hub/projects. The /projects route is legacy and does not contain the hub-based projects UI.
```
