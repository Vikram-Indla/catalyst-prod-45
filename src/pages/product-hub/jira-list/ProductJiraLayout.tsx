/**
 * ProductJiraLayout — /product-hub/:key/allwork
 *
 * 2026-06-15: switched from the parallel ProductAllWorkView (413 LOC clone)
 * to the canonical ProjectAllWorkView with mode='product'. Per CLAUDE.md
 * "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT", future fixes to the
 * canonical view automatically apply here.
 *
 * Layout shell still owns:
 *   1. product resolution (products by code → id, name)
 *   2. height cap so the inner regions own their own scroll
 *
 * Everything else (toolbar, navigator, detail router, filter modal,
 * pagination footer) is inherited from the canonical view via mode='product'.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProjectAllWorkView from '../../project-hub/jira-list/ProjectAllWorkView';

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
      <ProjectAllWorkView
        projectKey={key!.toUpperCase()}
        projectId={product?.id}
        productName={product?.name}
        mode="product"
      />
    </div>
  );
}
