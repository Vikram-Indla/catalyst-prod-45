/**
 * ConfirmArchiveDialog — static analysis parity tests.
 *
 * Pins that:
 *   1. The dialog uses @atlaskit/modal-dialog (not window.confirm or hand-rolled)
 *   2. The dialog uses @atlaskit/button/new (ADS-only rule)
 *   3. No window.confirm remains in any of the 8 CatalystView* files after migration
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SHARED = path.resolve(__dirname, '..');
const VIEWS = path.resolve(__dirname, '../..');

function read(p: string) {
  return fs.readFileSync(p, 'utf-8');
}

describe('ConfirmArchiveDialog — component structure', () => {
  it('imports @atlaskit/modal-dialog', () => {
    const src = read(path.join(SHARED, 'ConfirmArchiveDialog.tsx'));
    expect(src).toMatch(/@atlaskit\/modal-dialog/);
  });

  it('imports @atlaskit/button/new', () => {
    const src = read(path.join(SHARED, 'ConfirmArchiveDialog.tsx'));
    expect(src).toMatch(/@atlaskit\/button\/new/);
  });

  it('does NOT call window.confirm()', () => {
    const src = read(path.join(SHARED, 'ConfirmArchiveDialog.tsx'));
    // Match actual call syntax, not documentation comments mentioning it
    expect(src).not.toMatch(/window\.confirm\s*\(/);
  });

  it('renders a Cancel button and a danger/confirm button', () => {
    const src = read(path.join(SHARED, 'ConfirmArchiveDialog.tsx'));
    expect(src).toMatch(/Cancel/);
    expect(src).toMatch(/Archive/);
  });
});

describe('CatalystView* — window.confirm removed after migration', () => {
  const VIEW_FILES = [
    'story/CatalystViewStory.tsx',
    'task/CatalystViewTask.tsx',
    'subtask/CatalystViewSubtask.tsx',
    'epic/CatalystViewEpic.tsx',
    'feature/CatalystViewFeature.tsx',
    'incident/CatalystViewIncident.tsx',
    'defect/CatalystViewDefect.tsx',
    'business-request/CatalystViewBusinessRequest.v3.tsx',
  ];

  for (const rel of VIEW_FILES) {
    it(`${rel} must not use window.confirm`, () => {
      const src = read(path.join(VIEWS, rel));
      expect(src).not.toMatch(/window\.confirm/);
    });
  }
});
