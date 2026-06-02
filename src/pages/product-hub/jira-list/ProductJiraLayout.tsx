/**
 * ProductJiraLayout — Thin wrapper for /product-hub/:key/allwork.
 *
 * Structural clone of ProjectJiraLayout (src/pages/project-hub/jira-list/ProjectJiraLayout.tsx).
 * Differences from the original:
 *  1. Resolves product (id, name, code) from `products` table by URL :key (code),
 *     not `projects` table by key.
 *  2. Delegates to ProductAllWorkView, not ProjectAllWorkView.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductAllWorkView from './ProductAllWorkView';

interface ProductRow { id: string; name: string; code: string; }

export default function ProductJiraLayout() {
  const { key } = useParams<{ key: string }>();

  const { data: product, error } = useQuery({
    queryKey: ['product-jira-layout', key],
    queryFn: async () => {
      const { data, error: qErr } = await (supabase as any)
        .from('products')
        .select('id, name, code')
        .eq('code', key!.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (qErr) throw qErr;
      return data as ProductRow | null;
    },
    enabled: !!key,
  });

  if (error) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--cp-text-tertiary)', fontFamily: 'var(--cp-font-body)' }}>
      Product not found. <a href="/product-hub/products" style={{ color: 'var(--cp-text-link)' }}>← Back to products</a>
    </div>
  );

  return (
    <div
      data-testid="product-jira-layout"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        maxHeight: 'calc(100vh - 52px)',
        minHeight: 0, overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <ProductAllWorkView
        productCode={key!.toUpperCase()}
        productId={product?.id}
        productName={product?.name}
      />
    </div>
  );
}
