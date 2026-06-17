/**
 * mentionStyles — Atlassian inline-mention formatting contract.
 *
 * The mention chip must render as an inline Atlassian-style mention, NOT a
 * chunky full-pill lozenge:
 *   - small radius (3px), never a 9999px full pill
 *   - inline flow (no fixed 22px height, no inline-flex block on the chip)
 *   - other-user mentions use the ADS link colour, not a solid grey fill
 *   - self mentions keep the brand-bold blue + inverse text (already ADS)
 *
 * The descendant-flatten rules (which stop Atlaskit's nested span from
 * overflowing in read mode) must remain intact.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { injectMentionStyles, MENTION_STYLE_ID } from '../mentionStyles';

function injectedCss(): string {
  document.getElementById(MENTION_STYLE_ID)?.remove();
  injectMentionStyles();
  return document.getElementById(MENTION_STYLE_ID)?.textContent ?? '';
}

describe('mentionStyles — Atlassian inline mention contract', () => {
  beforeEach(() => {
    document.getElementById(MENTION_STYLE_ID)?.remove();
  });

  it('uses a 3px radius, never a full pill', () => {
    const css = injectedCss();
    expect(css).toContain('border-radius: 3px');
    expect(css).not.toContain('9999px');
  });

  it('renders inline, not a fixed-height inline-flex block', () => {
    const css = injectedCss();
    // The chip itself must not force a fixed height or flex box.
    expect(css).not.toContain('height: 22px');
    expect(css).not.toContain('display: inline-flex');
  });

  it('other-user mentions use the ADS link colour, not a solid grey fill', () => {
    const css = injectedCss();
    expect(css).toContain('--ds-link');
  });

  it('self mentions keep brand-bold blue + inverse text', () => {
    const css = injectedCss();
    expect(css).toContain('--ds-background-brand-bold');
    expect(css).toContain('--ds-text-inverse');
  });

  it('keeps the descendant-flatten rules intact (read-mode safety)', () => {
    const css = injectedCss();
    // Atlaskit's nested highlight span must still be collapsed to plain text.
    expect(css).toContain('background-color: transparent');
  });
});
