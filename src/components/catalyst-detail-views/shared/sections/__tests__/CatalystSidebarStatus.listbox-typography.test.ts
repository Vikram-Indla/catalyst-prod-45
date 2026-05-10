/**
 * DC3 A4 — Status listbox typography (jira-compare 2026-05-11)
 *
 * Jira DOM probe (BAU-5736, 2026-05-11):
 *   - Status transition listbox option: fontSize 14px, fontWeight 400
 *   - Status pill inside option: fontSize 14px, fontWeight 400, borderRadius 3px, padding 0 4px
 *
 * Live status picker is CatalystStatusPill.tsx (portal container). The sidebar
 * SHOW_RAIL_STATUS=false fallback also gets the class so re-enabling it stays correct.
 *
 * Fix: add className="cv-status-listbox" to both containers, then add a scoped
 * CSS rule in index.css that overrides to 14px/400 within that class.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sidebarSrc = readFileSync(
  resolve(__dirname, '../CatalystSidebarDetails.tsx'),
  'utf-8',
);

const statusPillSrc = readFileSync(
  resolve(__dirname, '../CatalystStatusPill.tsx'),
  'utf-8',
);

const indexCss = readFileSync(
  resolve(__dirname, '../../../../../index.css'),
  'utf-8',
);

describe('Status listbox typography (A4) — jira-compare DC3 2026-05-11', () => {
  it('CatalystStatusPill portal container must have cv-status-listbox className', () => {
    // CatalystStatusPill is the live status picker rendered via createPortal.
    // Its portal div must carry className="cv-status-listbox" for the scoped
    // 14px/400 CSS override to apply to the Lozenge spans inside.
    expect(
      statusPillSrc.includes('cv-status-listbox'),
      'CatalystStatusPill.tsx: the portal container div (data-testid="catalyst-status-pill-popover") ' +
      'must have className="cv-status-listbox". Currently missing.',
    ).toBe(true);
  });

  it('CatalystSidebarDetails fallback dropdown must have cv-status-listbox className', () => {
    // The SHOW_RAIL_STATUS=false fallback dropdown also gets the class so that
    // if it is ever re-enabled the scoped override automatically applies.
    expect(
      sidebarSrc.includes('cv-status-listbox'),
      'CatalystSidebarDetails.tsx: the fallback status dropdown container must have ' +
      'className="cv-status-listbox". Currently missing.',
    ).toBe(true);
  });

  it('index.css must have a .cv-status-listbox scoped font override (14px, 400)', () => {
    // The global [data-cp-lozenge-jira-parity] override sets 12px/500 everywhere.
    // A scoped .cv-status-listbox rule must override to 14px/400 for picker contexts.
    // Jira probe: 14px/400 for status transition listbox option rows (BAU-5736, 2026-05-11).
    expect(
      indexCss.includes('.cv-status-listbox'),
      'index.css must contain a .cv-status-listbox scoped rule that brings ' +
      'lozenge spans inside status picker dropdowns to 14px/400. Currently missing.',
    ).toBe(true);
  });
});
