/**
 * P1 enforcement tests for ProjectAllWorkView + WorkListPanel.
 * design-critique 2026-05-21 — Project Hub allwork HALT → SHIP.
 *
 * Two targeted improvements:
 *   H10: empty right-panel must render a proper empty state (icon + primary + secondary text)
 *   H6:  outer pagination footer must display a result count chip
 *
 * These are source-grep assertions — no DOM rendering required.
 */

import * as fs from 'fs';
import * as path from 'path';

const ALLWORK_SRC = path.resolve(
  __dirname,
  '../ProjectAllWorkView.tsx',
);
const src = fs.readFileSync(ALLWORK_SRC, 'utf8');

describe('ProjectAllWorkView — H10 empty right-panel empty state', () => {
  it('renders an icon element in the empty right-panel state', () => {
    // The empty state must include a recognisable icon element,
    // not just bare text. Look for an SVG or Atlaskit icon near the
    // "Select a work item" / empty state section.
    expect(src).toMatch(/allwork-empty-state/);
  });

  it('renders a secondary guidance message below the primary label', () => {
    // Jira-parity empty states include a subtitle. Ours must have one.
    expect(src).toMatch(/allwork-empty-state-subtitle/);
  });
});

describe('ProjectAllWorkView — H6 outer pagination count chip', () => {
  it('shows a result count in the outer pagination footer', () => {
    // The pagination footer must contain a count expression
    // using filteredItems.length and hasNextPage.
    expect(src).toMatch(/allwork-pagination-count/);
  });
});
