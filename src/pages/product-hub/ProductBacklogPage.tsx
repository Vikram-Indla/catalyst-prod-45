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

import { supabase } from '@/integrations/supabase/client';
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import {
  useBusinessRequestsSource,
  type ProductInfo,
} from '@/modules/project-work-hub/adapters/backlogDataSource';
import { ProductHeaderChip } from '@/components/layout/ProductHeaderChip';

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
  // `allowedColumnIds` gates the column picker (and the columns rendered
  // by default) to ONLY those that correspond to fields in the Create
  // modal opened from the top "+ Create" button on this route — minus
  // `Summary` and `Description` which are not column-worthy. `key` is the
  // structural row identifier and is kept regardless so users can click
  // into the detail view.
  //
  // Modal field → column id mapping (note label vs id where they differ):
  //   Work Type   → 'request_type'    (column label: 'Type')
  //   Status      → 'status'
  //   Parent      → 'parent'
  //   Priority    → 'priority'        (the BR adapter maps urgency → priority,
  //                                    so this column reads the BR's urgency
  //                                    value via the adapter; `urgency` column
  //                                    is omitted to avoid two "Priority" rows
  //                                    in the picker)
  //   Release → 'sprint_release'
  //   Assignee    → 'assignee'        (adapter maps Delivery Manager → assignee_name)
  //   Reporter    → 'reporter'        (adapter maps Product Owner → reporter_name)
  //   Labels      → 'labels'
  const adapterWithChrome = {
    ...adapter,
    ChromeHeader: ({ productCode }: { productCode: string; productName: string }) => <ProductHeaderChip productCode={productCode} />,
    allowedColumnIds: [
      'key',             // structural row identifier
      'request_type',    // modal: Work Type (rendered as "Type")
      'status',          // modal: Status
      'parent',          // modal: Parent
      'priority',        // modal: Priority
      'sprint_release',  // modal: Release
      'assignee',        // modal: Assignee
      'reporter',        // modal: Reporter
      'labels',          // modal: Labels
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
