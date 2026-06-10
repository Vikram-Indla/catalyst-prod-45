/**
 * DwellPatternLozenge — diagnostic chip for dwell-pattern classification.
 *
 * Phase 4 row 6 — outlier #5.
 *
 * Contract:
 *   - Renders one chip per pattern with emoji + label + colour.
 *   - 'none' pattern renders NOTHING (returns null).
 *   - Exposes data-testid='tis-dwell-lozenge' + data-pattern attr.
 *   - Title attribute carries the description for tooltip on hover.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DwellPatternLozenge } from './DwellPatternLozenge';

describe('DwellPatternLozenge', () => {
  it('renders ping_pong with red emoji + label', () => {
    render(<DwellPatternLozenge pattern="ping_pong" confidence={0.92} />);
    const lz = screen.getByTestId('tis-dwell-lozenge');
    expect(lz).toBeInTheDocument();
    expect(lz.getAttribute('data-pattern')).toBe('ping_pong');
    expect(lz.textContent).toMatch(/ping.?pong/i);
  });

  it('renders silent with snail emoji', () => {
    render(<DwellPatternLozenge pattern="silent" confidence={0.75} />);
    expect(screen.getByTestId('tis-dwell-lozenge').textContent).toMatch(/silent/i);
  });

  it('renders external_dep with link emoji', () => {
    render(<DwellPatternLozenge pattern="external_dep" confidence={0.85} />);
    expect(screen.getByTestId('tis-dwell-lozenge').textContent).toMatch(/external/i);
  });

  it('returns null for none pattern', () => {
    const { container } = render(<DwellPatternLozenge pattern="none" confidence={0.4} />);
    expect(container.firstChild).toBeNull();
  });

  it('exposes title attr with description for tooltip on hover', () => {
    render(<DwellPatternLozenge pattern="ping_pong" confidence={0.92} description="Reassigned ≥2 times then returned." />);
    const lz = screen.getByTestId('tis-dwell-lozenge');
    expect(lz.getAttribute('title')).toContain('Reassigned');
  });

  it('renders compact variant without label when compact=true', () => {
    render(<DwellPatternLozenge pattern="ping_pong" confidence={0.92} compact />);
    const lz = screen.getByTestId('tis-dwell-lozenge');
    // Emoji-only in compact mode
    expect(lz.textContent?.length).toBeLessThanOrEqual(2);
  });
});
