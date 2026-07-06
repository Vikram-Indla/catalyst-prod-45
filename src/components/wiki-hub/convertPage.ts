/**
 * convertPage — turn a Docex page into a work item (CAT-DOCEX-DB-COEDIT-
 * 20260705-001 V6, Vikram 2026-07-06: pages must convert into epics /
 * business requests, staying linked).
 *
 * Insert shapes mirror the canonical creators exactly:
 *  - Epic → ph_issues, same row InlineCreateCard's PROJECT branch writes
 *    (issue keys via generateIssueKey).
 *  - Business request → business_requests, same row the kanban BR branch
 *    writes (global MIM-N keyspace, mirroring generateRequestKey).
 * Both then link the page via kb_document_links so the page appears in the
 * work item's Pages section and the page's backlinks.
 */
import { supabase } from '@/integrations/supabase/client';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';

const db = supabase as unknown as { from: (t: string) => any };

async function linkPage(documentId: string, entityType: 'epic' | 'business_request', entityId: string) {
  const { error } = await db.from('kb_document_links').insert({
    document_id: documentId,
    entity_type: entityType,
    entity_id: entityId,
    link_origin: 'manual',
  });
  if (error) throw error;
}

export async function convertPageToEpic(input: {
  pageId: string;
  title: string;
  bodyText: string;
  projectKey: string;
}): Promise<{ key: string }> {
  const nowIso = new Date().toISOString();
  const issueKey = await generateIssueKey(input.projectKey);
  const { data, error } = await db
    .from('ph_issues')
    .insert({
      project_key: input.projectKey,
      issue_key: issueKey,
      summary: input.title || 'Untitled',
      issue_type: 'Epic',
      status: 'To Do',
      priority: 'Medium',
      labels: [],
      source: 'catalyst',
      jira_created_at: nowIso,
      jira_updated_at: nowIso,
      description_text: input.bodyText || null,
      description_adf: null,
      parent_key: null,
    })
    .select('id, issue_key')
    .single();
  if (error) throw error;
  await linkPage(input.pageId, 'epic', data.id as string);
  return { key: data.issue_key as string };
}

/* Mirrors generateRequestKey in ProductHubTimelinePage/useKanbanMutations —
   BRs share one global MIM-N keyspace regardless of product. */
async function nextRequestKey(): Promise<string> {
  const { data } = await db
    .from('business_requests')
    .select('request_key')
    .not('request_key', 'is', null)
    .limit(2000);
  let maxNum = 0;
  ((data ?? []) as Array<{ request_key: string | null }>).forEach((r) => {
    const m = r.request_key?.match(/MIM-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  if (maxNum === 0) return `MIM-${Date.now().toString().slice(-6)}`;
  return `MIM-${maxNum + 1}`;
}

export async function convertPageToBusinessRequest(input: {
  pageId: string;
  title: string;
  productId: string;
}): Promise<{ key: string }> {
  const nowIso = new Date().toISOString();
  const requestKey = await nextRequestKey();
  const { data, error } = await db
    .from('business_requests')
    .insert({
      request_key: requestKey,
      product_id: input.productId,
      title: input.title || 'Untitled',
      process_step: 'new_request',
      urgency: 'Medium',
      is_flagged: false,
      tags: [],
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, request_key')
    .single();
  if (error) throw error;
  await linkPage(input.pageId, 'business_request', data.id as string);
  return { key: data.request_key as string };
}
