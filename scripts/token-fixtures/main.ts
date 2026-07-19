/**
 * Token-resolution fixture app — CAT-DS-TOKEN-POISON-20260710-001.
 *
 * Standalone Vite entry (root = scripts/token-fixtures) that reproduces the
 * EXACT token boot contract of the real app (src/main.tsx +
 * src/providers/ThemeProvider.tsx) with zero app-route dependencies, then
 * renders a token matrix DOM for Playwright computed-style assertions.
 *
 * Contract mirrored from the app:
 *   1. Same stylesheets, same order: index.css → catalyst-semantic-aliases.css
 *      → catalyst-theme.css → jira-parity-overrides.css → catalyst-ads-parity.css
 *   2. setGlobalTheme({ colorMode, light:'light', dark:'dark',
 *      spacing:'spacing', typography:'typography', shape:'shape' })
 *   3. `.dark` class + data-color-mode on <html> (ThemeProvider.applyTheme).
 *      NOTE: the fixture deliberately does NOT clobber data-theme with
 *      'light'/'dark' the way ThemeProvider.applyTheme does — Atlaskit owns
 *      data-theme ("light:light dark:dark …") and exact-clobbering it kills
 *      every --ds-* token. The fixture asserts the steady state where
 *      Atlaskit's attribute won.
 *
 * Mode switch: ?mode=light | ?mode=dark (default light).
 */
import { setGlobalTheme } from '@atlaskit/tokens';

// Same order as src/main.tsx — do not reorder.
import '../../src/index.css';
import '../../src/styles/catalyst-semantic-aliases.css';
import '../../src/styles/catalyst-theme.css';
import '../../src/tokens/jira-parity-overrides.css';
import '../../src/styles/catalyst-ads-parity.css';

type ColorMode = 'light' | 'dark';

interface Sample {
  role: string;
  /** CSS property under assertion */
  prop: 'color' | 'background-color' | 'border-color' | 'font-family';
  /** custom property driving that prop (--ds-* or --cp-* bridge alias) */
  cssVar: string;
  /** custom property behind the sample (own background), for contrast */
  bgVar?: string;
  /** WCAG minimum contrast ratio; 0 = exempt (e.g. disabled text) */
  minContrast?: number;
  /** large/bold text ⇒ 3.0 threshold */
  large?: boolean;
  label?: string;
  extraStyle?: string;
}

const SURFACE = '--ds-surface';

const SAMPLES: Sample[] = [
  // ── Text roles ────────────────────────────────────────────────────────────
  { role: 'text-primary',  prop: 'color', cssVar: '--ds-text',          bgVar: SURFACE, minContrast: 4.5 },
  { role: 'text-subtle',   prop: 'color', cssVar: '--ds-text-subtle',   bgVar: SURFACE, minContrast: 4.5 },
  { role: 'text-subtlest', prop: 'color', cssVar: '--ds-text-subtlest', bgVar: SURFACE, minContrast: 4.5 },
  { role: 'text-disabled', prop: 'color', cssVar: '--ds-text-disabled', bgVar: SURFACE, minContrast: 0 },
  { role: 'text-inverse',  prop: 'color', cssVar: '--ds-text-inverse',  bgVar: '--ds-background-brand-bold', minContrast: 4.5 },
  { role: 'text-danger',   prop: 'color', cssVar: '--ds-text-danger',   bgVar: '--ds-background-danger',  minContrast: 4.5 },
  { role: 'text-warning',  prop: 'color', cssVar: '--ds-text-warning',  bgVar: '--ds-background-warning', minContrast: 4.5 },
  { role: 'text-success',  prop: 'color', cssVar: '--ds-text-success',  bgVar: '--ds-background-success', minContrast: 4.5 },
  { role: 'text-link',     prop: 'color', cssVar: '--ds-link',          bgVar: SURFACE, minContrast: 4.5 },

  // ── Surfaces ──────────────────────────────────────────────────────────────
  { role: 'surface-default', prop: 'background-color', cssVar: '--ds-surface' },
  { role: 'surface-raised',  prop: 'background-color', cssVar: '--ds-surface-raised' },
  { role: 'surface-overlay', prop: 'background-color', cssVar: '--ds-surface-overlay' },
  { role: 'surface-sunken',  prop: 'background-color', cssVar: '--ds-surface-sunken' },

  // ── Borders (ADS has no border.subtle; input is the 4th canonical) ───────
  { role: 'border-default', prop: 'border-color', cssVar: '--ds-border' },
  { role: 'border-bold',    prop: 'border-color', cssVar: '--ds-border-bold' },
  { role: 'border-focused', prop: 'border-color', cssVar: '--ds-border-focused' },
  { role: 'border-input',   prop: 'border-color', cssVar: '--ds-border-input' },

  // ── Interaction backgrounds ───────────────────────────────────────────────
  { role: 'bg-neutral',         prop: 'background-color', cssVar: '--ds-background-neutral' },
  { role: 'bg-selected',        prop: 'background-color', cssVar: '--ds-background-selected' },
  { role: 'bg-neutral-hovered', prop: 'background-color', cssVar: '--ds-background-neutral-hovered' },
  { role: 'bg-neutral-pressed', prop: 'background-color', cssVar: '--ds-background-neutral-pressed' },

  // ── Lozenge bridge aliases (--cp-*) — resolved via the one-way bridge ────
  { role: 'lozenge-grey-bg',    prop: 'background-color', cssVar: '--cp-lz-gy-bg' },
  { role: 'lozenge-grey-text',  prop: 'color', cssVar: '--cp-lz-gy-t', bgVar: '--cp-lz-gy-bg', minContrast: 4.5 },
  { role: 'lozenge-blue-bg',    prop: 'background-color', cssVar: '--cp-lz-bl-bg' },
  { role: 'lozenge-blue-text',  prop: 'color', cssVar: '--cp-lz-bl-t', bgVar: '--cp-lz-bl-bg', minContrast: 4.5 },
  { role: 'lozenge-green-bg',   prop: 'background-color', cssVar: '--cp-lz-gn-bg' },
  { role: 'lozenge-green-text', prop: 'color', cssVar: '--cp-lz-gn-t', bgVar: '--cp-lz-gn-bg', minContrast: 4.5 },

  // ── Chart categorical swatches ────────────────────────────────────────────
  ...Array.from({ length: 8 }, (_, i) => ({
    role: `chart-categorical-${i + 1}`,
    prop: 'background-color' as const,
    cssVar: `--ds-chart-categorical-${i + 1}`,
  })),

  // ── Typography ────────────────────────────────────────────────────────────
  { role: 'type-body',    prop: 'font-family', cssVar: '--ds-font-family-body',
    bgVar: SURFACE, minContrast: 4.5, label: 'Body sample — the quick brown fox',
    extraStyle: 'color: var(--ds-text); font-size: 14px;' },
  { role: 'type-heading', prop: 'font-family', cssVar: '--ds-font-family-heading',
    bgVar: SURFACE, minContrast: 3, large: true, label: 'Heading sample',
    extraStyle: 'color: var(--ds-text); font-size: 24px; font-weight: 653;' },
  { role: 'type-metric',  prop: 'font-family', cssVar: '--ds-font-family-code',
    bgVar: SURFACE, minContrast: 3, large: true, label: '42,317',
    extraStyle: 'color: var(--ds-text-subtle); font-size: 32px; font-weight: 700;' },
];

function resolveMode(): ColorMode {
  return new URLSearchParams(window.location.search).get('mode') === 'dark' ? 'dark' : 'light';
}

function renderMatrix(root: HTMLElement, mode: ColorMode): void {
  const page = document.createElement('div');
  page.id = 'token-matrix';
  page.setAttribute('data-mode', mode);
  page.setAttribute(
    'style',
    'min-height: 100vh; padding: 24px; background-color: var(--ds-surface); ' +
      'color: var(--ds-text); font-family: var(--ds-font-family-body); font-size: 14px;',
  );

  for (const s of SAMPLES) {
    const el = document.createElement('div');
    el.setAttribute('data-token-role', s.role);
    el.setAttribute('data-prop', s.prop);
    el.setAttribute('data-var', s.cssVar);
    if (s.bgVar) el.setAttribute('data-bg-var', s.bgVar);
    if (s.minContrast !== undefined) el.setAttribute('data-min-contrast', String(s.minContrast));
    if (s.large) el.setAttribute('data-large', 'true');

    let style = 'display: inline-block; margin: 4px 8px 4px 0; padding: 6px 10px;';
    switch (s.prop) {
      case 'color':
        style += `color: var(${s.cssVar});`;
        if (s.bgVar) style += `background-color: var(${s.bgVar});`;
        break;
      case 'background-color':
        style += `background-color: var(${s.cssVar}); min-width: 120px; min-height: 24px;`;
        break;
      case 'border-color':
        style += `border: 3px solid var(${s.cssVar}); background-color: var(--ds-surface);`;
        break;
      case 'font-family':
        style += `font-family: var(${s.cssVar});`;
        if (s.bgVar) style += `background-color: var(${s.bgVar});`;
        break;
    }
    if (s.extraStyle) style += s.extraStyle;
    el.setAttribute('style', style);
    el.textContent = s.label ?? s.role;
    page.appendChild(el);
  }

  // ── Poison probes — harness self-test ──────────────────────────────────────
  // 1. Self-referencing custom property (cycle → invalid at computed-value
  //    time → `color` falls back to the INHERITED value, i.e. the parent's).
  const poisonParent = document.createElement('div');
  poisonParent.setAttribute('data-token-role', 'poison-parent');
  poisonParent.setAttribute('style', 'color: var(--ds-text-danger); padding: 6px 10px;');
  const poisonCycle = document.createElement('span');
  poisonCycle.setAttribute('data-token-role', 'poison-cycle');
  poisonCycle.setAttribute(
    'style',
    '--poison-cycle: var(--poison-cycle); color: var(--poison-cycle);',
  );
  poisonCycle.textContent = 'poisoned: self-referencing custom property';
  poisonParent.appendChild(poisonCycle);
  page.appendChild(poisonParent);

  // 2. Undefined token WITHOUT fallback (invalid at computed-value time →
  //    background-color resolves to its initial value: transparent).
  const poisonUndefined = document.createElement('div');
  poisonUndefined.setAttribute('data-token-role', 'poison-undefined');
  poisonUndefined.setAttribute(
    'style',
    'background-color: var(--totally-undefined-token-xyz); padding: 6px 10px;',
  );
  poisonUndefined.textContent = 'poisoned: undefined token, no fallback';
  page.appendChild(poisonUndefined);

  root.appendChild(page);
}

async function boot(): Promise<void> {
  const mode = resolveMode();
  const de = document.documentElement;

  // ThemeProvider.applyTheme contract (class + data-color-mode). data-theme is
  // left to Atlaskit — see file header.
  de.classList.toggle('dark', mode === 'dark');
  de.setAttribute('data-color-mode', mode);

  // Exact setGlobalTheme call from src/main.tsx.
  await setGlobalTheme({
    colorMode: mode,
    light: 'light',
    dark: 'dark',
    spacing: 'spacing',
    typography: 'typography',
    shape: 'shape',
  });

  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');
  renderMatrix(root, mode);

  // Signal to Playwright that theme CSS is injected and the matrix is live.
  root.setAttribute('data-tokens-ready', 'true');
}

void boot();
