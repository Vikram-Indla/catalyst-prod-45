# 01 — OBJECTIVE

## Goal
ADS token parity for Catalyst, styling-only. Every color resolves through `--ds-*`
so light + dark render correctly via ADS, with original hex preserved as
`var(--ds-token, #hex)` fallback (light byte-identical, dark/theming flows through token).

## Definition of done (per lane)
1. **WIDE lane** — authoritative `--ds-*` theme (`catalyst-ads-parity.css`) + chart
   tokens imported LAST in `src/main.tsx`; workstream colors consolidated. → **DONE (#284)**.
2. **SWEEP lane (PR2–PR6)** — every map-named still-bare hex wrapped to `var(--ds-*, #hex)`;
   build green; zero non-styling change. → **DONE (#286)**.
3. **Scanner** — `no-hardcoded-colors.js` runnable (repo is `type:module` → `.cjs`),
   allowlist `token('…',#hex)` and `var(--…,#hex)` → reported count 3789 → ~574 true bare-hex.
   → **DONE (#287)**.
4. **ADS-13 dark-chrome** — remove the white-fallback footgun + dead block (Finding 1),
   standardize overlay fallbacks (Finding 3), fix dark-text scope leak (Finding 4).
   → **IN PROGRESS** — Finding 1 applied on `fix/dark-chrome-ads13`; 3 & 4 deferred to own slices.
5. **PR7–PR9 long-tail** — wrap remaining offenders once Claude Design supplies mappings.
   → **BLOCKED** (265 unmapped hexes; self-inventing mappings is forbidden).

## Hard constraints
- Styling only. No `.tsx` behavior, route, schema, query, RPC, copy, layout, spacing change.
- No new colors; no new CSS vars outside the provided parity/chart files.
- Wrap pattern exactly `'#HEX'` → `'var(--ds-token, #HEX)'`; never remove the hex fallback;
  never wrap a hex already inside `token('…', #hex)` (already ADS-compliant).
- Explicit file staging only — never `git add -A`.

## Leave-as-is (verified, do not touch)
`statusPalette.ts:33` periwinkle `#8FB8F6`; editor color-picker swatches
(`BackgroundPickerItem.tsx`, `SlashMenu.tsx`); `IdeationBoardView.tsx` (already theme-branched);
`*.test.ts` / `*.stories.tsx` fixtures.
