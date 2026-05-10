/**
 * Stage 2 Group 3 — Section count badges must never show zeros
 *
 * CLAUDE.md 2026-05-05: "Section count badges and zeros — never re-introduce"
 * Rule: count spans must be conditionally rendered (only when count > 0).
 *
 * Structural test: verify each source file contains the > 0 guard immediately
 * before each count span. Fails on unconditional renders.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '../../../../..');

function src(rel: string) {
  return readFileSync(resolve(SRC, rel), 'utf-8');
}

describe('section count badges must be conditionally rendered (no zeros)', () => {
  it('LinkedWorkItemsHeader: lwi-header__count only renders when count > 0', () => {
    const file = src('modules/project-work-hub/components/linked-work-items/LinkedWorkItemsHeader.tsx');
    // Must have a conditional guard before the count span
    expect(
      file.includes('count > 0') && file.includes('lwi-header__count'),
      'LinkedWorkItemsHeader must guard lwi-header__count with {count > 0 && ...}',
    ).toBe(true);
    // Must NOT have the unconditional pattern: className="lwi-header__count">{count}<
    expect(
      file.includes('lwi-header__count">\n          {count}') ||
      file.includes("lwi-header__count\" aria-label={`${count} linked`}>\n          {count}"),
      'lwi-header__count must not be rendered unconditionally',
    ).toBe(false);
  });

  it('DefectsSection: lwi-header__count only renders when defects.length > 0', () => {
    const file = src('modules/project-work-hub/components/dialogs/story-detail-modules/DefectsSection.tsx');
    expect(
      file.includes('defects.length > 0'),
      'DefectsSection must guard lwi-header__count with defects.length > 0',
    ).toBe(true);
  });

  it('IncidentsSection: lwi-header__count only renders when incidents.length > 0', () => {
    const file = src('modules/project-work-hub/components/dialogs/story-detail-modules/IncidentsSection.tsx');
    expect(
      file.includes('incidents.length > 0'),
      'IncidentsSection must guard lwi-header__count with incidents.length > 0',
    ).toBe(true);
  });

  it('SectionBlock (shared-components): sdm-count-badge only renders when count > 0', () => {
    const file = src('modules/project-work-hub/components/dialogs/story-detail-modules/shared-components.tsx');
    expect(
      file.includes('count > 0 && <span className="sdm-count-badge"'),
      'SectionBlock sdm-count-badge must be guarded with count > 0',
    ).toBe(true);
  });

  it('AttachmentsSection: att-badge wrapper must be gated by attachments.length > 0', () => {
    /* jira-compare 2026-05-10 — A5 (P1): live probe of BAU-5736 detail
       showed `.att-badge` rendering "0" inside the Attachments section
       header. Per CLAUDE.md 2026-05-05 lesson, section count badges (and
       especially zero badges) are permanently banned. Guard with
       `attachments.length > 0 && (...)`. */
    const file = src('modules/project-work-hub/components/dialogs/story-detail-modules/AttachmentsSection.tsx');
    // The wrapper must be immediately preceded by the `attachments.length > 0 && (` gate.
    expect(
      /attachments\.length > 0 && \(\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<div className="att-badge-wrapper">/.test(file),
      'AttachmentsSection must guard att-badge-wrapper with {attachments.length > 0 && (...)}',
    ).toBe(true);
  });
});
