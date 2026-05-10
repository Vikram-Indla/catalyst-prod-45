/**
 * Stage 2 Group 4 — Improve* dialogs must NOT use createPortal (stacked modal)
 *
 * Jira renders "Improve" as an inline panel within the left content column.
 * Catalyst was stacking a second modal via createPortal to document.body.
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

const DIALOG_FILES = [
  'ImproveDescriptionDialog.tsx',
  'SummarizeCommentsDialog.tsx',
  'SuggestChildIssuesDialog.tsx',
  'LinkSimilarItemsDialog.tsx',
];

const VIEW_FILES_WITH_IMPROVE = [
  'defect/CatalystViewDefect.tsx',
  'business-request/CatalystViewBusinessRequest.tsx',
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
    it(`${name} must NOT pass ImproveIssueDropdown as sidebar improveDropdown slot`, () => {
      const file = viewFile(name);
      // The ImproveIssueDropdown must NOT appear inside a sidebar improveDropdown prop
      expect(
        file.includes('improveDropdown={<ImproveIssueDropdown'),
        `${name}: ImproveIssueDropdown must be in leftContent, not sidebar improveDropdown slot`,
      ).toBe(false);
    });
  }
});
