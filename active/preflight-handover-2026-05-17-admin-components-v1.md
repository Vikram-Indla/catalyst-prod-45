# Handover — /admin/components v1 (shipped 2026-05-17)

**Owner:** Vikram
**Author:** preflight + 15-step TDD execution
**Branch:** main (commits already pushed)
**Status:** v1 shipped, working tree clean

---

## What shipped

A read-only component-library admin module at **`/admin/components`** under the new **Design system** pocket (which now consolidates Icons + Avatars + Components).

### Surfaces

| Tab | Surface | Status |
|---|---|---|
| **Inventory** | Side-nav by category (atoms/molecules/organisms/pages/patterns) + spec card with file path, JSDoc, feature-flag table, live preview, consumer list | LIVE |
| **Banned** | 8 banned items with CLAUDE.md anchor + live-reference count | LIVE |
| **Violations** | 6 live ADS-compliance defects (3 P0 hand-rolled dropdowns, 2 P1 deprecated shims, 1 P2 lozenge duplicate) | LIVE |
| **Cascade** | Component + change-kind picker → consumer audit checklist → "Copy markdown" for PR description | LIVE |

### Files added

```
src/registry/components.registry.ts                          # curated source of truth (10 canonical + 8 banned)
src/registry/usage-map.generated.ts                          # AST scan baseline (504 atlaskit + 3292 internal)
src/registry/ads-violations.generated.ts                     # live ADS violation scan output (6)
src/registry/__tests__/components-registry.test.ts           # 6 contract assertions
src/registry/__tests__/usage-map.test.ts                     # 6 contract assertions
src/registry/__tests__/ads-violations.test.ts                # 6 contract assertions

src/pages/admin/components/ComponentsAdminPage.tsx           # page shell (PageHeader → Heading swap by user)
src/pages/admin/components/ComponentSpecCard.tsx             # right-pane detail
src/pages/admin/components/ComponentLivePreview.tsx          # light + dark frame
src/pages/admin/components/componentPreviewFixtures.tsx      # atom + simple-molecule fixtures
src/pages/admin/components/ADSViolationsPanel.tsx            # violations table
src/pages/admin/components/CascadeImpactPanel.tsx            # version-bump audit list
src/pages/admin/components/__tests__/ComponentSpecCard.test.ts
src/pages/admin/components/__tests__/ComponentLivePreview.test.ts
src/pages/admin/components/__tests__/CascadeImpactPanel.test.ts
src/pages/admin/__tests__/components-admin-page.test.ts
src/pages/admin/__tests__/components-admin-layout.test.ts

scripts/scan-components.ts                                   # AST-equivalent regex scanner
scripts/scan-ads-violations.ts                               # 4-category violation scanner
```

### Files modified

- `src/components/admin/admin-nav.ts` — Design system pocket created; Icons + Avatars relocated out of General; `/admin/components` registered
- `src/routes/FullAppRoutes.tsx` — lazy import + `<Route path="components">` under `/admin/*`
- `package.json` — `npm run scan:components` + `npm run scan:ads-violations`
- `CANONICAL_COMPONENTS.md` — launch section added at the top

### Test count

**94 tests passing across 20 files** in the admin + registry suite. No regressions introduced. `admin-sidebar-parity.test.ts` and `admin-guard-coverage.test.ts` both green.

### Schema delta

**Zero.** No new Supabase tables, no new RLS policies, no migrations. Schema-probe gate clean.

---

## How to use (engineer cheat-sheet)

### Adding a new canonical component
1. Edit `src/registry/components.registry.ts` — append an entry to the `CANONICAL` array with `id`, `name`, `category`, `file_path`, `version` (start at `1.0.0`), `jsdoc_excerpt`, and optional `feature_flags`.
2. `npm run scan:components` — refreshes the consumer baseline.
3. (Optional) Add a fixture in `componentPreviewFixtures.tsx` if it can render without app-level providers.
4. Open `/admin/components` and confirm it appears under the correct category.

### Changing a canonical component
1. Bump the entry's `version` in `components.registry.ts` (patch/minor/major).
2. Open `/admin/components` → **Cascade tab** → pick the component + change kind.
3. Tick each consumer as you review it.
4. Click "Copy markdown checklist" → paste into your PR description.
5. Reviewer verifies coverage before approving.

### Fixing an ADS violation
1. Open the **Violations** tab.
2. Click the file:line link → opens in VS Code.
3. Fix the violation.
4. `npm run scan:ads-violations` — should drop the count by 1.

---

## v2 candidate list

Carried forward from the preflight council deliberation. Ordered by impact.

| # | Candidate | Council advocate | Estimate | Notes |
|---|---|---|---|---|
| 1 | **Props-knobs interactive sandbox** | Outsider / UI-UX-Pro-Max | Medium | Replace static fixture render with live prop editors (number / string / select / boolean) so engineers can twiddle the surface area in real time without code changes. |
| 2 | **Storybook 8 + Chromatic embed** | Outsider | Medium-High | Run Storybook in-tree, mount under `/admin/components/storybook` behind AdminGuard. Chromatic gates visual regressions on canonical components per PR. |
| 3 | **ts-morph codemod path** | First Principles | High | Cascade tab gets a "Run codemod" action — generates ts-morph rewrites for consumers when a prop is renamed/removed. Read-only audit list becomes optional auto-fix. |
| 4 | **CI gate on registry drift** | Executor | Low | GitHub Action that runs `npm run scan:components` + `git diff --exit-code src/registry/usage-map.generated.ts`. Fails PR if the generated file is stale. |
| 5 | **Component render telemetry** | Expansionist | Low-Medium | Build-time flag `__CATALYST_COMPONENT_TELEMETRY__` that injects a `useComponentTelemetry()` hook into every canonical component, reporting render count + error rate to a staging dashboard. Never ships to prod. |
| 6 | **Raw-hex literal scanner with Jira-parity allowlist** | Contrarian | Medium | The deferred 5th violation category. Needs a hex-literal allowlist for files documented as Jira-parity exact-color overrides (CLAUDE.md 2026-05-05). |
| 7 | **JSDoc backfill on canonical components** | (deferred from Q3) | Low | Add formal `@param` / `@example` blocks to the 10 seeded canonical components so the spec card excerpt has richer source material. |
| 8 | **Per-route feature-flag scoping** | (from probe section 5) | Medium | The `feature_flag_audit` table + new `useFeatureFlagForRoute(key, version, route)` hook so a component version can be enabled per route. Requires schema work. |
| 9 | **Banned-orphan-file linter** | (3 known orphans) | Low | Add a CI lint that fails if `CatalystMdtRefField.tsx`, `CatalystAssessmentFeatureField.tsx`, or `CatalystServiceNowDisplay.tsx` are imported anywhere outside their own test or the banned registry. v1 panel surfaces refs at runtime; v2 makes it block at commit time. |
| 10 | **Storybook-style "states" view per entry** | UI-UX-Pro-Max | Medium | For each canonical component, render every state (loading / empty / error / hover / focus / disabled) in a single grid. Pairs with sandbox (#1). |

---

## Known limitations

- **Live preview covers atoms only.** Organisms (JiraTable, CatalystSidebarDetails, CatalystKeyDetails, etc.) need provider mocking and render a "Preview deferred to v2" placeholder with a per-id reason in `componentPreviewFixtures.tsx` `DEFERRED_REASONS`. Reasonable v1 cut.
- **3,292 "internal observed" entries** include every PascalCase identifier the scanner sees, which includes some types and constants that aren't true components. The UI groups by name for display and the curated 10 from `components.registry.ts` are the only ones that show as "owned". v2 could filter using TS compiler API for stricter classification.
- **Cascade audit state is in-memory only.** Tick state resets on page refresh. v2 could persist to localStorage or to a `feature_flags`-style audit table.
- **Markdown export uses `navigator.clipboard.writeText`** with `document.execCommand('copy')` fallback. Works in Chrome / Safari; some hardened environments may block silently.
- **CatalystStatusPill fixture** renders 3 status variants but does not exercise the picker (clicking opens a portal that needs the project-work-hub `STATUS_OPTION_GROUPS` constant — works but heavy for a preview).

---

## How to land a v2 candidate

1. Open a new preflight session: `/preflight v2 /admin/components — <candidate name>`.
2. Reference this handover so the council has the v1 baseline.
3. Build TDD per CLAUDE.md.
4. Update this file's "Status" → "v2 shipped" when done.

---

## Open questions / decisions to revisit

- **Should `/admin/components` require Super Admin instead of Admin?** Currently it inherits AdminGuard (admin or super-admin). Surfacing banned components and ADS violations is governance — Vikram may want it locked tighter.
- **Should `usage-map.generated.ts` be in `.gitignore`?** It's 2 MB and rebuilds on demand. Keeping it git-tracked means PR diffs show consumer-count changes (good signal), but adds noise on unrelated PRs that touch any import. **Recommend keep git-tracked for v1, revisit at v2.**
- **Storybook vs in-tree sandbox?** Council was split. If we go Storybook, we keep one tool; if we go in-tree, the UI matches the rest of `/admin/components` aesthetically. Decide at v2 preflight.
