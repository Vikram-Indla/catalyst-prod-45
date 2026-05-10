/**
 * Stage 2 Group 2 — CatalystFooterMeta must NOT appear in leftContent
 *
 * Jira canonical: Created/Updated timestamps live ONLY in the right rail
 * sidebar bottom. Rendering them in leftContent duplicates them.
 *
 * These tests read source files and assert the structural constraint so
 * the duplication can never silently regress.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

const VIEW_FILES = [
  'defect/CatalystViewDefect.tsx',
  'business-request/CatalystViewBusinessRequest.tsx',
  'epic/CatalystViewEpic.tsx',
  'task/CatalystViewTask.tsx',
  'incident/CatalystViewIncident.tsx',
  'subtask/CatalystViewSubtask.tsx',
  'feature/CatalystViewFeature.tsx',
];

describe('CatalystFooterMeta must not appear in any CatalystView* leftContent', () => {
  for (const rel of VIEW_FILES) {
    it(`${rel} — no <CatalystFooterMeta in source`, () => {
      const src = readFileSync(resolve(ROOT, rel), 'utf-8');
      expect(
        src.includes('<CatalystFooterMeta'),
        `${rel} still renders <CatalystFooterMeta — remove it (timestamps belong in right rail only)`,
      ).toBe(false);
    });
  }
});
