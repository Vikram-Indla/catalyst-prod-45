/**
 * HubIcon — bespoke 24x24 SVGs in Atlaskit visual language.
 *
 * Council pass criteria (2026-05-08):
 *   - 11 hub keys map to 11 distinct SVG glyphs
 *   - Every glyph renders at viewBox "0 0 24 24"
 *   - Every glyph uses 1.5px stroke, square linecap, round linejoin
 *     (Atlaskit canonical — established in src/components/navigation/
 *     HubIcon docstring 2026-04-22)
 *   - Color routes through `tone` prop using ADS --ds-text-accent-* tokens
 *     so the icon picks up the same hue as its tile
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HubIcon, type HubName } from '../HubIcon';

const ALL_HUBS: HubName[] = [
  'home',
  'strategy',
  'ideation',
  'product',
  'project',
  'release',
  'test',
  'incident',
  'task',
  'plan',
  'wiki',
];

describe('HubIcon — bespoke Atlaskit-fidelity glyphs', () => {
  it.each(ALL_HUBS)('renders a 24x24 svg for %s', (name) => {
    const { container } = render(<HubIcon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
  });

  it.each(ALL_HUBS)('uses Atlaskit-canonical stroke conventions for %s', (name) => {
    const { container } = render(<HubIcon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('stroke-width')).toBe('1.5');
    expect(svg?.getAttribute('stroke-linecap')).toBe('square');
    expect(svg?.getAttribute('stroke-linejoin')).toBe('round');
  });

  it('renders a distinct glyph (different paths) for every hub', () => {
    const seen = new Set<string>();
    for (const name of ALL_HUBS) {
      const { container } = render(<HubIcon name={name} />);
      const paths = Array.from(container.querySelectorAll('path, rect, circle'))
        .map((el) => el.outerHTML)
        .join('|');
      expect(seen.has(paths)).toBe(false);
      seen.add(paths);
    }
  });

  it('inherits color via currentColor by default', () => {
    const { container } = render(<HubIcon name="home" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('fill')).toBe('none');
  });

  it('honours a custom size prop', () => {
    const { container } = render(<HubIcon name="home" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });
});
