import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RA_KEYS } from '@/hooks/useReqAssist';

/* ── Query Keys ── */
const JIRA_KEYS = {
  connections: ['ra_jira_connections'] as const,
  tickets: (pk: string, pdfOnly: boolean) => ['ra_jira_tickets', pk, pdfOnly] as const,
};

/* ── Hook 1: useConnectedProjects ── */
export function useConnectedProjects() {
  return useQuery({
    queryKey: JIRA_KEYS.connections,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ra_jira_connections')
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
      let q = (supabase as any)
        .from('ra_jira_tickets')
        .select('*')
        .eq('project_key', projectKey);
      if (pdfOnly) q = q.eq('has_pdf', true);
      q = q.order('ticket_key', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{
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
      }>;
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
      const { data, error } = await supabase.functions.invoke('ra-jira-proxy', {
        body: { action: 'verify_project', payload: { projectKey } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { project_key: string; project_name: string; avatar_url: string | null };
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
      const { data, error } = await supabase.functions.invoke('ra-jira-proxy', {
        body: { action: 'sync_tickets', payload: { projectKey } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { synced: number; tickets: any[] };
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
      const { data: tickets, error: fetchErr } = await (supabase as any)
        .from('ra_jira_tickets')
        .select('*')
        .in('ticket_key', ticketKeys);
      if (fetchErr) throw fetchErr;

      const docs = (tickets ?? []).map((t: any) => ({
        title: t.ticket_summary || t.ticket_key,
        jira_ticket_key: t.ticket_key,
        jira_project: t.project_key,
        source_type: 'jira',
        status: 'pending',
        language: 'en',
      }));

      const { error: insertErr } = await (supabase as any)
        .from('ra_documents')
        .insert(docs);
      if (insertErr) throw insertErr;

      // Queue processing jobs for PDFs
      const pdfTickets = (tickets ?? []).filter((t: any) => t.has_pdf);
      let pdfCount = 0;
      if (pdfTickets.length > 0) {
        // Get the just-inserted doc IDs
        const { data: insertedDocs } = await (supabase as any)
          .from('ra_documents')
          .select('id, jira_ticket_key')
          .in('jira_ticket_key', pdfTickets.map((t: any) => t.ticket_key));

        if (insertedDocs && insertedDocs.length > 0) {
          const jobs = insertedDocs.map((d: any) => ({
            ra_document_id: d.id,
            job_type: 'pdf_extract',
            status: 'queued',
          }));
          await (supabase as any).from('ra_processing_jobs').insert(jobs);
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
