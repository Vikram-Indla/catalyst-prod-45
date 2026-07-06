/**
 * cloneBusinessRequest — Product Hub clone helper (`business_requests`).
 *
 * Scoped to the same product (product_id preserved). Deep-copies each section
 * only when the caller's `include` flag says so; unchecked sections stay empty
 * on the clone. Vikram's call (2026-07-04): the Assignee column mapped in the
 * clone dialog is `business_requests.assignee` (display-name text), not
 * `business_owner_id`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ClonePatch } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import type { CloneCatalogEntry } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';

export const BUSINESS_REQUEST_INCLUDE_CATALOG: CloneCatalogEntry[] = [
  { key: 'links', label: 'Links & attachments' },
  { key: 'discussions', label: 'Discussions' },
  { key: 'milestones', label: 'Milestones' },
];

async function generateRequestKey(): Promise<string> {
  const { data, error } = await (supabase as any)
    .from('business_requests')
    .select('request_key')
    .not('request_key', 'is', null)
    .limit(1000);
  if (error) {
    const timestamp = Date.now().toString().slice(-5);
    return `MDT-${timestamp}`;
  }
  let maxNum = 0;
  ((data ?? []) as Array<{ request_key: string | null }>).forEach((row) => {
    if (row.request_key) {
      const match = row.request_key.match(/MDT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  const next = String(maxNum + 1).padStart(5, '0');
  return `MDT-${next}`;
}

export async function fetchBusinessRequestSectionCounts(brId: string): Promise<Record<string, number>> {
  const countExact = (p: PromiseLike<{ count: number | null; error: unknown }>) =>
    p.then((r) => (r.error ? 0 : r.count ?? 0));

  const [links, discussions, milestones] = await Promise.all([
    countExact(
      (supabase as any)
        .from('business_request_links')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', brId),
    ),
    countExact(
      (supabase as any)
        .from('business_request_discussions')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', brId),
    ),
    countExact(
      (supabase as any)
        .from('business_request_milestone_links')
        .select('id', { count: 'exact', head: true })
        .eq('business_request_id', brId),
    ),
  ]);

  return { links, discussions, milestones };
}

export async function cloneBusinessRequest(sourceId: string, patch?: ClonePatch): Promise<string> {
  const { data: original, error: fetchError } = await (supabase as any)
    .from('business_requests')
    .select(
      'id, request_key, title, description, product_id, ' +
      'assignee, business_owner, business_owner_id, requestor, ' +
      'category, priority_tier, urgency, request_type, ' +
      'process_step, start_date, end_date, planned_quarter, quarter, ' +
      'business_justification, proposed_solution, acceptance_criteria, ' +
      'labels, tags, stakeholders',
    )
    .eq('id', sourceId)
    .single();
  if (fetchError) throw fetchError;
  if (!original) throw new Error(`cloneBusinessRequest: request ${sourceId} not found`);

  const orig = original as Record<string, any>;
  const newKey = await generateRequestKey();

  const patchedSummary = patch?.summary?.trim();
  const finalTitle = patchedSummary && patchedSummary.length > 0
    ? patchedSummary
    : `Copy of ${orig.title ?? ''}`;

  /* Vikram directive 2026-07-04: BR "Assignee" maps to `assignee` (text column,
     stores the display name). If patch supplies a name, prefer it; else inherit. */
  const finalAssignee = patch?.assigneeName !== undefined
    ? patch.assigneeName
    : orig.assignee ?? null;

  const insertPayload: Record<string, any> = {
    request_key: newKey,
    title: finalTitle,
    description: orig.description ?? null,
    product_id: orig.product_id ?? null,
    assignee: finalAssignee,
    business_owner: orig.business_owner ?? null,
    business_owner_id: orig.business_owner_id ?? null,
    requestor: orig.requestor ?? null,
    category: orig.category ?? null,
    priority_tier: orig.priority_tier ?? null,
    urgency: orig.urgency ?? null,
    request_type: orig.request_type ?? null,
    process_step: 'draft',
    start_date: orig.start_date ?? null,
    end_date: orig.end_date ?? null,
    planned_quarter: orig.planned_quarter ?? null,
    quarter: orig.quarter ?? null,
    business_justification: orig.business_justification ?? null,
    proposed_solution: orig.proposed_solution ?? null,
    acceptance_criteria: orig.acceptance_criteria ?? null,
    labels: orig.labels ?? [],
    tags: orig.tags ?? null,
    stakeholders: orig.stakeholders ?? [],
  };

  const { data: inserted, error: insertError } = await (supabase as any)
    .from('business_requests')
    .insert(insertPayload)
    .select('id, request_key')
    .single();
  if (insertError) throw insertError;

  const newId = (inserted as any).id as string;
  const include = patch?.include ?? {};

  const tasks: Array<Promise<unknown>> = [];
  if (include.links) tasks.push(copyLinks(sourceId, newId));
  if (include.discussions) tasks.push(copyDiscussions(sourceId, newId));
  if (include.milestones) tasks.push(copyMilestoneLinks(sourceId, newId));
  await Promise.allSettled(tasks);

  return newKey;
}

async function copyLinks(sourceId: string, newId: string) {
  const { data } = await (supabase as any)
    .from('business_request_links')
    .select('title, url, link_type, kind, file_name, file_path, file_size, mime_type, linked_item_id, linked_item_type, linked_item_source, added_by_name, uploaded_by')
    .eq('business_request_id', sourceId);
  if (!data?.length) return;
  await (supabase as any).from('business_request_links').insert(
    data.map((r: any) => ({ ...r, business_request_id: newId })),
  );
}

async function copyDiscussions(sourceId: string, newId: string) {
  const { data } = await (supabase as any)
    .from('business_request_discussions')
    .select('message, user_id')
    .eq('business_request_id', sourceId);
  if (!data?.length) return;
  await (supabase as any).from('business_request_discussions').insert(
    data.map((r: any) => ({ ...r, business_request_id: newId })),
  );
}

async function copyMilestoneLinks(sourceId: string, newId: string) {
  const { data } = await (supabase as any)
    .from('business_request_milestone_links')
    .select('*')
    .eq('business_request_id', sourceId);
  if (!data?.length) return;
  const cleaned = data.map((r: any) => {
    const { id, created_at, updated_at, ...rest } = r;
    return { ...rest, business_request_id: newId };
  });
  await (supabase as any).from('business_request_milestone_links').insert(cleaned);
}
