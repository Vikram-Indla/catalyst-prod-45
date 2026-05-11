/**
 * CatalystViewBase — @media print rules
 *
 * Vikram defect 2026-05-10: "The burger menu print clone does not work."
 *
 * Root cause: the burger's "Print" action calls window.print() but no
 * print-aware CSS scopes the detail view for paper output. The browser
 * prints everything visible — including the right rail (cv-drawer-sidebar),
 * the splitter (cv-drawer-splitter), and the chrome buttons (Close, Share,
 * Watchers, More options, Toggle panel mode). Result: looks "broken" because
 * the output is unreadable / cluttered.
 *
 * Fix: extend the injected style block with @media print rules that:
 *   1. Hide the right sidebar + splitter (paper is single-column).
 *   2. Hide the chrome buttons (Close / Share / Watchers / More / panel toggle).
 *   3. Reset the drawer body container-type + overflow so content prints
 *      as a normal document.
 *
 * Static-source assertion — the injected `css` array must contain the
 * print rules.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../CatalystViewBase.tsx'),
  'utf-8',
);

describe('CatalystViewBase — burger Print readability', () => {
  it('injects @media print rules in the style block', () => {
    expect(
      /@media print/.test(src),
      'CatalystViewBase must include an @media print rule so the burger ' +
      'Print action produces a clean printout (no sidebar, no splitter, ' +
      'no action chrome).',
    ).toBe(true);
  });

  it('print rules hide the right sidebar and splitter', () => {
    // Scope to the lines that follow the @media print marker.
    const printStart = src.indexOf('@media print');
    expect(printStart, 'No @media print marker in source').toBeGreaterThan(0);
    const tail = src.slice(printStart, printStart + 2500);
    expect(
      /\.cv-drawer-sidebar[\s\S]{0,80}display: none/.test(tail),
      'Print rules must hide .cv-drawer-sidebar.',
    ).toBe(true);
    expect(
      /\.cv-drawer-splitter[\s\S]{0,80}display: none/.test(tail),
      'Print rules must hide .cv-drawer-splitter.',
    ).toBe(true);
  });

  it('print rules hide top-bar action chrome (Close / Share / Watchers / More)', () => {
    const printStart = src.indexOf('@media print');
    expect(printStart, 'No @media print marker in source').toBeGreaterThan(0);
    const tail = src.slice(printStart, printStart + 2500);
    expect(tail.includes('aria-label="Close"'), 'Print rules must hide the Close button.').toBe(true);
    expect(tail.includes('aria-label="Share"'), 'Print rules must hide the Share button.').toBe(true);
    expect(tail.includes('aria-label="Manage watchers"'), 'Print rules must hide the Watchers button.').toBe(true);
    expect(tail.includes('aria-label="More options"'), 'Print rules must hide the burger button.').toBe(true);
  });
});
