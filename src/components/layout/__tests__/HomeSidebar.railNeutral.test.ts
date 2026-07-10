/**
 * Collapsed Home-rail color lock.
 *
 * 2026-06-18 — Vikram flagged the collapsed left rail as a rainbow (10 hub
 * accent colors at once) — consumer, not enterprise. Decision: the persistent
 * rail is monochrome; color is reserved for the ACTIVE hub (brand-blue pill +
 * left bar).
 *
 * Updated 2026-07-09: the original version of this test read raw hex values
 * out of the hub `*-outline.svg` asset files and required them to contain
 * only the neutral ink literal. That assumed the SVGs were rendered directly
 * (e.g. via <img src>), so their baked-in fill color would show on screen.
 * The actual rendering technique (HomeSidebar.tsx collapsed hub icon,
 * `maskUrl` / `WebkitMaskImage` / `maskImage`) uses the SVGs purely as CSS
 * masks — only the shape/alpha channel is used, and the visible color comes
 * from `backgroundColor`, which defaults to the neutral token
 * `var(--ds-icon)` and only switches to the brand token for the active hub.
 * The SVG files' own fill hex is therefore inert for rendering purposes and
 * is no longer a valid signal for the "rail rainbow" regression this test
 * guards against — it is now asserted against the actual mask + token logic.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(__dirname, '../HomeSidebar.tsx'), 'utf8');

// Isolate the collapsed hub-icon renderer block so assertions stay scoped
// to the rail, not to unrelated parts of the file.
const iconFnStart = SRC.indexOf('icon: ({ style }');
const railBlock = SRC.slice(iconFnStart, SRC.indexOf('}));', iconFnStart));

describe('collapsed Home rail is monochrome (neutral ink only)', () => {
  it('uses a CSS mask (not a raw <img>) so the outline SVG only contributes shape, never its own color', () => {
    expect(iconFnStart).toBeGreaterThan(-1);
    expect(railBlock).toMatch(/(WebkitMaskImage|maskImage):\s*maskUrl/);
    expect(railBlock).not.toMatch(/<img\b/);
  });

  it('defaults the visible hub-icon color to the neutral ink token, not a per-hub accent', () => {
    expect(railBlock).toMatch(/backgroundColor:\s*style\?\.color\s*\?\?\s*'var\(--ds-icon\)'/);
  });

  it('only ever switches away from neutral via the shared active-route color signal, never a hardcoded accent', () => {
    // The only non-neutral color driving this block is `style?.color`, which
    // SidebarBase sets to var(--ds-icon-brand) exclusively on the active
    // route (see HomeSidebar.iconNeutral.test.ts docblock). No hex or
    // per-hub literal should feed this block directly.
    expect(railBlock).not.toMatch(/#[0-9A-Fa-f]{3,6}\b/);
  });
});
