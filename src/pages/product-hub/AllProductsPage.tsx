/**
 * AllProductsPage — /product-hub/products
 *
 * Block C/D (2026-05-01) — Product Hub's "All Products" listing. Mirrors
 * /project-hub/projects (the Catalyst canonical for hub-listing pages):
 * Atlaskit @atlaskit/dynamic-table, RouterLink anchors on the Key cell,
 * row body inert (cursor:default per Block B) so middle-click and Cmd-click
 * open the workstream in a new tab.
 *
 * Data source — public.producthub_workstreams (created by Block C SQL).
 * If the table doesn't exist yet (Vikram hasn't run block_c_workstreams.sql),
 * the page renders an empty state pointing at the migration file.
 *
 * Drilldown route — /product-hub/{KEY}/dashboard|backlog|kanban|... — these
 * mounts come in the follow-on patch; for now the Key cell anchors at
 * /product-hub/{KEY}/backlog (which the existing FullAppRoutes maps to
 * RequestListingPage as the canonical Product Backlog).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DynamicTable from '@atlaskit/dynamic-table';
import EmptyState from '@atlaskit/empty-state';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';

interface Workstream {
  id: string;
  key: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  member_ids: string[] | null;
  is_archived: boolean;
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
  const { data: workstreams, isLoading, error } = useQuery({
    queryKey: ['product-hub', 'workstreams'],
    queryFn: async () => {
      // Use any-cast because producthub_workstreams isn't in the
      // generated Supabase types yet — it lands when Vikram runs
      // block_c_workstreams.sql.
      const { data, error } = await (supabase as any)
        .from('producthub_workstreams')
        .select('id, key, name, description, lead_id, member_ids, is_archived, created_at')
        .eq('is_archived', false)
        .order('key', { ascending: true });
      if (error) throw error;
      return (data as Workstream[]) ?? [];
    },
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    if (!workstreams) return [];
    return workstreams.map((w) => ({
      key: w.id,
      cells: [
        {
          key: 'key',
          content: (
            <RouterLink
              to={`/product-hub/${w.key}/backlog`}
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
              {w.key}
            </RouterLink>
          ),
        },
        {
          key: 'name',
          content: (
            <RouterLink
              to={`/product-hub/${w.key}/backlog`}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: token('color.text'),
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {w.name}
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
              {w.description || '—'}
            </span>
          ),
        },
        {
          key: 'lead',
          content: w.lead_id ? (
            <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Avatar size="small" />
              <span style={{ fontSize: 13, color: token('color.text.subtle') }}>Lead</span>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: token('color.text.subtlest') }}>— Unassigned</span>
          ),
        },
        {
          key: 'members',
          content: (
            <Lozenge appearance="default">{w.member_ids?.length ?? 0}</Lozenge>
          ),
        },
      ],
    }));
  }, [workstreams]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      <CatalystPageHeader title="Products" />

      <div style={{ marginTop: 16 }}>
        {error ? (
          <EmptyState
            header="Couldn't load workstreams"
            description={
              <span>
                The <code>producthub_workstreams</code> table may not exist yet.
                Run <code>block_c_workstreams.sql</code> from your outputs
                folder in Supabase to provision it, then reload this page.
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
                header="No workstreams yet"
                description={
                  <span>
                    Once <code>block_c_workstreams.sql</code> runs, the seeded
                    <code> INV — Investor Journey </code>workstream appears here.
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
    </div>
  );
}
