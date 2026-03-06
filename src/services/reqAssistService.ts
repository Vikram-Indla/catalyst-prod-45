import { supabase } from '@/integrations/supabase/client';
import type { RADocumentWithArtifacts, RAProcessingJob } from '@/types/reqAssistV2';

// ── LIBRARY QUERIES ──

export async function fetchRADocuments(params?: {
  status?: string;
  search?: string;
}): Promise<RADocumentWithArtifacts[]> {
  let query = (supabase as any)
    .from('ra_documents')
    .select(`
      *,
      ra_artifacts(id, artifact_type, status),
      ra_processing_jobs(id, job_type, status, progress_pct, current_step, eta_seconds)
    `)
    .order('created_at', { ascending: false });

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
  const { data, error } = await (supabase as any)
    .from('ra_documents')
    .select(`*, ra_artifacts(*), ra_processing_jobs(*)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRAStats() {
  const [docs, artifacts, jobs, sync] = await Promise.all([
    (supabase as any).from('ra_documents').select('id, status, wikihub_synced, wikihub_chunk_count'),
    (supabase as any).from('ra_artifacts').select('id, artifact_type').eq('status', 'ready'),
    (supabase as any).from('ra_processing_jobs').select('id').eq('status', 'processing'),
    (supabase as any).from('ra_jira_sync_log').select('synced_at, project_key').order('synced_at', { ascending: false }).limit(1),
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
  const { data, error } = await (supabase as any)
    .from('ra_processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (error) throw error;
  return data as RAProcessingJob;
}

export async function fetchRAJobsByDocId(docId: string) {
  const { data, error } = await (supabase as any)
    .from('ra_processing_jobs')
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
  const { data, error } = await (supabase as any)
    .from('ra_documents')
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
  const { data, error } = await (supabase as any)
    .from('ra_processing_jobs')
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
  const { data, error } = await (supabase as any)
    .from('ra_documents')
    .select('jira_ticket_key, title, page_count, jira_created_at, status')
    .eq('jira_project', projectKey)
    .order('jira_created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
