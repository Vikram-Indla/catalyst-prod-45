/**
 * jira-compare DC4 — Story view Jira parity gates
 *
 * Probed 2026-05-11:
 *  - Jira BAU section list: Key details · Description · Attachments · Subtasks ·
 *    Linked work items · Details · Activity — NO Defects, NO Production Incidents,
 *    NO TestHub.
 *  - Catalyst had DefectsSection + IncidentsSection + TestHubSection in leftContent,
 *    none of which have a Jira equivalent.
 *  - Container query fired at 560px (panelMode body width), hiding the right rail.
 *    Threshold must be ≤ 440px so the sidebar shows at typical panel widths.
 *  - Top bar lacked position:sticky in panel/fullpage modes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const storySrc = readFileSync(
  resolve(__dirname, '../../../story/CatalystViewStory.tsx'),
  'utf-8',
);

const baseSrc = readFileSync(
  resolve(__dirname, '../../CatalystViewBase.tsx'),
  'utf-8',
);

describe('CatalystViewStory — Jira parity (DC4 2026-05-11)', () => {
  it('Story view must NOT render DefectsSection', () => {
    // Jira BAU Story view has no "Defects" section — Catalyst-specific only
    expect(
      storySrc.includes('<DefectsSection'),
      'CatalystViewStory.tsx: <DefectsSection> must be removed (no Jira equivalent)',
    ).toBe(false);
  });

  it('Story view must NOT render IncidentsSection', () => {
    // Jira BAU Story view has no "Production Incidents" section
    expect(
      storySrc.includes('<IncidentsSection'),
      'CatalystViewStory.tsx: <IncidentsSection> must be removed (no Jira equivalent)',
    ).toBe(false);
  });

  it('Story view must NOT render TestHubSection', () => {
    // Jira BAU Story view has no "TestHub" section
    expect(
      storySrc.includes('<TestHubSection'),
      'CatalystViewStory.tsx: <TestHubSection> must be removed (no Jira equivalent)',
    ).toBe(false);
  });
});

describe('CatalystViewBase — responsive + sticky (DC4 2026-05-11)', () => {
  it('container query threshold must be ≤ 440px (not 680px)', () => {
    // At 560px panel body width the 680px threshold collapsed the sidebar.
    // Jira's detail panel shows two columns at 461px — our threshold must be lower.
    expect(
      baseSrc.includes('max-width: 680px'),
      'CatalystViewBase.tsx: @container (max-width: 680px) still present — must be ≤ 440px',
    ).toBe(false);
    expect(
      baseSrc.includes('max-width: 440px') || baseSrc.includes('max-width: 400px') || baseSrc.includes('max-width: 420px'),
      'CatalystViewBase.tsx: container query threshold must be ≤ 440px',
    ).toBe(true);
  });

  it('panel mode initial sidebar width must be ≤ 220px', () => {
    // At 560px body, 285px sidebar leaves only 269px for left content (too narrow).
    // 220px sidebar leaves 334px — acceptable.
    expect(
      baseSrc.includes('panelMode ? 220') || baseSrc.includes('panelMode ? 200') || baseSrc.includes('panelMode ? 180'),
      'CatalystViewBase.tsx: panel mode rightPanelWidth initial value must be ≤ 220px',
    ).toBe(true);
  });

  it('top bar must have position:sticky for panel/fullpage modes', () => {
    // When the allwork layout scrolls, the top bar must stay pinned so subtasks
    // do not scroll behind an inaccessible header.
    expect(
      baseSrc.includes("position: 'sticky'"),
      'CatalystViewBase.tsx: top bar must have position:sticky for panel/fullpage modes',
    ).toBe(true);
  });
});
