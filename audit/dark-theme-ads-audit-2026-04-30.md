# Dark-Theme ADS Compliance Audit — 2026-04-30

**Scope:** Whole `src/` tree (excluding `_graveyard/`, tests, stories, generated `tailwind.config.lov.json`).
**Standard:** Dark Mode 6 Hard Rules + ADS-only token policy (`mem://constraints/dark-mode-6-hard-rules`, `mem://constraints/nocturne-banned`).
**Method:** Static source scan + live browser visual confirmation (dark mode active in shell). Live JS contrast probe was not executable from this tool surface (no `page.evaluate`); last clean live baseline = `2026-04-29-dark.json` (6 routes, `failingCount === 0`).

---

## Verdict

| Rule | Status | Findings |
|---|---|---|
| 1. No hardcoded hex | ❌ FAIL | 21,746 raw hex literals across `src/` (excluding tokens & generated files) |
| 2. Never write `<html data-theme>` | ✅ PASS | Zero `setAttribute('data-theme', ...)` writes; only read-only observers |
| 3. `!important` light hex must have paired `.dark` override | ❌ FAIL | 10 files with `!important` hex and **zero** `.dark` selectors in the same file |
| 4. Word "NOCTURNE" banned | ✅ PASS | Zero occurrences in `src/` |
| 5. `audit/contrast-probe.js` clean in both modes | ⚠️ STALE | Last clean run 2026-04-29 (6 routes). Today's probe blocked by tool limitation — needs Playwright re-run |
| 6. Pattern-first grep before single-file edits | ✅ N/A | (process rule, not measurable from code) |

**Bonus check — `react-select` direct imports:** ✅ PASS — every consumer goes through `@atlaskit/select`.

---

## Critical findings (ranked by blast radius)

### 🔴 P0 — Top 5 hex-leak hot spots (no `.dark` pairing)

These files emit absolute light hex with `!important` but have **no companion `.dark` override**, so any dark-mode contrast failure on these surfaces is unrecoverable without editing:

| # | File | `!important` hex count |
|---|---|---|
| 1 | `src/components/shared/JiraTable/JiraTable.tsx` | 10 |
| 2 | `src/components/caty-ai/CatyWidget.css` | 10 |
| 3 | `src/modules/task10/styles/task10-detail.css` | 9 |
| 4 | `src/modules/task10/styles/task10-v2.css` | 6 |
| 5 | `src/pages/testhub/TestHubDashboardPage.tsx` | 2 |

Plus 5 more with 1–2 each (full list in scan output).

### 🟠 P1 — Highest-density hex files (raw, non-`!important`)

These are the largest token-leak surfaces. Many do have paired `.dark` blocks (~2,441 hex-in-`.dark` matches across `src/styles/` + `src/index.css`), so they may be visually clean — but every literal here is still a Rule 1 violation and a future-bug landmine:

| File | Hex count |
|---|---|
| `src/index.css` | 864 |
| `src/modules/task10/styles/task10.css` | 271 |
| `src/components/caty-ai/CatyOverrides.css` | 265 |
| `src/components/resource360/r360-member.css` | 254 |
| `src/modules/task10/styles/task10-detail.css` | 250 |
| `src/styles/allwork.css` | 199 |
| `src/styles/testhub.css` | 197 |
| `src/pages/releases/AllReleasesPage.tsx` | 191 |
| `src/styles/r360.css` | 178 |
| `src/lib/workstream-colors.ts` | 177 |

### 🟠 P1 — `!important` hex hot-spots (paired or unpaired)

| File | `!important` hex count |
|---|---|
| `src/components/caty-ai/CatyOverrides.css` | 373 |
| `src/modules/task10/styles/task10.css` | 264 |
| `src/components/resource360/r360-member.css` | 252 |
| `src/components/capacity-planner/capacity-planner-gantt.css` | 103 |
| `src/index.css` | 94 |
| `src/modules/planner/styles/timeline-enterprise.css` | 80 |
| `src/styles/goals-dark.css` | 60 |
| `src/styles/r360.css` | 56 |
| `src/styles/users-module.css` | 31 |
| `src/styles/strategy-intel-dark.css` | 21 |

### 🟢 P2 — Specific in-component leaks already paired

`src/pages/admin/components/UserDrawer.tsx` ships ~15 `!important` dark hex (`#1A1A1A`, `#2E2E2E`, `#EDEDED`, …). These read like a private NOCTURNE-style palette inlined as a JSX `<style>` block — the word isn't used (Rule 4 OK) but the values are exactly the banned palette. Recommend porting to `--ds-*` tokens.

### ⚠️ Functional regression observed in dark mode

`/for-you` rendered blank below the top nav on this run (1536×864, dark). Top shell, search, +Create button and avatar all render with correct ADS contrast. This matches the unresolved blank-page issue from earlier in this thread — it is a JS/data issue, not a theming defect, but it blocked per-route contrast-probe execution today.

---

## Recommended next loops

1. **P0 — Pair the 10 unpaired `!important` files.** Either add `.dark` overrides or replace with `token('color.x', '#fallback')`. Smallest blast radius, highest ROI. ETA ~1 hour.
2. **P0 — Port `UserDrawer.tsx` inline styles to `--ds-*` tokens.** Single-file fix, removes a private dark palette.
3. **P1 — Token-migrate `caty-ai` (`CatyOverrides.css` + `CatyWidget.css`).** Largest single-module hex surface; likely shared widget appears across many pages.
4. **P1 — Token-migrate `task10` styles (3 files, 526 hex literals).** Self-contained module, safe to refactor in isolation.
5. **P1 — Token-migrate `r360` (`r360-member.css` + `r360.css`).** Spec already requires V12 precision tokens (`mem://features/resource360/v12-precision-spec-updated`).
6. **Re-run live probe.** Once `/for-you` blank-page bug is fixed, run `audit/contrast-probe.js` across the 6 baseline routes in dark mode and refresh `audit/baselines/2026-04-30-dark.json`. Probe needs Playwright (or Lovable browser tool with JS-eval support) — not currently available from this loop.

---

## What this audit did NOT catch

Per the probe's own caveats and our 2026-04-28 lessons:
- **Hydration flash** between SSR/CSR theme — needs visual capture mid-render, not steady-state.
- **Atlaskit primitive parity** (Lozenge typography, etc.) — needs DOM inspection, not contrast math.
- **Cross-system data divergence** — out of scope (sync deliberately parked).
- **Unreachable per-type views** in `/allwork` — see project-knowledge entry on Epic/Feature/Task being filtered out.
