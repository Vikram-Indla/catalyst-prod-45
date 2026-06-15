/**
 * useProductHubTimeline — fetches business_requests for a product (resolved by
 * code, e.g. "INV") and normalises them to the shared TimelineIssue shape
 * consumed by the canonical TimelineView.
 *
 * BR rows have only end_date (no startDate) and render as diamond markers
 * on the grid. Assignee display name + avatar are resolved from profiles via
 * the project_manager_user_id FK.
 *
 * 2026-06-15 — BRs are parents. Each BR is rendered as a top-level row in
 * a flat list (no synthetic group buckets). Any `ph_issues` row whose
 * `parent_key` matches a BR's `request_key` is fetched + nested under that
 * BR as a child. The view renders BR rows as the canonical "Epic-like"
 * parent — collapsible, with a "+" that creates a sub-task child via the
 * page's mutations.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { TimelineIssue } from '@/components/shared/Timeline';

/* Two BR SELECT variants — the "new" one reads the columns added by the
 * 2026-06-16 migration (display_order, color_hex). The legacy one is the
 * pre-migration column set. The hook attempts the new SELECT first and
 * falls back to legacy on PostgREST 42703 (column does not exist) so the
 * page keeps rendering even before the migration has been applied. */
const BR_SELECT_NEW = `
  id,
  request_key,
  product_id,
  request_type,
  title,
  process_step,
  urgency,
  project_manager_user_id,
  end_date,
  display_order,
  color_hex,
  created_at,
  updated_at
`;

const BR_SELECT_LEGACY = `
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

/* Same defensive pattern for ph_issues — position has been on the table
 * for a long time, but children sort relies on it; if a row predates the
 * column we fall back to nulls. */
const PH_CHILD_SELECT_NEW = `
  id, issue_key, project_key, issue_type, summary, status, status_category,
  priority, assignee_display_name, parent_key, position, raw_json
`;

const PH_CHILD_SELECT_LEGACY = `
  id, issue_key, project_key, issue_type, summary, status, status_category,
  priority, assignee_display_name, parent_key, raw_json
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

function mapPhChildRow(row: any): TimelineIssue {
  const raw = row.raw_json ?? {};
  const fields = raw.fields ?? {};
  return {
    id: row.id,
    issueKey: row.issue_key,
    projectKey: row.project_key,
    issueType: row.issue_type ?? 'Sub-task',
    summary: row.summary ?? '(No title)',
    status: row.status ?? 'To Do',
    statusCategory: row.status_category ?? null,
    priority: row.priority ?? null,
    assigneeDisplayName: row.assignee_display_name ?? null,
    assigneeAvatarUrl: resolveAvatarUrl(row.assignee_display_name ?? ''),
    parentKey: row.parent_key,
    startDate: typeof fields.customfield_10015 === 'string' ? fields.customfield_10015 : null,
    dueDate: typeof fields.duedate === 'string' ? fields.duedate : null,
    epicColor: fields.catalyst_color ?? null,
    fixVersions: Array.isArray(fields.fixVersions) ? fields.fixVersions.map((v: any) => v?.name ?? '').filter(Boolean) : [],
    children: [],
    displayOrder: typeof row.position === 'number' ? row.position : null,
  };
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

      /* Step 2 — fetch business_requests for this product. Try the new
         column set first; fall back to legacy when the migration that
         adds display_order + color_hex hasn't been applied yet (PostgREST
         42703 = undefined column). */
      let brs: any[] = [];
      {
        const attempt = await (supabase as any)
          .from('business_requests')
          .select(BR_SELECT_NEW)
          .eq('product_id', product.id)
          .is('deleted_at', null)
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('end_date', { ascending: true, nullsFirst: false });
        if (attempt.error) {
          const code = (attempt.error as { code?: string } | null)?.code ?? '';
          const msg = (attempt.error as { message?: string } | null)?.message ?? '';
          const isMissingCol = code === '42703'
            || /display_order|color_hex/i.test(msg);
          if (!isMissingCol) throw attempt.error;
          const legacy = await (supabase as any)
            .from('business_requests')
            .select(BR_SELECT_LEGACY)
            .eq('product_id', product.id)
            .is('deleted_at', null)
            .order('end_date', { ascending: true, nullsFirst: false });
          if (legacy.error) throw legacy.error;
          brs = legacy.data ?? [];
        } else {
          brs = attempt.data ?? [];
        }
      }

      const rows = brs;
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

      /* Step 4 — map each BR to a TimelineIssue */
      const brIssues: TimelineIssue[] = rows.map((r: any): TimelineIssue => {
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
          epicColor: r.color_hex ?? null,
          fixVersions: [],
          children: [],
          displayOrder: typeof r.display_order === 'number' ? r.display_order : null,
        };
      });

      /* Step 5 — fetch ph_issues children whose parent_key references a BR
         in this product, then nest them under their BR parent. Catalyst-
         created children carry source='catalyst', so we don't apply the
         2026 guard here (it's the BR's children, not a fresh Jira pull). */
      const brKeys = brIssues.map(b => b.issueKey).filter(Boolean);
      if (brKeys.length > 0) {
        let childRows: any[] = [];
        const childAttempt = await (supabase as any)
          .from('ph_issues')
          .select(PH_CHILD_SELECT_NEW)
          .in('parent_key', brKeys)
          .is('jira_removed_at', null)
          .is('archived_at', null)
          .is('deleted_at', null);
        if (childAttempt.error) {
          const code = (childAttempt.error as { code?: string } | null)?.code ?? '';
          const msg = (childAttempt.error as { message?: string } | null)?.message ?? '';
          const isMissingCol = code === '42703' || /position/i.test(msg);
          if (!isMissingCol) throw childAttempt.error;
          const legacy = await (supabase as any)
            .from('ph_issues')
            .select(PH_CHILD_SELECT_LEGACY)
            .in('parent_key', brKeys)
            .is('jira_removed_at', null)
            .is('archived_at', null)
            .is('deleted_at', null);
          if (legacy.error) throw legacy.error;
          childRows = legacy.data ?? [];
        } else {
          childRows = childAttempt.data ?? [];
        }

        const byParent = new Map<string, TimelineIssue[]>();
        for (const row of childRows ?? []) {
          const child = mapPhChildRow(row);
          const arr = byParent.get(row.parent_key) ?? [];
          arr.push(child);
          byParent.set(row.parent_key, arr);
        }
        for (const br of brIssues) {
          const kids = byParent.get(br.issueKey);
          if (kids && kids.length) {
            kids.sort((a, b) => {
              const ao = a.displayOrder ?? Number.POSITIVE_INFINITY;
              const bo = b.displayOrder ?? Number.POSITIVE_INFINITY;
              if (ao !== bo) return ao - bo;
              return a.issueKey.localeCompare(b.issueKey);
            });
            br.children = kids;
          }
        }
      }

      return brIssues;
    },
    enabled: !!productCode && !!user,
    staleTime: 30_000,
  });
}
