/**
 * Canonical Atlaskit token values + --cp-* bridge alias map — node-side
 * helpers for the token-resolution spec (CAT-DS-TOKEN-POISON-20260710-001).
 *
 * Expected values are derived AT RUNTIME from the installed @atlaskit/tokens
 * artifacts (tokens-raw per theme) — never hand-typed hex — so the harness
 * follows Atlaskit upgrades automatically.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const req = createRequire(import.meta.url);
const ARTIFACTS = '@atlaskit/tokens/dist/cjs/artifacts';

interface RawToken {
  cleanName: string;
  value: unknown;
  attributes?: { group?: string };
}

function loadRaw(rel: string): RawToken[] {
  const mod = req(`${ARTIFACTS}/${rel}`);
  return (mod.default ?? mod) as RawToken[];
}

export type CanonicalMap = Record<string, { light?: string; dark?: string }>;

/** cssVar (--ds-*) → canonical string value per color mode. */
export function buildCanonicalMap(): CanonicalMap {
  const tokenNames: Record<string, string> = req(`${ARTIFACTS}/token-names.js`).default;
  const map: CanonicalMap = {};

  const ingest = (tokens: RawToken[], modes: Array<'light' | 'dark'>) => {
    for (const t of tokens) {
      if (typeof t.value !== 'string') continue; // skip shadows (arrays) etc.
      const cssVar = tokenNames[t.cleanName];
      if (!cssVar) continue;
      map[cssVar] = map[cssVar] ?? {};
      for (const m of modes) map[cssVar][m] = t.value;
    }
  };

  ingest(loadRaw('tokens-raw/atlassian-light.js'), ['light']);
  ingest(loadRaw('tokens-raw/atlassian-dark.js'), ['dark']);
  // Mode-independent themes — same value in both modes.
  ingest(loadRaw('tokens-raw/atlassian-typography.js'), ['light', 'dark']);
  ingest(loadRaw('tokens-raw/atlassian-shape.js'), ['light', 'dark']);
  ingest(loadRaw('tokens-raw/atlassian-spacing.js'), ['light', 'dark']);
  return map;
}

export interface AliasMap {
  /** alias (--cp-* / --status-*) → mapped --ds-* var, :root block */
  base: Record<string, string>;
  /** dark-mode overrides (the 8 sanctioned mode-divergent aliases) */
  darkOverrides: Record<string, string>;
}

/**
 * Parse src/styles/catalyst-semantic-aliases.css — the single-owner one-way
 * --cp-*→--ds-* bridge — into alias→token maps for both modes.
 */
export function parseAliasMap(): AliasMap {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cssPath = path.resolve(here, '../../src/styles/catalyst-semantic-aliases.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Split at the dark-override block header.
  const darkStart = css.search(/\.dark\s*,\s*\n?\s*\[data-color-mode="dark"\]/);
  const rootPart = darkStart === -1 ? css : css.slice(0, darkStart);
  const darkPart = darkStart === -1 ? '' : css.slice(darkStart);

  const parse = (chunk: string): Record<string, string> => {
    const out: Record<string, string> = {};
    const re = /(--[a-z0-9-]+)\s*:\s*var\((--ds-[a-z0-9-]+)\)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chunk)) !== null) out[m[1]] = m[2];
    return out;
  };

  return { base: parse(rootPart), darkOverrides: parse(darkPart) };
}

export function aliasTarget(alias: string, mode: 'light' | 'dark', map: AliasMap): string | undefined {
  if (mode === 'dark' && map.darkOverrides[alias]) return map.darkOverrides[alias];
  return map.base[alias];
}

// ─── Color math (WCAG 2.1) ───────────────────────────────────────────────────

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  if (hex) {
    const h = hex[1];
    const exp = (c: string) => parseInt(c.length === 1 ? c + c : c, 16);
    if (h.length === 3 || h.length === 4) {
      return {
        r: exp(h[0]),
        g: exp(h[1]),
        b: exp(h[2]),
        a: h.length === 4 ? exp(h[3]) / 255 : 1,
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: exp(h.slice(0, 2)),
        g: exp(h.slice(2, 4)),
        b: exp(h.slice(4, 6)),
        a: h.length === 8 ? exp(h.slice(6, 8)) / 255 : 1,
      };
    }
    return null;
  }

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

/** Same color within 1/255 per channel and 0.02 alpha (serialization jitter). */
export function sameColor(a: string, b: string): boolean {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) return false;
  return (
    Math.abs(pa.r - pb.r) <= 1 &&
    Math.abs(pa.g - pb.g) <= 1 &&
    Math.abs(pa.b - pb.b) <= 1 &&
    Math.abs(pa.a - pb.a) <= 0.02
  );
}

export function compositeOver(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function channelLum(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(c: Rgba): number {
  return 0.2126 * channelLum(c.r) + 0.7152 * channelLum(c.g) + 0.0722 * channelLum(c.b);
}

/** WCAG contrast ratio; fg composited over bg first if translucent. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const solidFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
  const l1 = relativeLuminance(solidFg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
