/**
 * Section header typography — canonical Jira spec
 *
 * jira-compare 2026-05-11 (re-probe): live DOM measurement on BAU-5814 (Story),
 * BAU-5824 (QA Bug), BAU-5751 (QA Bug) — innermost text-bearing element for
 * "Key details", "Subtasks", "Linked work items", "Activity":
 *
 *   fontSize: 16px / fontWeight: 653 / lineHeight: 20px / color: rgb(41,42,46)
 *
 * The compiled CSS class names (`_11c81e3o _syazi7uo _1i4q1hna`) match
 * `@atlaskit/heading size="small"` atomic output — Jira is using Atlaskit
 * Heading small.
 *
 * Corrects 2026-05-08 K.11 lesson (14px/600/#172B4D), which had measured
 * parent layout wrappers (14px/400) and inner field labels (11–12px/600)
 * instead of the section header text node.
 *
 * Fix targets:
 *   - CatalystKeyDetails.tsx  : h2 inline 14/600 → 16/653
 *   - SubtasksPanel.css       : .sp-title 14/600 → 16/653
 *   - CatalystDescriptionSection.tsx : h2 14/600 → 16/653
 *   - linked-work-items.css   : .lwi-header__title 14/600 → 16/653
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

describe('Section header typography — canonical Jira spec (live probe 2026-05-11)', () => {
  it('CatalystKeyDetails "Key details" h2 must be fontSize 16, fontWeight 653', () => {
    // Locate the "Key details" h2 block (whitespace-tolerant)
    const block = keyDetailsSrc.match(/<h2[\s\S]{0,400}>Key details<\/h2>/);
    expect(block, 'Could not locate the "Key details" <h2> in CatalystKeyDetails.tsx').not.toBeNull();
    const text = block![0];
    expect(
      /fontSize:\s*16/.test(text),
      'CatalystKeyDetails.tsx: "Key details" h2 must use fontSize: 16 (live Jira spec).',
    ).toBe(true);
    expect(
      /fontWeight:\s*653/.test(text),
      'CatalystKeyDetails.tsx: "Key details" h2 must use fontWeight: 653 (live Jira spec).',
    ).toBe(true);
  });

  it('SubtasksPanel .sp-title must be font-size 16px, font-weight 653', () => {
    const block = subtasksCss.match(/\.sp-title\s*\{[^}]*\}/);
    expect(block, 'Could not locate .sp-title block in SubtasksPanel.css').not.toBeNull();
    const text = block![0];
    expect(
      /font-size:\s*16px/.test(text),
      'SubtasksPanel.css: .sp-title must be font-size: 16px (live Jira spec).',
    ).toBe(true);
    expect(
      /font-weight:\s*653/.test(text),
      'SubtasksPanel.css: .sp-title must be font-weight: 653 (live Jira spec).',
    ).toBe(true);
  });

  it('CatalystDescriptionSection "Description" h2 must be fontSize 16, fontWeight 653', () => {
    // Locate the section label h2 (data-testid="catalyst-description-section.label")
    const block = descSrc.match(/data-testid="catalyst-description-section\.label"[\s\S]{0,800}/);
    expect(block, 'Could not locate Description section label h2').not.toBeNull();
    const text = block![0];
    expect(
      /fontSize:\s*16/.test(text),
      'CatalystDescriptionSection.tsx: section h2 must use fontSize: 16 (live Jira spec).',
    ).toBe(true);
    expect(
      /fontWeight:\s*653/.test(text),
      'CatalystDescriptionSection.tsx: section h2 must use fontWeight: 653 (live Jira spec).',
    ).toBe(true);
  });

  it('linked-work-items.css .lwi-header__title must be font-size 16px, font-weight 653', () => {
    const block = lwItemsCss.match(/\.lwi-header__title\s*\{[^}]*\}/);
    expect(block, 'Could not locate .lwi-header__title block').not.toBeNull();
    const text = block![0];
    expect(
      /font-size:\s*16px/.test(text),
      'linked-work-items.css: .lwi-header__title must be font-size: 16px (live Jira spec).',
    ).toBe(true);
    expect(
      /font-weight:\s*653/.test(text),
      'linked-work-items.css: .lwi-header__title must be font-weight: 653 (live Jira spec).',
    ).toBe(true);
  });
});
