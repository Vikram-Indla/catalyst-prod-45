/**
 * ProductHubPageAdapters — thin route wrappers for per-product hub pages.
 *
 * The canonical project-hub components (BacklogPage, ProjectAllWorkView,
 * KanbanBoardPage) all resolve their project via the `projects` table using
 * the `:key` URL param.  Product-hub products live in the `products` table
 * instead.  These adapters bridge the gap:
 *
 *   1. Read `:key` (== products.code, e.g. "INV") from URL.
 *   2. Look up the product in `products` by code.
 *   3. Forward the resolved info (id, name) to the canonical component so it
 *      can set displayName + baseUrl without hitting the wrong table.
 *
 * Data lives in `ph_issues` where project_key = products.code (e.g. "INV").
 * Added 2026-05-16 when per-product routes switched from :code → :key so
 * canonical components work without modification.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import ProjectAllWorkView from '@/pages/project-hub/jira-list/ProjectAllWorkView';

interface ProductInfo {
  id: string;
  name: string;
  code: string;
}

function useProductInfo(key: string | undefined) {
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name, code')
        .eq('code', key.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      setProduct(data ?? null);
      setLoading(false);
    })();
  }, [key]);

  return { product, loading };
}

function ProductLoadingState() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100%', padding: 48,
      color: token('color.text.subtlest'),
      fontFamily: 'var(--cp-font-body)',
    }}>
      Loading product…
    </div>
  );
}

function ProductNotFound({ code }: { code: string }) {
  return (
    <div style={{
      padding: 48, textAlign: 'center',
      color: token('color.text.subtlest'),
      fontFamily: 'var(--cp-font-body)',
    }}>
      Product <strong>{code}</strong> not found.{' '}
      <a href="/product-hub/products" style={{ color: token('color.link') }}>
        ← Back to products
      </a>
    </div>
  );
}

/* ─── Product Backlog ────────────────────────────────────────────────────── */

export default function ProductHubBacklogAdapter() {
  const { key } = useParams<{ key: string }>();
  const { product, loading } = useProductInfo(key);

  if (loading) return <ProductLoadingState />;
  if (!product && key) return <ProductNotFound code={key} />;

  return (
    <BacklogPage
      projectId={product?.id ?? ''}
      projectKey={key ?? ''}
      displayName={product?.name}
      baseUrl={`/product-hub/${key}`}
    />
  );
}

/* ─── Product All Work ───────────────────────────────────────────────────── */

export function ProductHubAllWorkAdapter() {
  const { key } = useParams<{ key: string }>();
  const { product, loading } = useProductInfo(key);

  if (loading) return <ProductLoadingState />;
  if (!product && key) return <ProductNotFound code={key} />;

  return (
    <ProjectAllWorkView
      projectKey={key ?? ''}
      projectId={product?.id}
    />
  );
}
