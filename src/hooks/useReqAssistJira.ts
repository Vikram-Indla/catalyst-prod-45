import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { RA_KEYS } from '@/hooks/useReqAssist';

/* ── Constants ── */
const EXCLUDED_STATUSES = ['FIGMA DESIGN', 'CANCELED', 'CANCELLED'];

/* ── Query Keys ── */
const JIRA_KEYS = {
  connections: ['ra_jira_connections'] as const,
  tickets: (pk: string, pdfOnly: boolean) => ['ra_jira_tickets', pk, pdfOnly] as const,
  ticketCount: (pk: string) => ['ra_jira_ticket_count', pk] as const,
};

/* ── Hook 1: useConnectedProjects ── */
export function useConnectedProjects() {
  return useQuery({
    queryKey: JIRA_KEYS.connections,
    queryFn: async () => {
      const { data, error } = await typedQuery('ra_jira_connections')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        project_key: string;
        project_name: string;
        project_avatar: string | null;
        avatar_color: string;
        ticket_count: number;
        last_synced_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
    },
    staleTime: 30_000,
  });
}

/* ── Hook 2: useProjectTickets ── */
export function useProjectTickets(projectKey: string | null, pdfOnly = false) {
  return useQuery({
    queryKey: JIRA_KEYS.tickets(projectKey ?? '', pdfOnly),
    queryFn: async () => {
      let q = typedQuery('ra_jira_tickets')
        .select('ticket_key, ticket_summary, ticket_type, has_pdf, attachment_count, status, project_key, project_name, jira_issue_id, synced_at')
        .eq('project_key', projectKey);
      if (pdfOnly) q = q.eq('has_pdf', true);
      q = q.order('ticket_key', { ascending: true }).limit(500);
      const { data: rawData, error } = await q;
      if (error) throw error;

      // Filter out junk statuses client-side
      const data = (rawData ?? []).filter((t: any) =>
        !EXCLUDED_STATUSES.includes((t.status || '').toUpperCase())
      );

      const ticketKeys = data.map((t: any) => t.ticket_key);
      let importedMap: Record<string, string> = {};
      if (ticketKeys.length > 0) {
        const { data: docs } = await typedQuery('ra_documents')
          .select('jira_ticket_key, status')
          .in('jira_ticket_key', ticketKeys);
        if (docs) {
          for (const d of docs) {
            if (d.jira_ticket_key) importedMap[d.jira_ticket_key] = d.status || 'pending';
          }
        }
      }

      return (data ?? []).map((t: any) => ({
        ...t,
        already_imported: !!importedMap[t.ticket_key],
        existing_status: importedMap[t.ticket_key] || null,
      })) as Array<{
        id: number;
        ticket_key: string;
        project_key: string;
        project_name: string;
        ticket_summary: string;
        priority: string;
        status: string;
        has_pdf: boolean;
        attachment_count: number;
        jira_issue_id: string | null;
        synced_at: string | null;
        already_imported: boolean;
        existing_status: string | null;
      }>;
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

/* ── Hook 2b: useProjectTicketCount ── */
export function useProjectTicketCount(projectKey: string | null) {
  return useQuery({
    queryKey: JIRA_KEYS.ticketCount(projectKey ?? ''),
    queryFn: async () => {
      const { data, error } = await typedQuery('ra_jira_tickets')
        .select('status')
        .eq('project_key', projectKey);
      if (error) throw error;
      return (data ?? []).filter((t: any) =>
        !EXCLUDED_STATUSES.includes((t.status || '').toUpperCase())
      ).length;
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

/* ── Hook 3: useVerifyProject (mutation) ── */
export function useVerifyProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectKey: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('ra-jira-proxy', {
          body: { action: 'verify_project', payload: { projectKey } },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data as { project_key: string; project_name: string; avatar_url: string | null };
      } catch (e: any) {
        console.warn('[RA] External service error');
        throw new Error(e?.message || 'Jira proxy not available');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JIRA_KEYS.connections });
    },
  });
}

/* ── Hook 4: useSyncTickets (mutation) ── */
export function useSyncTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectKey: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('ra-jira-proxy', {
          body: { action: 'sync_tickets', payload: { projectKey } },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data as { synced: number; tickets: any[] };
      } catch (e: any) {
        console.warn('[RA] External service error');
        throw new Error(e?.message || 'Jira proxy not available');
      }
    },
    onSuccess: (_data, projectKey) => {
      qc.invalidateQueries({ queryKey: ['ra_jira_tickets', projectKey] });
      qc.invalidateQueries({ queryKey: JIRA_KEYS.connections });
    },
  });
}

/* ── Hook 5: useImportTickets (mutation) ── */
export function useImportTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketKeys: string[]) => {
      // Fetch full ticket rows
      const { data: tickets, error: fetchErr } = await typedQuery('ra_jira_tickets')
        .select('*')
        .in('ticket_key', ticketKeys);
      if (fetchErr) throw fetchErr;

      const docs = (tickets ?? []).map((t: any) => ({
        title: t.ticket_summary || t.ticket_key,
        jira_ticket_key: t.ticket_key,
        jira_project: t.project_key,
        source_type: 'jira_bulk',
        status: 'pending',
        language: 'en',
        wikihub_synced: false,
      }));

      // Also upsert into brd_documents for the RAG pipeline
      const brdDocs = (tickets ?? []).map((t: any) => ({
        title: t.ticket_summary || t.ticket_key,
        jira_key: t.ticket_key,
        source_type: 'jira_bulk',
        language: 'en',
        pipeline_stage: 'intake',
      }));

      const { error: insertErr } = await typedQuery('ra_documents')
        .upsert(docs, { onConflict: 'jira_ticket_key' });
      if (insertErr) throw insertErr;

      const { error: brdErr } = await typedQuery('brd_documents')
        .upsert(brdDocs, { onConflict: 'jira_key', ignoreDuplicates: false });
      if (brdErr) throw brdErr;

      // Queue processing jobs for PDFs
      const pdfTickets = (tickets ?? []).filter((t: any) => t.has_pdf);
      let pdfCount = 0;
      if (pdfTickets.length > 0) {
        // Get the just-inserted doc IDs
        const { data: insertedDocs } = await typedQuery('ra_documents')
          .select('id, jira_ticket_key')
          .in('jira_ticket_key', pdfTickets.map((t: any) => t.ticket_key));

        if (insertedDocs && insertedDocs.length > 0) {
          const jobs = insertedDocs.map((d: any) => ({
            ra_document_id: d.id,
            job_type: 'pdf_extract',
            status: 'queued',
          }));
          await typedQuery('ra_processing_jobs').insert(jobs);
          pdfCount = jobs.length;
        }
      }

      return { imported: docs.length, processing: pdfCount };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
    },
  });
}
