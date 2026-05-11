/**
 * DC3 — Section header typography (K.11 spec, jira-compare 2026-05-11)
 *
 * Jira K.11 measurement: all section headers in detail views (Key details,
 * Description, Subtasks, Linked work items) must be 14px / fontWeight 600 / #172B4D.
 * Anything rendering at 16px/653 or 14px/500 fails parity.
 *
 * Fix targets:
 *   - CatalystKeyDetails.tsx  : h2 inline style fontSize/fontWeight
 *   - SubtasksPanel.css       : .sp-title font-size/font-weight
 *   - CatalystDescriptionSection.tsx : h2 fontWeight + color
 *   - linked-work-items.css   : .lwi-header__title font-weight
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const keyDetailsSrc = readFileSync(
  resolve(__dirname, '../CatalystKeyDetails.tsx'),
  'utf-8',
);

const subtasksCss = readFileSync(
  resolve(__dirname, '../../../../../modules/project-work-hub/components/SubtasksPanel/SubtasksPanel.css'),
  'utf-8',
);

const descSrc = readFileSync(
  resolve(__dirname, '../CatalystDescriptionSection.tsx'),
  'utf-8',
);

const lwItemsCss = readFileSync(
  resolve(__dirname, '../../../../../modules/project-work-hub/components/linked-work-items/linked-work-items.css'),
  'utf-8',
);

describe('Section header typography (K.11) — jira-compare DC3 2026-05-11', () => {
  it('CatalystKeyDetails "Key details" h2 must be fontSize 14, fontWeight 600', () => {
    // Jira K.11: 14px/600/#172B4D for all section headers
    expect(
      keyDetailsSrc.includes('fontSize: 16') && keyDetailsSrc.includes('fontWeight: 653'),
      'CatalystKeyDetails.tsx: "Key details" h2 is still 16px/653 — must be 14px/600.',
    ).toBe(false);
    expect(
      keyDetailsSrc.includes('fontSize: 14') && keyDetailsSrc.includes('fontWeight: 600'),
      'CatalystKeyDetails.tsx: "Key details" h2 must use fontSize: 14, fontWeight: 600.',
    ).toBe(true);
  });

  it('SubtasksPanel .sp-title must be font-size 14px, font-weight 600', () => {
    // sp-title was accidentally set to 16px/653 — Jira K.11 says 14px/600
    expect(
      subtasksCss.includes('font-size: 16px'),
      'SubtasksPanel.css: .sp-title is still font-size: 16px — must be 14px.',
    ).toBe(false);
    expect(
      subtasksCss.includes('font-weight: 653') && subtasksCss.match(/\.sp-title\s*\{/),
      'SubtasksPanel.css: .sp-title is still font-weight: 653 — must be 600.',
    ).toBe(false);
  });

  it('CatalystDescriptionSection "Description" h2 must be fontWeight 600 with primary text color', () => {
    // Jira K.11: section label must be 600 weight / var(--ds-text, #172B4D) not subtle
    // Check the section label h2 (data-testid="catalyst-description-section.label")
    expect(
      descSrc.includes('fontWeight: 500'),
      'CatalystDescriptionSection.tsx: section h2 is still fontWeight: 500 — must be 600.',
    ).toBe(false);
  });

  it('linked-work-items.css .lwi-header__title must be font-weight 600', () => {
    // Jira K.11: linked work items section title must be 14px/600
    const lwTitleBlock = lwItemsCss.match(/\.lwi-header__title\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(
      lwTitleBlock.includes('font-weight: 653'),
      'linked-work-items.css: .lwi-header__title is still font-weight: 653 — must be 600.',
    ).toBe(false);
  });
});
