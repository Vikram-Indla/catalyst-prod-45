import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');

// 2026-06-18 — Translate affordance adopts the canonical AI-CTA mark.
// Every title-translate surface must (a) drop the legacy idle glyph
// (🌐 emoji in the backlog cell, blue var(--ds-link) "C"-square in the drawer
// chips), (b) render CatyPulseIcon as the idle + in-progress mark, and
// (c) stop importing @atlaskit/spinner — the translating state is the
// pulsing CatyPulseIcon (Option A), not a spinner.
const surfaces: Array<{ path: string; bannedGlyph: RegExp; label: string }> = [
  {
    path: 'src/components/shared/title-translate/BizArabicTranslateLink.tsx',
    bannedGlyph: /🌐/,
    label: 'backlog cell',
  },
  {
    path: 'src/components/shared/title-translate/DescriptionTranslateBar.tsx',
    bannedGlyph: /var(--ds-link)/,
    label: 'drawer description chip',
  },
  {
    path: 'src/components/shared/title-translate/TitleTranslateWrapper.tsx',
    bannedGlyph: /var(--ds-link)/,
    label: 'drawer title chip',
  },
];

describe('title-translate — CatyPulseIcon AI-CTA mark (2026-06-18)', () => {
  describe.each(surfaces)('$label', ({ path, bannedGlyph }) => {
    const src = readFileSync(resolve(repoRoot, path), 'utf8');

    it('drops the legacy idle glyph', () => {
      expect(src).not.toMatch(bannedGlyph);
    });

    it('imports CatyPulseIcon', () => {
      expect(src).toMatch(/CatyPulseIcon/);
    });

    it('no longer imports @atlaskit/spinner', () => {
      expect(src).not.toMatch(/@atlaskit\/spinner/i);
    });
  });
});
