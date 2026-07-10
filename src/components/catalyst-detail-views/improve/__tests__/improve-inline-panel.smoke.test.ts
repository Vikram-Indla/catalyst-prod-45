/**
 * Stage 2 Group 4 — Improve* dialogs must NOT use createPortal (stacked modal)
 *
 * 2026-05-10 update: ImproveIssueDropdown is now in the right-rail improveDropdown
 * slot (Vikram directive "follow jira" — Jira places Improve in the sidebar rail,
 * not inline in the left content column). The old assertion ("must NOT be in
 * improveDropdown slot") has been replaced with a positive assertion ("must be
 * in improveDropdown slot, not loose in leftContent").
 *
 * Rule (CLAUDE.md lesson candidate): Improve* dialogs must mount inline,
 * never via createPortal overlay.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const IMPROVE = resolve(__dirname, '..');
const VIEWS = resolve(__dirname, '../..');

function improveFile(name: string) {
  return readFileSync(resolve(IMPROVE, name), 'utf-8');
}
function viewFile(name: string) {
  return readFileSync(resolve(VIEWS, name), 'utf-8');
}

// 2026-05-21: SummarizeCommentsDialog removed — Summarize comments now
// renders inline via CommentsSummaryCard (not a stacked modal).
const DIALOG_FILES = [
  'ImproveDescriptionDialog.tsx',
  'SuggestChildIssuesDialog.tsx',
  'LinkSimilarItemsDialog.tsx',
];

const VIEW_FILES_WITH_IMPROVE = [
  'defect/CatalystViewDefect.tsx',
  'business-request/CatalystViewBusinessRequest.v3.tsx',
  'epic/CatalystViewEpic.tsx',
  'task/CatalystViewTask.tsx',
  'incident/CatalystViewIncident.tsx',
  'subtask/CatalystViewSubtask.tsx',
  'feature/CatalystViewFeature.tsx',
  'story/CatalystViewStory.tsx',
];

describe('Improve* dialogs — inline panel (no createPortal stacking)', () => {
  for (const name of DIALOG_FILES) {
    it(`${name} must not use createPortal`, () => {
      const file = improveFile(name);
      expect(
        file.includes('createPortal'),
        `${name} must NOT use createPortal — dialogs must render inline`,
      ).toBe(false);
    });
  }

  for (const name of VIEW_FILES_WITH_IMPROVE) {
    it(`${name} must pass ImproveIssueDropdown via sidebar improveDropdown slot`, () => {
      const file = viewFile(name);
      // 2026-05-10: ImproveIssueDropdown belongs in the right-rail improveDropdown slot
      // (Vikram directive "follow jira" — replaces old "must be in leftContent" rule)
      //
      // 2026-06-21 (986b9f5b9): CatalystViewBusinessRequest.v3.tsx started gating the
      // dropdown behind `isClosed ? undefined : (<>...<ImproveIssueDropdown .../></>)`
      // so the element is no longer immediately after `improveDropdown={`. The slot
      // contract itself didn't change — ImproveIssueDropdown must still live inside the
      // improveDropdown prop's value, not loose in leftContent — so this looks within a
      // bounded window after the prop key instead of requiring an exact literal match.
      const propIdx = file.indexOf('improveDropdown={');
      const propWindow = propIdx >= 0 ? file.slice(propIdx, propIdx + 800) : '';
      expect(
        propIdx >= 0 && propWindow.includes('<ImproveIssueDropdown'),
        `${name}: ImproveIssueDropdown must be in sidebar improveDropdown slot, not loose in leftContent`,
      ).toBe(true);
    });
  }
});
