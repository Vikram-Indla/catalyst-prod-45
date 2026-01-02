/**
 * Test Case Work Item Links Hook
 * Manages links between test cases and stories/defects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export type WorkItemType = 'story' | 'defect' | 'feature' | 'epic';

export interface TestCaseLink {
  id: string;
  case_id: string;
  work_item_id: string;
  work_item_type: WorkItemType;
  linked_at: string;
  linked_by: string | null;
  // Populated fields
  work_item_title?: string;
  work_item_key?: string;
  work_item_status?: string;
}

export interface LinkableWorkItem {
  id: string;
  title: string;
  key: string;
  type: WorkItemType;
  status?: string;
}

export interface CreateLinkInput {
  caseId: string;
  workItemId: string;
  workItemType: WorkItemType;
}

async function logTestActivity(
  userId: string | undefined,
  activityType: string,
  entityId: string,
  entityTitle: string,
  programId: string | null,
  description?: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: 'test_case_link',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestCaseLinks(caseId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all links for a test case
  const {
    data: links,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-case-links', caseId],
    queryFn: async () => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from('test_case_work_item_links')
        .select('*')
        .eq('case_id', caseId)
        .order('linked_at', { ascending: false });

      if (error) throw error;

      // Enrich with work item details
      const enrichedLinks: TestCaseLink[] = [];
      
      for (const link of data) {
        let workItemDetails: { title?: string; key?: string; status?: string } = {};

        if (link.work_item_type === 'story') {
          const { data: story } = await supabase
            .from('stories')
            .select('title, story_key, status')
            .eq('id', link.work_item_id)
            .single();
          if (story) {
            workItemDetails = {
              title: story.title,
              key: story.story_key,
              status: story.status,
            };
          }
        } else if (link.work_item_type === 'defect') {
          const { data: defect } = await supabase
            .from('defects')
            .select('title, defect_id, workflow_status')
            .eq('id', link.work_item_id)
            .single();
          if (defect) {
            workItemDetails = {
              title: defect.title,
              key: defect.defect_id,
              status: defect.workflow_status,
            };
          }
        } else if (link.work_item_type === 'feature') {
          const { data: feature } = await supabase
            .from('features')
            .select('name, display_id, status')
            .eq('id', link.work_item_id)
            .single();
          if (feature) {
            workItemDetails = {
              title: feature.name,
              key: feature.display_id,
              status: feature.status,
            };
          }
        }

        enrichedLinks.push({
          ...link,
          work_item_type: link.work_item_type as WorkItemType,
          work_item_title: workItemDetails.title,
          work_item_key: workItemDetails.key,
          work_item_status: workItemDetails.status,
        });
      }

      return enrichedLinks;
    },
    enabled: !!caseId && !!user,
  });

  // Create a new link
  const createLinkMutation = useMutation({
    mutationFn: async (input: CreateLinkInput) => {
      if (!user) throw new Error('Not authenticated');

      // Check if link already exists
      const { data: existing } = await supabase
        .from('test_case_work_item_links')
        .select('id')
        .eq('case_id', input.caseId)
        .eq('work_item_id', input.workItemId)
        .single();

      if (existing) {
        throw new Error('This work item is already linked');
      }

      const { data, error } = await supabase
        .from('test_case_work_item_links')
        .insert([{
          case_id: input.caseId,
          work_item_id: input.workItemId,
          work_item_type: input.workItemType,
          linked_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Get test case for audit
      const { data: testCase } = await supabase
        .from('test_cases')
        .select('title, program_id')
        .eq('id', input.caseId)
        .single();

      // Audit log
      await logAuditEntry({
        entityType: 'test_case_work_item_links',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'link_created',
        data.id,
        testCase?.title || 'Unknown',
        testCase?.program_id || null,
        `Linked ${input.workItemType} to test case`
      );

      return data as TestCaseLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-links'] });
      toast.success('Work item linked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete a link
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get link data for audit
      const { data: linkData } = await supabase
        .from('test_case_work_item_links')
        .select('*')
        .eq('id', linkId)
        .single();

      const { error } = await supabase
        .from('test_case_work_item_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_case_work_item_links',
        entityId: linkId,
        action: 'deleted',
        beforeData: linkData,
      });

      return linkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-links'] });
      toast.success('Link removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    links: links || [],
    isLoading,
    error,
    refetch,
    createLink: createLinkMutation.mutateAsync,
    deleteLink: deleteLinkMutation.mutateAsync,
    isCreating: createLinkMutation.isPending,
    isDeleting: deleteLinkMutation.isPending,
  };
}

// Hook to search for linkable work items
export function useLinkableWorkItems(
  projectId: string | null,
  type: WorkItemType,
  searchQuery: string
) {
  return useQuery({
    queryKey: ['linkable-work-items', projectId, type, searchQuery],
    queryFn: async () => {
      if (!projectId) return [];

      const items: LinkableWorkItem[] = [];

      if (type === 'story') {
        // Get features for this project first
        const { data: features } = await supabase
          .from('features')
          .select('id')
          .eq('project_id', projectId)
          .is('deleted_at', null);

        if (features && features.length > 0) {
          const featureIds = features.map(f => f.id);

          let query = supabase
            .from('stories')
            .select('id, story_key, title, status')
            .in('feature_id', featureIds)
            .is('deleted_at', null)
            .limit(20);

          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,story_key.ilike.%${searchQuery}%`);
          }

          const { data: stories } = await query;
          if (stories) {
            items.push(...stories.map(s => ({
              id: s.id,
              title: s.title,
              key: s.story_key,
              type: 'story' as WorkItemType,
              status: s.status,
            })));
          }
        }
      } else if (type === 'defect') {
        let query = supabase
          .from('defects')
          .select('id, defect_id, title, workflow_status')
          .eq('project_id', projectId)
          .limit(20);

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,defect_id.ilike.%${searchQuery}%`);
        }

        const { data: defects } = await query;
        if (defects) {
          items.push(...defects.map(d => ({
            id: d.id,
            title: d.title,
            key: d.defect_id,
            type: 'defect' as WorkItemType,
            status: d.workflow_status,
          })));
        }
      } else if (type === 'feature') {
        let query = supabase
          .from('features')
          .select('id, display_id, name, status')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .limit(20);

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,display_id.ilike.%${searchQuery}%`);
        }

        const { data: features } = await query;
        if (features) {
          items.push(...features.map(f => ({
            id: f.id,
            title: f.name,
            key: f.display_id || '',
            type: 'feature' as WorkItemType,
            status: f.status,
          })));
        }
      }

      return items;
    },
    enabled: !!projectId && !!type,
  });
}
