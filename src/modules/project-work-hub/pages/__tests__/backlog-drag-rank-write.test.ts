import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const src = readFileSync(
  resolve(repoRoot, 'src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx'),
  'utf8',
);

// Extract the monitorForElements onDrop handler body (Pragmatic DnD migration,
// BAU-backlog-drag-01). Replaces the previous onDragEnd={async ...} extraction.
function extractOnDrop(source: string): string {
  const marker = 'onDrop: async ({ source, location })';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('monitorForElements onDrop handler not found in BacklogPage.atlaskit.tsx');
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
  throw new Error('onDrop body braces never balanced');
}

const onDropBody = extractOnDrop(src);

describe('BacklogPage drag-drop rank persistence (BAU-backlog-drag-01 Pragmatic migration)', () => {
  it('does not route the rank-write through bulkUpdate (source filter rejects Jira-synced rows)', () => {
    expect(onDropBody).not.toMatch(/bulkUpdate\.mutateAsync/);
  });

  it('writes sort_order directly to ph_issues via supabase', () => {
    expect(onDropBody).toMatch(/supabase[\s\S]{0,80}\.from\(['"]ph_issues['"]\)/);
    expect(onDropBody).toMatch(/\.update\([\s\S]{0,200}sort_order/);
  });

  it('gates the write by issue_key only (no source filter on rank-write)', () => {
    expect(onDropBody).toMatch(/\.eq\(['"]issue_key['"]/);
    expect(onDropBody).not.toMatch(/\.eq\(['"]source['"]/);
  });

  it('uses edge-aware insertion (top = insert before, bottom = insert after)', () => {
    expect(onDropBody).toMatch(/extractClosestEdge/);
    expect(onDropBody).toMatch(/insertAfter.*edge.*['"]bottom['"]/);
  });
});
