/**
 * WikiSandboxPage — DEV-ONLY editor proving ground for the P0 spike
 * (CAT-DOCS-NOTION-20260704-001). Not routed in production builds; the
 * route registration is guarded by import.meta.env.DEV. Used by the
 * runtime probes: render, slash menu, RTL Arabic, 1.5k-block perf, and
 * the C1 co-editing spike (?collab=1 — two tabs share one Y.Doc over
 * Supabase Realtime; CAT-DOCEX-DB-COEDIT-20260705-001).
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Block } from '@blocknote/core';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import {
  SupabaseYjsProvider,
  collabColor,
} from '@/components/wiki-hub/editor/SupabaseYjsProvider';

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
  const [params] = useSearchParams();
  const { user } = useAuth();
  const collabOn = params.get('collab') === '1';

  const provider = useMemo(
    () => (collabOn ? new SupabaseYjsProvider('sandbox') : null),
    [collabOn],
  );
  useEffect(() => () => provider?.destroy(), [provider]);

  const collab = useMemo(() => {
    if (!provider) return undefined;
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    const name = meta.full_name || meta.name || user?.email || 'Anonymous';
    return { provider, user: { name, color: collabColor(user?.id ?? 'anon') } };
  }, [provider, user]);

  return (
    <div style={{ padding: 'var(--ds-space-300, 24px)', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        title="Wiki editor sandbox"
        subtitle={collabOn ? 'CO-EDITING MODE — open this URL in a second tab' : 'Development-only probe surface'}
      />
      <div style={{ margin: '8px 0 16px', display: 'flex', gap: 8 }}>
        <button data-testid="seed-1500" onClick={() => setSeed(seedBlocks(1500))}>
          Seed 1,500 blocks
        </button>
        <button data-testid="seed-clear" onClick={() => setSeed(undefined)}>
          Reset
        </button>
      </div>
      <Suspense fallback={<Skeleton style={{ height: 320, borderRadius: 8 }} />}>
        <WikiEditor
          key={collabOn ? 'collab' : seed ? 'seeded' : 'blank'}
          initialContent={collabOn ? undefined : seed}
          collab={collab}
        />
      </Suspense>
    </div>
  );
}
