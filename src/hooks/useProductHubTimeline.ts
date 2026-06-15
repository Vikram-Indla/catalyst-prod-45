/**
 * useProductHubTimeline — fetches business_requests for a product (resolved by
 * code, e.g. "INV") and normalises them to the shared TimelineIssue shape
 * consumed by the canonical TimelineView.
 *
 * BR rows are flat (no parent_key chain), have only end_date (no startDate),
 * and render as diamond markers in the grid. Assignee display name + avatar
 * are resolved from profiles via the project_manager_user_id FK.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { TimelineIssue } from '@/components/shared/Timeline';

const BR_SELECT = `
  id,
  request_key,
  product_id,
  request_type,
  title,
  process_step,
  urgency,
  project_manager_user_id,
  end_date,
  created_at,
  updated_at
`;

/* Map request_type (the BR subtype) to a JiraIssueTypeIcon `type` value so
   the row icon + filter chip render correctly. */
function requestTypeToIconType(requestType: string | null): string {
  if (!requestType) return 'Business Request';
  const map: Record<string, string> = {
    'Feature': 'Feature',
    'feature': 'Feature',
    'Gap': 'Business Gap',
    'gap': 'Business Gap',
    'Business Gap': 'Business Gap',
    'Integration': 'Integration',
    'integration': 'Integration',
    'Data Request': 'Business Request',
    'data_request': 'Business Request',
  };
  return map[requestType] ?? 'Business Request';
}

/* Map process_step → Jira-style status_category so the bar / status pill
   colour reflects done / in-progress / to-do without coupling to per-product
   step labels. */
function statusCategoryFromStep(step: string | null): string {
  const s = (step ?? '').toLowerCase();
  if (!s) return 'default';
  if (s.includes('done') || s.includes('completed') || s.includes('shipped') || s.includes('closed')) return 'done';
  if (s.includes('progress') || s.includes('in dev') || s.includes('build') || s.includes('design') || s.includes('discovery')) return 'progress';
  return 'default';
}

export function useProductHubTimeline(productCode: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-hub-timeline', productCode],
    queryFn: async (): Promise<TimelineIssue[]> => {
      if (!productCode) return [];

      /* Step 1 — resolve product code → UUID */
      const { data: product } = await (supabase as any)
        .from('products')
        .select('id')
        .eq('code', productCode)
        .eq('is_active', true)
        .maybeSingle();
      if (!product?.id) return [];

      /* Step 2 — fetch business_requests for this product */
      const { data: brs, error: brErr } = await (supabase as any)
        .from('business_requests')
        .select(BR_SELECT)
        .eq('product_id', product.id)
        .is('deleted_at', null)
        .order('end_date', { ascending: true, nullsFirst: false });
      if (brErr) throw brErr;

      const rows = brs ?? [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.project_manager_user_id).filter(Boolean)));

      /* Step 3 — resolve assignee names + avatars in one batch */
      const nameById = new Map<string, { name: string; avatarUrl: string | null }>();
      if (userIds.length) {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        for (const p of profiles ?? []) {
          nameById.set(p.id, {
            name: p.full_name ?? '',
            avatarUrl: p.avatar_url ?? resolveAvatarUrl(p.full_name ?? ''),
          });
        }
      }

      /* Step 4 — map to TimelineIssue */
      return rows.map((r: any): TimelineIssue => {
        const assignee = r.project_manager_user_id ? nameById.get(r.project_manager_user_id) ?? null : null;
        return {
          id: r.id,
          issueKey: r.request_key ?? r.id,
          projectKey: productCode,
          issueType: requestTypeToIconType(r.request_type),
          summary: r.title ?? '(Untitled request)',
          status: r.process_step ?? '',
          statusCategory: statusCategoryFromStep(r.process_step),
          priority: r.urgency ?? null,
          assigneeDisplayName: assignee?.name ?? null,
          assigneeAvatarUrl: assignee?.avatarUrl ?? null,
          parentKey: null,
          startDate: null,
          dueDate: r.end_date ?? null,
          epicColor: null,
          fixVersions: [],
          children: [],
        };
      });
    },
    enabled: !!productCode && !!user,
    staleTime: 30_000,
  });
}
