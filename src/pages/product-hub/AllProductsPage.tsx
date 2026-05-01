/**
 * AllProductsPage — /product-hub/products
 *
 * Block C/D (2026-05-01) — Product Hub's "All Products" listing. Mirrors
 * /project-hub/projects (the Catalyst canonical for hub-listing pages):
 * Atlaskit @atlaskit/dynamic-table, RouterLink anchors on the Key cell,
 * row body inert (cursor:default per Block B) so middle-click and Cmd-click
 * open the workstream in a new tab.
 *
 * Data source — public.products (the existing canonical products table,
 * created in migration 20251222204958). Already seeded with MINI / SEN /
 * ENT / UNA. business_requests.product_id is the existing FK. The
 * Block-C-era producthub_workstreams table was a redundant parallel and
 * is now orphaned — to be cleaned up in a follow-up migration that
 * remaps mim_business_requests.product_id at public.products.
 *
 * Drilldown route — /product-hub/{KEY}/dashboard|backlog|kanban|... — these
 * mounts come in the follow-on patch; for now the Key cell anchors at
 * /product-hub/{KEY}/backlog (which the existing FullAppRoutes maps to
 * RequestListingPage as the canonical Product Backlog).
 */

import { useMemo, useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DynamicTable from '@atlaskit/dynamic-table';
import EmptyState from '@atlaskit/empty-state';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

// Phase 4 (2026-05-02) — lazy-load the create modal so the listing page
// doesn't pay the cost when the user never clicks the button.
const CreateProductModal = lazy(() =>
  import('@/components/product-hub/CreateProductModal').then((m) => ({ default: m.CreateProductModal })),
);

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  owner_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const HEAD = {
  cells: [
    { key: 'key',     content: 'Key',     isSortable: true, width: 12 },
    { key: 'name',    content: 'Name',    isSortable: true, width: 30 },
    { key: 'desc',    content: 'Description', isSortable: false, width: 38 },
    { key: 'lead',    content: 'Lead',    isSortable: false, width: 14 },
    { key: 'members', content: 'Members', isSortable: false, width: 6 },
  ],
};

export default function AllProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['product-hub', 'products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, code, name, description, color, owner_id, is_active, sort_order, created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as Product[]) ?? [];
    },
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    if (!products) return [];
    return products.map((p) => ({
      key: p.id,
      cells: [
        {
          key: 'key',
          content: (
            <RouterLink
              to={`/product-hub/${p.code}/backlog`}
              style={{
                fontFamily: 'var(--cp-font-mono)',
                fontSize: 12,
                fontWeight: 600,
                color: token('color.link'),
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {p.code}
            </RouterLink>
          ),
        },
        {
          key: 'name',
          content: (
            <RouterLink
              to={`/product-hub/${p.code}/backlog`}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: token('color.text'),
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {p.name}
            </RouterLink>
          ),
        },
        {
          key: 'desc',
          content: (
            <span style={{
              fontSize: 13,
              color: token('color.text.subtle'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              maxWidth: '100%',
            }}>
              {p.description || '—'}
            </span>
          ),
        },
        {
          key: 'lead',
          content: p.owner_id ? (
            <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Avatar size="small" />
              <span style={{ fontSize: 13, color: token('color.text.subtle') }}>Owner</span>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: token('color.text.subtlest') }}>— Unassigned</span>
          ),
        },
        {
          key: 'members',
          content: (
            <Lozenge appearance="default">0</Lozenge>
          ),
        },
      ],
    }));
  }, [products]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <CatalystPageHeader title="Products" />
        {/* Phase 4 (2026-05-02) — Create Product button mirrors Project Hub's
            "+ New project" affordance on /project-hub/projects. Opens
            CreateProductModal which inserts into public.products via
            supabase-js (so the row goes through PostgREST and is immediately
            visible to the same client that created it). */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 4,
            border: 'none',
            background: token('color.background.brand.bold'),
            color: token('color.text.inverse'),
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={16} />
          Create product
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {error ? (
          <EmptyState
            header="Couldn't load products"
            description={
              <span>
                Could not query <code>public.products</code>. Check the browser
                console for the Supabase error code.
              </span>
            }
          />
        ) : (
          <DynamicTable
            head={HEAD}
            rows={rows}
            isLoading={isLoading}
            loadingSpinnerSize="large"
            emptyView={
              <EmptyState
                header="No active products"
                description={
                  <span>
                    No rows in <code>public.products</code> with
                    <code> is_active=true</code>.
                  </span>
                }
              />
            }
            rowsPerPage={20}
            defaultPage={1}
            defaultSortKey="key"
            defaultSortOrder="ASC"
          />
        )}
      </div>

      {/* Phase 4 (2026-05-02) — lazy-rendered create modal. */}
      <Suspense fallback={null}>
        {createOpen && (
          <CreateProductModal open={createOpen} onClose={() => setCreateOpen(false)} />
        )}
      </Suspense>
    </div>
  );
}
