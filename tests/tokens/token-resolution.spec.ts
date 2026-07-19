/**
 * Rendered token-resolution harness — CAT-DS-TOKEN-POISON-20260710-001.
 *
 * Drives the standalone fixture app (scripts/token-fixtures) in BOTH color
 * modes and asserts, per data-token-role sample:
 *   • computed color/background-color/border-color equals the CANONICAL
 *     Atlaskit value for that theme (derived at runtime from
 *     @atlaskit/tokens tokens-raw artifacts — never hand-typed hex);
 *   • every --cp-* bridge alias resolves (non-empty) and equals its mapped
 *     --ds-* token's resolved value;
 *   • WCAG contrast ≥ 4.5 for text roles (≥ 3.0 large/bold; disabled exempt);
 *   • light and dark computed values DIFFER for theme-sensitive roles;
 *   • deliberately poisoned probes (self-referencing custom property +
 *     undefined token without fallback) render as inherited/initial — the
 *     harness's own self-test that these assertions can detect breakage.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  aliasTarget,
  buildCanonicalMap,
  compositeOver,
  contrastRatio,
  parseAliasMap,
  parseColor,
  sameColor,
  type Rgba,
} from './canonical';

const canonical = buildCanonicalMap();
const aliasMap = parseAliasMap();
const MODES = ['light', 'dark'] as const;
type Mode = (typeof MODES)[number];

interface SampleProbe {
  role: string;
  prop: string;
  cssVar: string;
  bgVar: string | null;
  minContrast: number | null;
  large: boolean;
  computed: string;
  textColor: string;
  varValue: string;
  /** background-color chain from the element upward until an opaque layer */
  bgChain: string[];
}

interface ModeData {
  samples: SampleProbe[];
  aliasValues: Record<string, { alias: string; ds: string }>;
}

const cache = new Map<Mode, ModeData>();

async function collect(page: Page, mode: Mode): Promise<ModeData> {
  const cached = cache.get(mode);
  if (cached) return cached;

  await page.goto(`/?mode=${mode}`);
  await page.waitForSelector('#root[data-tokens-ready="true"]', { timeout: 30_000 });

  const samples = await page.evaluate((): SampleProbe[] => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-token-role]'));
    return els.map((el) => {
      const cs = getComputedStyle(el);
      const prop = el.dataset.prop ?? '';
      let computed = '';
      if (prop === 'color') computed = cs.color;
      else if (prop === 'background-color') computed = cs.backgroundColor;
      else if (prop === 'border-color') computed = cs.borderTopColor;
      else if (prop === 'font-family') computed = cs.fontFamily;

      const bgChain: string[] = [];
      let node: HTMLElement | null = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        bgChain.push(bg);
        // stop once an opaque layer is reached
        const m = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(bg);
        const alpha = m ? (m[1] === undefined ? 1 : Number(m[1])) : 0;
        if (alpha >= 1) break;
        node = node.parentElement;
      }

      const cssVar = el.dataset.var ?? '';
      return {
        role: el.dataset.tokenRole ?? '',
        prop,
        cssVar,
        bgVar: el.dataset.bgVar ?? null,
        minContrast: el.dataset.minContrast !== undefined ? Number(el.dataset.minContrast) : null,
        large: el.dataset.large === 'true',
        computed,
        textColor: cs.color,
        varValue: cssVar ? cs.getPropertyValue(cssVar).trim() : '',
        bgChain,
      };
    });
  });

  const aliasNames = Object.entries(aliasMap.base).map(([alias]) => ({
    alias,
    ds: aliasTarget(alias, mode, aliasMap) as string,
  }));
  const aliasValues = await page.evaluate((pairs) => {
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, { alias: string; ds: string }> = {};
    for (const p of pairs) {
      out[p.alias] = {
        alias: cs.getPropertyValue(p.alias).trim(),
        ds: cs.getPropertyValue(p.ds).trim(),
      };
    }
    return out;
  }, aliasNames);

  const data = { samples, aliasValues };
  cache.set(mode, data);
  return data;
}

/** Composite the element's background chain (translucent layers over opaque base). */
function effectiveBackground(chain: string[]): Rgba | null {
  const parsed = chain.map(parseColor);
  if (parsed.some((c) => c === null)) return null;
  const layers = parsed as Rgba[];
  let acc = layers[layers.length - 1];
  for (let i = layers.length - 2; i >= 0; i--) acc = compositeOver(layers[i], acc);
  return acc;
}

function resolveDsVar(cssVar: string, mode: Mode): string | undefined {
  return cssVar.startsWith('--ds-') ? cssVar : aliasTarget(cssVar, mode, aliasMap);
}

function firstFamily(fontList: string): string {
  return fontList.split(',')[0].replace(/["']/g, '').trim();
}

// NOTE: not `serial` — serial mode skips remaining tests after a failure, and
// this harness must always report EVERY failure. workers=1 (config) keeps the
// per-mode probe cache effective; on a failure Playwright restarts the worker
// and later tests simply re-collect (cheap).

for (const mode of MODES) {
  test(`${mode}: computed styles match canonical Atlaskit values + contrast`, async ({ page }) => {
    const { samples } = await collect(page, mode);
    const real = samples.filter((s) => !s.role.startsWith('poison-'));
    expect(real.length).toBeGreaterThanOrEqual(36);

    let valueAssertions = 0;
    let contrastAssertions = 0;

    for (const s of real) {
      const dsVar = resolveDsVar(s.cssVar, mode);
      expect
        .soft(dsVar, `${mode}/${s.role}: no --ds-* mapping found for ${s.cssVar}`)
        .toBeTruthy();
      if (!dsVar) continue;

      const expected = canonical[dsVar]?.[mode];

      if (s.prop === 'font-family') {
        valueAssertions += 2;
        expect
          .soft(s.varValue, `${mode}/${s.role}: ${dsVar} did not resolve (empty custom property)`)
          .not.toBe('');
        if (expected) {
          const fam = firstFamily(expected);
          expect
            .soft(
              s.computed.replace(/["']/g, ''),
              `${mode}/${s.role}: computed font-family missing canonical first family "${fam}" (computed="${s.computed}")`,
            )
            .toContain(fam);
        }
      } else {
        valueAssertions += 2;
        expect
          .soft(expected, `${mode}/${s.role}: no canonical Atlaskit value for ${dsVar}`)
          .toBeTruthy();
        if (expected) {
          expect
            .soft(
              sameColor(s.computed, expected),
              `${mode}/${s.role}: computed ${s.prop}=${s.computed} !== canonical ${dsVar}=${expected}`,
            )
            .toBe(true);
        }
      }

      // Contrast — text roles only; minContrast 0 = exempt (disabled).
      if (s.minContrast && s.minContrast > 0) {
        const fg = parseColor(s.textColor);
        const bg = effectiveBackground(s.bgChain);
        contrastAssertions += 1;
        if (fg && bg) {
          const ratio = contrastRatio(fg, bg);
          const min = s.large ? 3.0 : s.minContrast;
          expect
            .soft(
              ratio,
              `${mode}/${s.role}: contrast ${ratio.toFixed(2)} < ${min} (fg=${s.textColor}, bg composited)`,
            )
            .toBeGreaterThanOrEqual(min);
        } else {
          expect.soft(false, `${mode}/${s.role}: could not parse colors for contrast`).toBe(true);
        }
      }
    }

    console.log(
      `[token-harness] mode=${mode} samples=${real.length} value-assertions=${valueAssertions} contrast-assertions=${contrastAssertions}`,
    );
  });

  test(`${mode}: every --cp-* bridge alias resolves and equals its --ds-* token`, async ({ page }) => {
    const { aliasValues } = await collect(page, mode);
    let n = 0;
    for (const [alias, dsVar] of Object.entries(aliasMap.base)) {
      const target = aliasTarget(alias, mode, aliasMap) as string;
      const v = aliasValues[alias];
      n += 2;
      expect
        .soft(v.alias, `${mode}/${alias}: alias resolved to EMPTY (mapped ${target} undefined?)`)
        .not.toBe('');
      expect
        .soft(v.ds, `${mode}/${alias}: mapped token ${target} resolved to EMPTY`)
        .not.toBe('');
      const equal =
        v.alias === v.ds || (parseColor(v.alias) !== null && sameColor(v.alias, v.ds));
      expect
        .soft(
          equal,
          `${mode}/${alias}: alias value "${v.alias}" !== mapped ${target} value "${v.ds}"`,
        )
        .toBe(true);
      n += 1;
      void dsVar;
    }
    console.log(`[token-harness] mode=${mode} alias-assertions=${n} aliases=${Object.keys(aliasMap.base).length}`);
  });

  test(`${mode}: poisoned probes render as inherited/initial (harness self-test)`, async ({ page }) => {
    const { samples } = await collect(page, mode);
    const byRole = Object.fromEntries(samples.map((s) => [s.role, s]));

    // 1. Self-referencing custom property → invalid at computed-value time →
    //    color falls back to the inherited (parent) value.
    const cycle = byRole['poison-cycle'];
    const parent = byRole['poison-parent'];
    expect(cycle, 'poison-cycle probe missing from DOM').toBeTruthy();
    expect(parent, 'poison-parent probe missing from DOM').toBeTruthy();
    expect(
      sameColor(cycle.textColor, parent.textColor),
      `poison-cycle color ${cycle.textColor} should equal inherited parent color ${parent.textColor}`,
    ).toBe(true);
    // Proof the canonical comparison would flag it: it does NOT equal --ds-text.
    const dsText = canonical['--ds-text']?.[mode] as string;
    expect(
      sameColor(cycle.textColor, dsText),
      `poison-cycle unexpectedly resolved to canonical --ds-text (${dsText}) — poison not detectable`,
    ).toBe(false);

    // 2. Undefined token without fallback → background-color = initial (transparent).
    // bgChain[0] is the probe's own computed background-color (collected while
    // the fixture page was live — do not re-query the page here; the probe
    // data may come from the per-mode cache without a fresh navigation).
    const undef = byRole['poison-undefined'];
    expect(undef, 'poison-undefined probe missing from DOM').toBeTruthy();
    const ownBg = undef.bgChain[0];
    const parsedOwn = parseColor(ownBg);
    expect(parsedOwn, 'could not parse poison-undefined background').toBeTruthy();
    expect(
      parsedOwn!.a,
      `poison-undefined background should be transparent (initial), got ${ownBg}`,
    ).toBe(0);
    const dsSurface = canonical['--ds-surface']?.[mode] as string;
    expect(
      sameColor(ownBg, dsSurface),
      `poison-undefined unexpectedly matches canonical --ds-surface (${dsSurface})`,
    ).toBe(false);
    console.log(`[token-harness] mode=${mode} poison-assertions=6`);
  });
}

test('light and dark computed values DIFFER for theme-sensitive roles', async ({ page }) => {
  const light = await collect(page, 'light');
  const dark = await collect(page, 'dark');
  const lightByRole = Object.fromEntries(light.samples.map((s) => [s.role, s]));
  let n = 0;

  for (const s of dark.samples) {
    if (s.role.startsWith('poison-') || s.prop === 'font-family') continue;
    const l = lightByRole[s.role];
    if (!l) continue;
    const dsLight = resolveDsVar(l.cssVar, 'light');
    const dsDark = resolveDsVar(s.cssVar, 'dark');
    if (!dsLight || !dsDark) continue;
    const expL = canonical[dsLight]?.light;
    const expD = canonical[dsDark]?.dark;
    // Only roles the canonical artifacts say are theme-sensitive.
    if (!expL || !expD || expL === expD) continue;
    n += 1;
    expect
      .soft(
        !sameColor(l.computed, s.computed),
        `${s.role}: light and dark computed values are IDENTICAL (${l.computed}) — dark resolution did not happen`,
      )
      .toBe(true);
  }
  expect(n, 'expected a meaningful number of theme-sensitive roles').toBeGreaterThanOrEqual(25);
  console.log(`[token-harness] differ-assertions=${n}`);
});
