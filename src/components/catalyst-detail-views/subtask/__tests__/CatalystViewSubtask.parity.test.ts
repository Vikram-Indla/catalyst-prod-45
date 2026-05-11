/**
 * CatalystViewSubtask — parity tests (static analysis)
 *
 * Pins the CLAUDE.md 2026-05-10 rule: openDetail / onOpenItem MUST receive
 * issue_key (text), never a row UUID. CatalystDetailRouter queries exclusively
 * by `.eq('issue_key', itemId)` — UUID lookups silently return "Issue not found".
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../CatalystViewSubtask.tsx'),
  'utf-8',
);

describe('CatalystViewSubtask parity (static analysis)', () => {
  it('parent banner click must pass parentIssue.issue_key, not parentIssue.id', () => {
    // Passing .id (UUID) violates CLAUDE.md 2026-05-10 — CatalystDetailRouter
    // resolves only by issue_key; UUID lookups always return "not found".
    expect(SRC).not.toMatch(/onOpenItem\?\.\s*\(\s*parentIssue\.id\s*\)/);
  });

  it('onParentClick must pass parentIssue.issue_key, not parentIssue.id', () => {
    expect(SRC).not.toMatch(/onParentClick.*parentIssue\.id/);
  });

  it('parent banner click must use parentIssue.issue_key', () => {
    expect(SRC).toMatch(/onOpenItem\?\.\s*\(\s*parentIssue\.issue_key\s*\)/);
  });
});
