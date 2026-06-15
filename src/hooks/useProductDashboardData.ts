/**
 * useProductDashboardData — single BR fetch shared across all product
 * dashboard widgets so the 6 surviving widgets don't each fire their own
 * Supabase round-trip.
 *
 * Output is a denormalised "BoardItem" shape that mirrors the bits each
 * widget needs:
 *   - status / process_step  (Items by Status, On Hold)
 *   - end_date              (Overdue)
 *   - planned_quarter       (Release Health)
 *   - project_manager       (Team Workload)
 *   - urgency               (priority chips)
 *
 * The hook is mode-agnostic on the surface — if `productId` is null/empty
 * it short-circuits. Widgets that prefer their own hook in project mode
 * just don't call this one.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductBrRow {
  id: string;
  requestKey: string;
  title: string;
  processStep: string | null;
  urgency: string | null;
  plannedQuarter: string[] | null;
  endDate: string | null;
  startDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  projectManagerUserId: string | null;
  projectManagerName: string | null;
  poUserId: string | null;
  poName: string | null;
  isFlagged: boolean;
  tags: string[];
}

export interface ProductDashboardData {
  rows: ProductBrRow[];
  /** Count summary used by Items by Status. */
  counts: {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    blocked: number;
    blockedDetail: { onHold: number; awaitingInfo: number; blocked: number };
  };
}

const DONE_STEPS = new Set(['done', 'approved', 'completed', 'closed']);
const TODO_STEPS = new Set(['new', 'new_request', 'backlog', 'planned', 'ready', 'ready for development']);
const ON_HOLD_STEPS = new Set(['on hold', 'on_hold', 'paused']);
const BLOCKED_STEPS = new Set(['blocked']);
const AWAITING_INFO_STEPS = new Set(['awaiting info', 'awaiting_info', 'in review']);

function bucketFor(step: string | null): 'done' | 'todo' | 'inProgress' | 'blocked' {
  const s = (step ?? '').toLowerCase().trim();
  if (DONE_STEPS.has(s)) return 'done';
  if (TODO_STEPS.has(s)) return 'todo';
  if (ON_HOLD_STEPS.has(s) || BLOCKED_STEPS.has(s) || AWAITING_INFO_STEPS.has(s)) return 'blocked';
  return 'inProgress';
}

export function useProductDashboardData(productId: string | null | undefined) {
  return useQuery<ProductDashboardData>({
    queryKey: ['product-dashboard-data', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const empty: ProductDashboardData = {
        rows: [],
        counts: {
          total: 0, done: 0, inProgress: 0, todo: 0, blocked: 0,
          blockedDetail: { onHold: 0, awaitingInfo: 0, blocked: 0 },
        },
      };
      if (!productId) return empty;

      const { data: brs } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, process_step, urgency, planned_quarter, end_date, start_date, created_at, updated_at, project_manager_user_id, po_user_id, is_flagged, tags')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .limit(2000);
      if (!brs?.length) return empty;

      const userIds = Array.from(new Set(
        (brs as any[]).flatMap((r) => [r.project_manager_user_id, r.po_user_id].filter(Boolean)),
      )) as string[];
      const nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name').in('id', userIds);
        ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).forEach((p) => {
          if (p.full_name) nameMap.set(p.id, p.full_name);
        });
      }

      const rows: ProductBrRow[] = (brs as any[]).map((r) => ({
        id: r.id,
        requestKey: r.request_key ?? r.id,
        title: r.title ?? '',
        processStep: r.process_step ?? null,
        urgency: r.urgency ?? null,
        plannedQuarter: Array.isArray(r.planned_quarter) ? r.planned_quarter : null,
        endDate: r.end_date ?? null,
        startDate: r.start_date ?? null,
        createdAt: r.created_at ?? null,
        updatedAt: r.updated_at ?? null,
        projectManagerUserId: r.project_manager_user_id ?? null,
        projectManagerName: r.project_manager_user_id
          ? (nameMap.get(r.project_manager_user_id) ?? null) : null,
        poUserId: r.po_user_id ?? null,
        poName: r.po_user_id ? (nameMap.get(r.po_user_id) ?? null) : null,
        isFlagged: !!r.is_flagged,
        tags: Array.isArray(r.tags) ? r.tags : [],
      }));

      let done = 0, inProgress = 0, todo = 0, blocked = 0;
      let onHold = 0, awaitingInfo = 0, blockedOnly = 0;
      for (const r of rows) {
        const b = bucketFor(r.processStep);
        if (b === 'done') done++;
        else if (b === 'todo') todo++;
        else if (b === 'blocked') {
          blocked++;
          const s = (r.processStep ?? '').toLowerCase().trim();
          if (ON_HOLD_STEPS.has(s)) onHold++;
          else if (AWAITING_INFO_STEPS.has(s)) awaitingInfo++;
          else blockedOnly++;
        } else inProgress++;
      }

      return {
        rows,
        counts: {
          total: rows.length, done, inProgress, todo, blocked,
          blockedDetail: { onHold, awaitingInfo, blocked: blockedOnly },
        },
      };
    },
  });
}
