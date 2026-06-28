# CAT-ADS-COMPLIANCE-20260627-001 — Agent Outputs (synthesis)

> 7 discovery agents, read-only, 2026-06-27.
> Interpretation: **ADS = Atlassian Design System** compliance for the Catalyst web app (not advertising).

---

## Agent 1 — Canonical Component / Tooling Discovery
**Verdict: MATURE. Tooling already exists — this is an enforcement + long-tail remediation effort, not a build.**

Existing tooling:
- `scripts/no-hardcoded-colors.cjs` — bare hex / rgb / rgba / hsl scanner. Allows `var(--*, #hex)` and `token('…', #hex)` fallbacks. Manual run only.
- `design-governance/rules/audit.js` — orchestrates 4 validators (ADS token, typography, spacing grid, font import). Strict mode blocks merge.
- `scripts/check-field-compliance.mjs` — gates field registry `adsCompliance` tiers.
- `scripts/scan-ads-violations.ts` (`npm run scan:ads-violations`) — hand-rolled dropdowns, banned imports, deprecated shims, lozenge dupes.
- `scripts/weekly-compliance-report.js` — Supabase-backed trend reporting.
- `eslint.config.js` — `catalystBannedColors`, `catalystBannedTailwindColors`, ADS import isolation, admin/v2 hard bans.

Canonical token modules: `src/lib/catalyst-tokens.ts`, `src/theme/tokens.ts`, `src/tokens/jira-parity-overrides.css`, `references/ads-token-map.md`.
Canonical components: `src/components/ads/**` (48+ wrappers), `src/canonical/field-registry.ts`, `src/lib/jira-issue-type-icons.ts`.

**Gap:** scanner + audit not wired into the main `ci.yml` / npm scripts by name.

---

## Agent 2 — Violation Surface Census
**~574 TRUE bare-hex (down from 3789 before scanner hardening — ~85% were `var()` fallbacks). Plus ~200 Tailwind color arbitraries, ~109 inside rgba()/gradients.**

Top REAL offenders (Tailwind color utils — Type C):
- `src/pages/releases/DefectDetailPage.tsx` (131)
- `src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx` (114)
- `src/modules/work-hub/views/AllWorkView.tsx` (80)
- `src/components/budget/BudgetDataQualityTab.tsx` (78), `BudgetSummaryTab.tsx` (69)

Top REAL offenders (inline hex/rgb — Type B):
- `src/components/shared/Timeline/TimelineView.tsx` (125 hex + 16 rgb)
- `src/components/roadmap/RoadmapEngine.tsx` (90 rgb)
- `src/components/filters/CanonicalFilter.tsx` (132 — audit first)

CSS files (Type D): `src/index.css` (excluded from scanner), `CatyOverrides.css` (385), `r360-member.css` (334), `task10*.css` (~600 combined).

**False positives (DO NOT chase):** var()-fallback heavy files (BacklogPage.atlaskit.tsx, AllReleasesPage.tsx, admin/*), `src/theme/tokens.ts`, all `src/stories/**`.

---

## Agent 3 — UI/UX Critic
**Current codebase ADS compliance: ~2.5/10 (RED). Banned/allowed rules confirmed verbatim from CLAUDE.md.**

Rubric (0–10): Color tokens (0–3), Hand-rolled UI (0–3), Spacing grid (0–2), Dark mode (0–2).
Hand-rolled UI offenders (violate the ban): `CatalystTable`, `ForYouTable`, `AllProjectsTable`, `StatusRegistryTable`, `CatalystEnterpriseTable`, shadcn `ui/table.tsx`. Modals/dropdowns are correctly ADS-wrapped.
Acceptance: a surface is "ADS compliant" only when color ≥2/3, hand-rolled UI = 3/3, zero Tailwind color utils, zero bare hex/rgba/hsl outside fallbacks, dark-mode verified.

---

## Agent 4 — Integration / Enforcement Architect
**Enforcement exists but is loose.**
- `.husky/pre-commit` runs audit but always `exit 0` (informational).
- `ci.yml` runs `tsc --noEmit` (root config = **no-op bug**, should be `-p tsconfig.app.json`) + `npm run lint` — both `continue-on-error: true`.
- `design-system-audit.yml` + `design-compliance.yml` ARE blocking (threshold 600) but are separate workflows.
Recommended tightening order: fix tsc-in-CI → integrate audit into main CI → make pre-commit fail → lint `--max-warnings 0` → drop threshold 600→200→0.

---

## Agent 5 — Data / Safety Guard
**Migration risk: MEDIUM. Bulk hex→token is BLOCKED — do not self-invent mappings.**

DO-NOT-TOUCH protected colors:
- Status pill hexes — `src/components/catalyst-detail-views/shared/sections/statusPalette.ts` ~31–37 (`#94C748`, `#8FB8F6`, etc.). Jira-DOM-probed, test-locked. Replacing with `--ds-background-success-bold` (#1F845A) is documented WRONG.
- Jira-parity bypass hexes — `src/index.css` ~239–247 (`#f0f1f2`, `#ff991f`, `#dddee1`, `#858585`). No ADS match by design.
- Workstream colors — `src/constants/workstreamColors.ts` (already wrapped, PR286).
- AI signature magenta (`#EB2F96` / CatyPulseIcon), AIIntelligenceButton gradient — component-owned.
- Golden Hour palette (`#C69C6D` etc.) — BANNED, remove (never wrap).

Blocker doc: `features/CAT-ADS-TOKEN-PARITY-20260626-004/` — 265 unmapped hexes await Claude Design mappings.
Dark mode: `ThemeProvider.tsx` owns `.dark` on `<html>`; tokens in `index.css` `:root`/`.dark`; parity ramp in `src/styles/catalyst-ads-parity.css`.

---

## Agent 6 — Implementation Planner
**6 work streams. Recommended FIRST unblocked slice: ADS-13 Finding 3 (overlay-fallback standardization) OR CI enforcement wiring.**

Shipped: WIDE lane (#284), PR2–PR6 (#286), scanner hardening (#287), ADS-13 Finding 1 (#288).
Outstanding streams:
1. ADS-13 dark-chrome — Finding 3 (332 `var(--ds-surface-overlay,#…)` → `#282E33`), Finding 4 (hub-switcher nav-text specificity). **Unblocked.**
2. Bare-hex long-tail (574; 265 unmapped) — **BLOCKED on Claude Design.**
3. Tailwind color arbitraries (~200) — **BLOCKED on architecture decision.**
4. Dark-mode parity validation — needs browser.
5. CI enforcement wiring — **Unblocked, quick win (<1.5h).**
6. Hand-rolled UI replacement — future phase.

---

## Agent 7 — QA / Screenshot Validator
**Runnable validation suite confirmed.**
- `node scripts/no-hardcoded-colors.cjs` (exit 0 = pass)
- `npm run scan:ads-violations` (count delta = functional proof)
- `npx tsc -p tsconfig.app.json --noEmit` (~157 baseline errors; root `tsc --noEmit` is a no-op)
- `npm run lint`, `npm run test:visual` (Playwright, light+dark, 0.01 tol), `npm run test:a11y`
- vitest broken on Node 20 → verify via Chrome MCP DOM probes on localhost:8080.
Evidence = scanner BEFORE/AFTER delta + DOM probe (computed style resolves to `--ds-*`) + light/dark screenshots. Dark mode via hard reload, not runtime toggle.
