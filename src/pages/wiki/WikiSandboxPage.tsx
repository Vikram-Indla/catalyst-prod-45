/**
 * WikiSandboxPage — DEV-ONLY editor proving ground for the P0 spike
 * (CAT-DOCS-NOTION-20260704-001). Not routed in production builds; the
 * route registration is guarded by import.meta.env.DEV. Used by the
 * runtime probes: render, slash menu, RTL Arabic, 1.5k-block perf.
 * Removed once WikiPageViewPage (real persistence) lands.
 */
import { lazy, Suspense, useState } from 'react';
import type { Block } from '@blocknote/core';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';

const WikiEditor = lazy(() => import('@/components/wiki-hub/editor/WikiEditor'));

function seedBlocks(count: number): Block[] {
  const blocks: unknown[] = [];
  for (let i = 0; i < count; i++) {
    blocks.push({
      type: 'paragraph',
      content: `Seed block ${i + 1} — performance probe content for the Wiki editor.`,
    });
  }
  return blocks as Block[];
}

export default function WikiSandboxPage() {
  const [seed, setSeed] = useState<Block[] | undefined>(undefined);

  return (
    <div style={{ padding: 'var(--ds-space-300, 24px)', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader title="Wiki editor sandbox" subtitle="Development-only probe surface" />
      <div style={{ margin: '8px 0 16px', display: 'flex', gap: 8 }}>
        <button data-testid="seed-1500" onClick={() => setSeed(seedBlocks(1500))}>
          Seed 1,500 blocks
        </button>
        <button data-testid="seed-clear" onClick={() => setSeed(undefined)}>
          Reset
        </button>
      </div>
      <Suspense fallback={<Skeleton style={{ height: 320, borderRadius: 8 }} />}>
        <WikiEditor key={seed ? 'seeded' : 'blank'} initialContent={seed} />
      </Suspense>
    </div>
  );
}
