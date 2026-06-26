# 03_PLAN_LOCK — ADS-13 dark-chrome patch (Slice 1: Finding 1 only)

Feature Work ID: CAT-ADS-TOKEN-PARITY-20260626-004
Date: 2026-06-27
Source spec: `~/Downloads/feature-branch/src/index.css-dark-chrome-ADS13.patch.md`
Status: **AWAITING REVIEW — no code until approved**

---

## OBJECTIVE
Remove the live footgun in `src/index.css`: the dark-mode rule
`html.dark, html[data-color-mode="dark"]` (opener at line 6088–6089) contains **two**
consecutive declaration groups. Group A (≈6092–6124) sets every surface/cp/bg token to a
self-referential white fallback `var(--ds-surface, #ffffff) !important`. Group B (≈6125–6165,
the 2026-06-24 ramp) overrides A by source order with the correct dark ramp (`#22272b` base,
`#282e33` raised/overlay, `#161a1d` sunken, `#1d2125` canvas). Delete Group A + its now-false
"single source of truth / uniform white tone" header comment so the only surviving block is the
correct Group B ramp.

**Done =** Group A and its stale comment removed; dark mode renders identically (it already uses
Group B); no other tier left depending on Group A; dark-sweep VR baselines unchanged; contrast-probe
clean in both themes.

## NON-SCOPE (explicitly excluded this slice)
- Finding 3 (standardize 332 overlay-fallback occurrences → `#282E33`) — separate slice, high blast radius.
- Finding 4 (buried nav-text scope/specificity) — separate slice, needs live DOM probe first.
- Any `.tsx`, markup, behavior, route, schema, spacing, or Tailwind change.
- No change to Group B values themselves.

## 2-HOUR TIMEBOX
Yes — single-file deletion of ~33 lines + 1 comment block. Well under 2h.

## SAFETY GATE (must re-verify on the work branch BEFORE editing)
Empirically confirmed on current tree: **A ⊆ B** — `comm -23` of var names set in Group A vs
Group B returned ZERO tokens unique to A. Therefore deleting A changes nothing at render time.
Re-run this exact check on the fresh branch (line numbers may shift) before deleting:
```
A=$(sed -n '<A-start>,<A-end>p' src/index.css | grep -oE '^\s*--[a-z0-9-]+' | tr -d ' ' | sort -u)
B=$(sed -n '<B-start>,<B-end>p' src/index.css | grep -oE '^\s*--[a-z0-9-]+' | tr -d ' ' | sort -u)
comm -23 <(echo "$A") <(echo "$B")   # MUST be empty
```
If non-empty → STOP, raise RED FLAG, do not delete.

## CANONICAL COMPONENTS / SCREENS
N/A — pure CSS token-block cleanup. No component selection.

## FILES TO MODIFY
- `src/index.css` (Group A block + stale header comment only)

## FILES FORBIDDEN
- Every other file. No `git add -A`. Stage `src/index.css` only.

## UI/UX RULES
- ADS tokens only (Group B already uses raw dark ramp values it owns; we are not adding hex).
- Overlay stays one tone lighter than surface (`#282e33` over `#22272b`) — preserved by keeping Group B.

## DATA/BACKEND / INTEGRATION RULES
None. Styling-only.

## BRANCHING
- Branch fresh off **`main`** (current local feature branch is stale/behind main after PR #286+#287).
- Branch name: `fix/dark-chrome-ads13`.
- Confirm `main`'s `index.css` dark block matches what was probed (PR #286/#287 did not touch it).

## VALIDATION COMMANDS
1. Re-run SAFETY GATE comm check → must be empty.
2. `node audit/contrast-probe.js` (or repo equivalent) — light + dark, before vs after = no regression.
3. Build: `npm run build` (or app build) → exit 0.
4. Dark-sweep visual-regression baselines (`audit/dark-sweep-2026-04-30/`) → no diff.
5. Browser (Chrome MCP) DOM probe: hub switcher elevation + canvas surfaces resolve to
   `#282e33` / `#22272b` / `#1d2125` in dark mode (unchanged from pre-patch).

## SCREENSHOT CHECKLIST (UI acceptance)
- Dark mode: hub switcher (overlay separates from base), page canvas, a raised panel, a sunken area.
- Before/after side-by-side must be visually identical.

## STOP CONDITIONS
- Safety-gate comm check non-empty → STOP + RED FLAG.
- Any VR baseline diff or contrast regression → STOP, do not patch over.
- Build non-zero → STOP.

## DRIFT / REBASELINE
If main's dark block differs from probed snapshot, re-probe and re-confirm A/B boundaries before editing.

## COMMIT GATE (per CLAUDE.md)
Session log written · raw validation output captured · screenshot acceptance · guardrails confirmed
(no banned colors added, no hand-rolled UI, no assumption defaults) · explicit file staging
(`git add src/index.css` only) · commit message approved.
