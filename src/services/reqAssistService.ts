import { supabase, typedQuery, typedQuery, typedQuery } from '@/integrations/supabase/client';
import type { RADocumentWithArtifacts, RAProcessingJob } from '@/types/reqAssistV2';

// ── LIBRARY QUERIES ──

export async function fetchRADocuments(params?: {
  status?: string;
  search?: string;
}): Promise<RADocumentWithArtifacts[]> {
  let query = typedQuery('ra_documents')
    .select(`
      *,
      ra_artifacts(id, artifact_type, status),
      ra_processing_jobs(id, job_type, status, progress_pct, current_step, eta_seconds)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }
  if (params?.search) {
    query = query.or(
      `title.ilike.%${params.search}%,jira_ticket_key.ilike.%${params.search}%,domain.ilike.%${params.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((doc: any) => ({
    ...doc,
    artifact_counts: {
      brd:        (doc.ra_artifacts || []).filter((a: any) => a.artifact_type === 'brd' && a.status === 'ready').length,
      epics:      (doc.ra_artifacts || []).filter((a: any) => a.artifact_type === 'epics' && a.status === 'ready').length,
      uat:        (doc.ra_artifacts || []).filter((a: any) => a.artifact_type === 'uat' && a.status === 'ready').length,
      initiative: (doc.ra_artifacts || []).filter((a: any) => a.artifact_type === 'initiative' && a.status === 'ready').length,
    },
    generation_slots: {
      brd:   computeSlot(doc, 'brd'),
      epics: computeSlot(doc, 'epics'),
      uat:   computeSlot(doc, 'uat'),
      wiki:  doc.wikihub_synced ? 'done' : doc.status === 'processing' ? 'processing' : 'pending',
    },
  }));
}

function computeSlot(doc: any, type: string): 'done' | 'processing' | 'pending' | 'error' {
  const ready = (doc.ra_artifacts || []).some((a: any) => a.artifact_type === type && a.status === 'ready');
  if (ready) return 'done';
  const generating = (doc.ra_artifacts || []).some((a: any) => a.artifact_type === type && a.status === 'generating');
  if (generating) return 'processing';
  const failed = (doc.ra_artifacts || []).some((a: any) => a.artifact_type === type && a.status === 'failed');
  if (failed) return 'error';
  return 'pending';
}

export async function fetchRADocumentById(id: string) {
  const { data, error } = await typedQuery('ra_documents')
    .select(`*, ra_artifacts(*), ra_processing_jobs(*)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRAStats() {
  const [docs, artifacts, jobs, sync] = await Promise.all([
    typedQuery('ra_documents').select('id, status, wikihub_synced, wikihub_chunk_count').limit(2000),
    typedQuery('ra_artifacts').select('id, artifact_type').eq('status', 'ready').limit(1000),
    typedQuery('ra_processing_jobs').select('id').eq('status', 'processing').limit(100),
    typedQuery('ra_jira_sync_log').select('synced_at, project_key').order('synced_at', { ascending: false }).limit(1),
  ]);
  const total = docs.data?.length ?? 0;
  const wikis = docs.data?.filter((d: any) => d.wikihub_synced) ?? [];
  const chunks = wikis.reduce((s: number, d: any) => s + (d.wikihub_chunk_count ?? 0), 0);
  return {
    total_documents: total,
    wikihub_synced: wikis.length,
    wikihub_chunks: chunks,
    artifacts_generated: artifacts.data?.length ?? 0,
    processing_count: jobs.data?.length ?? 0,
    last_sync: sync.data?.[0]?.synced_at ?? null,
  };
}

// ── JOB POLLING ──

export async function fetchRAJobById(jobId: string) {
  const { data, error } = await typedQuery('ra_processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (error) throw error;
  return data as RAProcessingJob;
}

export async function fetchRAJobsByDocId(docId: string) {
  const { data, error } = await typedQuery('ra_processing_jobs')
    .select('*')
    .eq('ra_document_id', docId)
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RAProcessingJob[];
}

// ── MUTATIONS ──

export async function createRADocument(payload: {
  title: string;
  source_type: 'jira_pdf' | 'manual_upload' | 'text_generated';
  language: 'en' | 'ar';
  domain?: string;
  jira_ticket_key?: string;
  jira_project?: string;
  page_count?: number;
  content_raw?: string;
  status?: string;
}) {
  const { data, error } = await typedQuery('ra_documents')
    .insert({
      ...payload,
      jira_ticket_key: payload.jira_ticket_key ?? `GEN-${Date.now()}`,
      jira_project: payload.jira_project ?? 'MANUAL',
      status: payload.status ?? 'pending',
      wikihub_synced: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function queueProcessingJob(params: {
  ra_document_id: string;
  job_type: string;
  eta_seconds?: number;
}) {
  const { data, error } = await typedQuery('ra_processing_jobs')
    .insert({
      ra_document_id: params.ra_document_id,
      job_type: params.job_type,
      status: 'queued',
      progress_pct: 0,
      eta_seconds: params.eta_seconds ?? 120,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchJiraProjectTickets(projectKey: string) {
  // Query the Jira ticket cache table (ra_jira_tickets) for import candidates
  const { data, error } = await typedQuery('ra_jira_tickets')
    .select('ticket_key, ticket_summary, ticket_type, has_pdf, pdf_filename, page_count, project_key, project_name')
    .eq('project_key', projectKey)
    .order('ticket_key', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    jira_ticket_key: t.ticket_key,
    title: t.ticket_summary,
    page_count: t.page_count,
    has_pdf: t.has_pdf,
    pdf_filename: t.pdf_filename,
    jira_project: t.project_key,
    // No status field — these are import candidates, not library docs
    status: null,
  }));
}

// ── SYNC SINGLE BRD TO KB (C-01/C-02/C-06) ──

export async function syncSingleBrdToKb(brdDocumentId: string): Promise<void> {
  // 1. Fetch the document
  const { data: doc, error: fetchErr } = await typedQuery('brd_documents')
    .select('id, raw_text, jira_key, language')
    .eq('id', brdDocumentId)
    .single();

  if (fetchErr || !doc) throw new Error(fetchErr?.message || 'BRD document not found');
  if (!doc.raw_text || doc.raw_text.trim() === '') throw new Error('Document has no content to index');

  // 2. Upsert processing queue job (upsert to handle zombie re-runs)
  await typedQuery('brd_processing_queue').upsert({
    brd_id: brdDocumentId,
    status: 'processing',
    started_at: new Date().toISOString(),
    attempts: 1,
    error_message: null,
    completed_at: null,
  }, { onConflict: 'brd_id' });

  // 3. Invoke kb-sync Edge Function
  const { data: responseData, error: invokeErr } = await supabase.functions.invoke('kb-sync', {
    body: {
      action: 'sync_single',
      table: 'brd_documents',
      record_id: brdDocumentId,
      content_field: 'raw_text',
      source_type: 'brd_document',
      metadata: {
        source_id: brdDocumentId,
        brd_id: brdDocumentId,
        jira_key: doc.jira_key,
        language: doc.language || 'ar',
        title: doc.title,
        ingest_type: 'brd_sync',
      },
    },
  });

  if (invokeErr) {
    // Mark queue as failed
    await typedQuery('brd_processing_queue')
      .update({ status: 'failed', error_message: invokeErr.message?.substring(0, 500) })
      .eq('brd_id', brdDocumentId);
    throw invokeErr;
  }

  // Check if EF returned an error in the body
  if (responseData?.error) {
    await typedQuery('brd_processing_queue')
      .update({ status: 'failed', error_message: String(responseData.error).substring(0, 500) })
      .eq('brd_id', brdDocumentId);
    throw new Error(responseData.error);
  }

  // 4. On success: update pipeline_stage and queue
  await typedQuery('brd_documents')
    .update({ pipeline_stage: 'complete' })
    .eq('id', brdDocumentId);

  await typedQuery('brd_processing_queue')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('brd_id', brdDocumentId);
}

// ── BATCH EPIC COUNTS (per-document via jira_key → brd_id) ──

export async function fetchDocumentEpicCounts(
  jiraKeys: string[]
): Promise<Record<string, { epicCount: number; published: number; reviewed: number; draft: number; pipelineStage: string | null; parentJiraKey: string | null; ticketType: string | null; rawTextSource: string | null }>> {
  if (!jiraKeys.length) return {};

  const { data: brdDocs } = await typedQuery('brd_documents')
    .select('id, jira_key, pipeline_stage, parent_jira_key, ticket_type, raw_text_source')
    .in('jira_key', jiraKeys);

  if (!brdDocs?.length) return {};

  const brdIds = brdDocs.map((d: any) => d.id);
  const keyById: Record<string, string> = {};
  const stageByKey: Record<string, string | null> = {};
  const parentByKey: Record<string, string | null> = {};
  const typeByKey: Record<string, string | null> = {};
  const sourceByKey: Record<string, string | null> = {};
  brdDocs.forEach((d: any) => {
    keyById[d.id] = d.jira_key;
    stageByKey[d.jira_key] = d.pipeline_stage;
    parentByKey[d.jira_key] = d.parent_jira_key;
    typeByKey[d.jira_key] = d.ticket_type;
    sourceByKey[d.jira_key] = d.raw_text_source;
  });

  const { data: epics } = await typedQuery('brd_epics')
    .select('brd_id, publish_status')
    .in('brd_id', brdIds);

  // Initialize result with pipeline_stage for ALL resolved docs (even those with 0 epics)
  const result: Record<string, { epicCount: number; published: number; reviewed: number; draft: number; pipelineStage: string | null; parentJiraKey: string | null; ticketType: string | null; rawTextSource: string | null }> = {};
  for (const key of Object.keys(stageByKey)) {
    result[key] = { epicCount: 0, published: 0, reviewed: 0, draft: 0, pipelineStage: stageByKey[key], parentJiraKey: parentByKey[key] ?? null, ticketType: typeByKey[key] ?? null, rawTextSource: sourceByKey[key] ?? null };
  }

  (epics || []).forEach((e: any) => {
    const key = keyById[e.brd_id];
    if (!key) return;
    if (!result[key]) result[key] = { epicCount: 0, published: 0, reviewed: 0, draft: 0, pipelineStage: stageByKey[key] ?? null, parentJiraKey: parentByKey[key] ?? null, ticketType: typeByKey[key] ?? null, rawTextSource: sourceByKey[key] ?? null };
    result[key].epicCount++;
    if (e.publish_status === 'published') result[key].published++;
    else if (e.publish_status === 'reviewed') result[key].reviewed++;
    else result[key].draft++;
  });

  return result;
}
