import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export interface BusinessRequest {
  id: string;
  request_key: string;
  title: string;
  process_step: string | null;
  department: string | null;
}

export interface BRLink {
  id: string;
  request_key: string;
  linked_at: string;
  br: BusinessRequest | null;
}

export interface EpicToPublish {
  id: string;
  name: string;
  description: string;
}

export interface PublishedEpic {
  id: string;
  epic_id: string;
  published_data: {
    source_id: string;
    name: string;
    description: string;
    quarter: string;
    epic_key?: string;
  };
  published_at: string;
}

// Search business requests
export function useSearchBR(draftId: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  const updateSearch = (query: string) => {
    setSearchQuery(query);
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  };

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['br-search', draftId, debouncedQuery],
    queryFn: async (): Promise<BusinessRequest[]> => {
      if (debouncedQuery.length < 2) return [];

      const response = await supabase.functions.invoke('ai-assist-publish', {
        body: {
          action: 'search_br',
          draft_id: draftId,
          query: debouncedQuery,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data.results;
    },
    enabled: debouncedQuery.length >= 2,
  });

  return { searchQuery, setSearchQuery: updateSearch, results, isLoading };
}

// Get linked BRs for a draft
export function useBRLinks(draftId: string | undefined) {
  return useQuery({
    queryKey: ['br-links', draftId],
    queryFn: async (): Promise<BRLink[]> => {
      if (!draftId) return [];

      const response = await supabase.functions.invoke('ai-assist-publish', {
        body: { action: 'get_links', draft_id: draftId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data.links;
    },
    enabled: !!draftId,
  });
}

// Link a BR to a draft
export function useLinkBR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draftId,
      runId,
      requestKey,
    }: {
      draftId: string;
      runId?: string;
      requestKey: string;
    }) => {
      const response = await supabase.functions.invoke('ai-assist-publish', {
        body: {
          action: 'link_br',
          draft_id: draftId,
          run_id: runId,
          request_key: requestKey,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['br-links', variables.draftId] });
      if (data.already_linked) {
        toast.info('Business Request already linked');
      } else {
        toast.success('Business Request linked successfully');
      }
    },
    onError: (error) => {
      toast.error('Failed to link BR: ' + error.message);
    },
  });
}

// Unlink a BR from a draft
export function useUnlinkBR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draftId,
      linkId,
    }: {
      draftId: string;
      linkId: string;
    }) => {
      const response = await supabase.functions.invoke('ai-assist-publish', {
        body: {
          action: 'unlink_br',
          draft_id: draftId,
          link_id: linkId,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['br-links', variables.draftId] });
      toast.success('Business Request unlinked');
    },
    onError: (error) => {
      toast.error('Failed to unlink BR: ' + error.message);
    },
  });
}

// Get published epics for a draft
export function usePublishedEpics(draftId: string | undefined) {
  return useQuery({
    queryKey: ['published-epics', draftId],
    queryFn: async (): Promise<PublishedEpic[]> => {
      if (!draftId) return [];

      const response = await supabase.functions.invoke('ai-assist-publish', {
        body: { action: 'get_published_epics', draft_id: draftId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data.published;
    },
    enabled: !!draftId,
  });
}

// Publish epics
export function usePublishEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draftId,
      runId,
      epics,
      quarter,
      linkedBrId,
    }: {
      draftId: string;
      runId: string;
      epics: EpicToPublish[];
      quarter: string;
      linkedBrId?: string;
    }) => {
      const response = await supabase.functions.invoke('ai-assist-publish', {
        body: {
          action: 'publish_epics',
          draft_id: draftId,
          run_id: runId,
          epics,
          quarter,
          linked_br_id: linkedBrId,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data as {
        success: boolean;
        published_count: number;
        epic_ids: string[];
        errors?: string[];
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['published-epics', variables.draftId] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-audit-events', variables.draftId] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-draft', variables.draftId] });
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Published ${data.published_count} epics with ${data.errors.length} errors`);
      } else {
        toast.success(`Published ${data.published_count} epics successfully`);
      }
    },
    onError: (error) => {
      toast.error('Failed to publish epics: ' + error.message);
    },
  });
}

// Available quarters
export const AVAILABLE_QUARTERS = [
  'Q1 2025',
  'Q2 2025',
  'Q3 2025',
  'Q4 2025',
  'Q1 2026',
  'Q2 2026',
  'Q3 2026',
  'Q4 2026',
];
