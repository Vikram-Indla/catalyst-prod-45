import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const src = readFileSync(
  resolve(repoRoot, 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx'),
  'utf8',
);

// Extract the onDragEnd handler body so assertions only target the drag path,
// not bulkUpdate's other (correct) callsites for summary/status/etc.
function extractOnDragEnd(source: string): string {
  const start = source.indexOf('onDragEnd={async (event: DragEndEvent) =>');
  if (start < 0) throw new Error('onDragEnd handler not found in BacklogPage.atlaskit.tsx');
  // Walk braces from the first `{` after the arrow until they balance.
  const arrowIdx = source.indexOf('=>', start);
  const bodyStart = source.indexOf('{', arrowIdx);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(bodyStart, i + 1);
    }
  }
  throw new Error('onDragEnd body braces never balanced');
}

const onDragEndBody = extractOnDragEnd(src);

describe('BacklogPage drag-drop rank persistence (2026-05-17)', () => {
  it('does not route the rank-write through bulkUpdate (source filter rejects Jira-synced rows)', () => {
    // bulkUpdate filters items to source === "catalyst" and throws for Jira-
    // synced rows. sort_order is a Catalyst-local field with no Jira sync,
    // so the drag handler must bypass that filter — the row-menu Rank-to-top
    // / Rank-to-bottom actions already do this by writing supabase directly.
    expect(onDragEndBody).not.toMatch(/bulkUpdate\.mutateAsync/);
  });

  it('writes sort_order directly to ph_issues via supabase', () => {
    expect(onDragEndBody).toMatch(/supabase[\s\S]{0,80}\.from\(['"]ph_issues['"]\)/);
    expect(onDragEndBody).toMatch(/\.update\([\s\S]{0,200}sort_order/);
  });

  it('gates the write by issue_key only (no source filter on rank-write)', () => {
    expect(onDragEndBody).toMatch(/\.eq\(['"]issue_key['"]/);
    // The drag handler must not re-introduce the source filter that broke it.
    expect(onDragEndBody).not.toMatch(/\.eq\(['"]source['"]/);
  });
});
