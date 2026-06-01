/**
 * ProductBacklogPage — /product-hub/:key/backlog
 *
 * Renders the canonical BacklogPage component from project-work-hub with a
 * business_requests-backed dataSource adapter. No parallel imitation — every
 * UI feature (toolbar, Ask Caty, column picker, inline edit, bulk actions,
 * drag-to-rank, group-by, URL state) is inherited from the project-hub
 * canonical and stays in sync with it automatically.
 *
 * Differences from project hub:
 *   - Data source: business_requests (filtered by product_id)
 *   - Statuses:    demand_process_steps (instead of Jira status vocabulary)
 *   - Chrome band: product chip (icon + name + code)
 *
 * Everything else is identical by design.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';

import { supabase } from '@/integrations/supabase/client';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import {
  useBusinessRequestsSource,
  type ProductInfo,
} from '@/modules/project-work-hub/adapters/backlogDataSource';

// ─── Product resolution ──────────────────────────────────────────────────────

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

// ─── Product chrome band ─────────────────────────────────────────────────────

function ProductChromeHeader({ productCode, productName }: { productCode: string; productName: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <div style={{
        width: 24, height: 24, borderRadius: 4, flexShrink: 0,
        background: token('color.background.brand.bold', '#0052CC'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: token('color.text.inverse', '#FFFFFF'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        {(productCode || '').slice(0, 2).toUpperCase()}
      </div>
      <span style={{
        fontSize: 20, fontWeight: 500,
        color: token('color.text', '#172B4D'),
        lineHeight: '24px',
        fontFamily: 'var(--cp-font-body)',
      }}>
        {productName}
      </span>
      <span style={{
        fontSize: 12,
        color: token('color.text.subtlest', '#626F86'),
        fontFamily: 'var(--cp-font-mono)',
        marginLeft: 4,
      }}>
        {productCode}
      </span>
    </div>
  );
}

// ─── Page entry ──────────────────────────────────────────────────────────────

export default function ProductBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const { product, loading: productLoading } = useProductInfo(key);
  const adapter = useBusinessRequestsSource(product);

  if (productLoading || !product || !adapter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  // Inject ChromeHeader into the adapter at render time so it stays in sync
  // with product changes (without forcing the adapter hook to depend on JSX).
  //
  // 2026-06-01: `allowedColumnIds` gates the column picker to ONLY columns
  // that apply to business_requests (the slim 22-column schema). Hides the
  // project-only columns (parent, fix_versions, labels, assignee, due_date,
  // priority, reporter, comments) inherited from the project hub registry.
  // BR-specific columns (theme, stakeholders, urgency-as-Priority, etc.)
  // will be added to the registry in a follow-up PR; for now the product
  // picker exposes only the columns that already exist AND apply to BRs.
  const adapterWithChrome = {
    ...adapter,
    ChromeHeader: ProductChromeHeader,
    allowedColumnIds: [
      'key',
      'status',
      'request_type',
      'category',
      'theme',
      'urgency',
      'planned_quarter',
      'target_date',
      'delivery_manager',
      'product_owner',
      'stakeholders',
      'targeted_feature',
      'created',
      'updated',
    ] as const,
  };

  return (
    <BacklogPage
      projectId={product.id}
      projectKey={product.code}
      displayName={product.name}
      baseUrl={`/product-hub/${product.code}`}
      dataSource={adapterWithChrome}
    />
  );
}
