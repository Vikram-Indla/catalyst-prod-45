import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useToast } from '@/hooks/use-toast';
import {
  createLink,
  createLinks,
  getLinksForItem,
  searchWorkItems,
  deleteLink as deleteLinkService,
  CreateLinkInput
} from '@/services/linkService';
import { WorkItemType } from '@/types/views';

export type { WorkItemType } from '@/types/views';
export type LinkType = 'blocks' | 'is_blocked_by' | 'blocked_by' | 'relates_to' | 'duplicates' | 'is_duplicated_by' | 'parent_of' | 'child_of';

export interface WorkItemLink {
  id: string;
  from_work_item_id: string;
  from_work_item_type: string;
  to_work_item_id: string;
  to_work_item_type: string;
  link_type: string;
  description?: string;
  created_at?: string;
  created_by?: string;
  // Joined data
  linked_item_name?: string;
  linked_item_key?: string;
}

export const LINK_TYPE_LABELS: Record<string, string> = {
  blocks: 'Blocks',
  is_blocked_by: 'Is blocked by',
  blocked_by: 'Blocked by',
  relates_to: 'Relates to',
  duplicates: 'Duplicates',
  is_duplicated_by: 'Is duplicated by',
  parent_of: 'Parent of',
  child_of: 'Child of',
};

export const INVERSE_LINK_TYPES: Record<string, string> = {
  blocks: 'is_blocked_by',
  is_blocked_by: 'blocks',
  blocked_by: 'blocks',
  duplicates: 'is_duplicated_by',
  is_duplicated_by: 'duplicates',
  parent_of: 'child_of',
  child_of: 'parent_of',
  relates_to: 'relates_to',
};

// Query keys
export const linkKeys = {
  all: ['links'] as const,
  forItem: (type: WorkItemType, id: string) => 
    [...linkKeys.all, 'item', type, id] as const,
  search: (query: string, projectId: string, type?: WorkItemType | 'all') => 
    [...linkKeys.all, 'search', query, projectId, type] as const,
};

// -----------------------------------------------------
// Get Links for Item (new hook)
// -----------------------------------------------------
export function useLinksForItem(itemType: WorkItemType, itemId: string) {
  return useQuery({
    queryKey: linkKeys.forItem(itemType, itemId),
    queryFn: () => getLinksForItem(itemType, itemId),
    enabled: !!itemId,
  });
}

// -----------------------------------------------------
// Search Work Items (new hook)
// -----------------------------------------------------
export function useSearchWorkItems(
  query: string,
  projectId: string,
  typeFilter?: WorkItemType | 'all'
) {
  return useQuery({
    queryKey: linkKeys.search(query, projectId, typeFilter),
    queryFn: () => searchWorkItems(query, projectId, typeFilter),
    enabled: query.length >= 2 && !!projectId,
  });
}

// -----------------------------------------------------
// Create Link Mutation (new hook)
// -----------------------------------------------------
export function useCreateLink() {
  const queryClient = useQueryClient();
  const { toast: toastHook } = useToast();

  return useMutation({
    mutationFn: (input: CreateLinkInput) => createLink(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: linkKeys.forItem(variables.source_type, variables.source_id) 
      });
      toastHook({
        title: 'Link Created',
        description: 'Work item linked successfully.',
      });
    },
    onError: (error: Error) => {
      toastHook({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// -----------------------------------------------------
// Create Multiple Links Mutation (new hook)
// -----------------------------------------------------
export function useCreateLinks() {
  const queryClient = useQueryClient();
  const { toast: toastHook } = useToast();

  return useMutation({
    mutationFn: (inputs: CreateLinkInput[]) => createLinks(inputs),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: linkKeys.all });
      toastHook({
        title: 'Links Created',
        description: `${results.length} link(s) created successfully.`,
      });
    },
    onError: (error: Error) => {
      toastHook({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// -----------------------------------------------------
// Delete Link Mutation (new hook)
// -----------------------------------------------------
export function useDeleteLink() {
  const queryClient = useQueryClient();
  const { toast: toastHook } = useToast();

  return useMutation({
    mutationFn: (linkId: string) => deleteLinkService(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkKeys.all });
      toastHook({
        title: 'Link Removed',
        description: 'The link has been removed.',
      });
    },
    onError: (error: Error) => {
      toastHook({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// -----------------------------------------------------
// Original hook - kept for backwards compatibility
// -----------------------------------------------------
export function useWorkItemLinks(workItemType: WorkItemType, workItemId: string) {
  const queryClient = useQueryClient();

  // Fetch all links for this work item (both as source and target)
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['work-item-links', workItemType, workItemId],
    queryFn: async () => {
      // Get links where this item is the source
      const { data: outgoing, error: outError } = await supabase
        .from('work_item_links')
        .select('*')
        .eq('from_work_item_type', workItemType)
        .eq('from_work_item_id', workItemId);
      
      if (outError) throw outError;

      // Get links where this item is the target
      const { data: incoming, error: inError } = await supabase
        .from('work_item_links')
        .select('*')
        .eq('to_work_item_type', workItemType)
        .eq('to_work_item_id', workItemId);
      
      if (inError) throw inError;

      // Enrich with linked item names — batch by type
      const allLinks = [...(outgoing || []), ...(incoming || [])];

      // Group linked IDs by type for batch fetching
      const idsByType: Record<string, Set<string>> = { epic: new Set(), feature: new Set(), story: new Set() };
      for (const link of allLinks) {
        const isOutgoing = link.from_work_item_id === workItemId;
        const linkedId = isOutgoing ? link.to_work_item_id : link.from_work_item_id;
        const linkedType = isOutgoing ? link.to_work_item_type : link.from_work_item_type;
        if (idsByType[linkedType]) idsByType[linkedType].add(linkedId);
      }

      // Batch fetch all linked items in parallel
      const nameMap = new Map<string, { name: string; key: string }>();
      const [epics, features, stories] = await Promise.all([
        idsByType.epic.size > 0
          ? supabase.from('epics').select('id, name, epic_key').in('id', [...idsByType.epic])
          : { data: [] },
        idsByType.feature.size > 0
          ? supabase.from('features').select('id, name, display_id').in('id', [...idsByType.feature])
          : { data: [] },
        idsByType.story.size > 0
          ? supabase.from('stories').select('id, name, story_key').in('id', [...idsByType.story])
          : { data: [] },
      ]);
      for (const e of epics.data || []) nameMap.set(e.id, { name: e.name, key: e.epic_key || '' });
      for (const f of features.data || []) nameMap.set(f.id, { name: f.name, key: f.display_id || '' });
      for (const s of stories.data || []) nameMap.set(s.id, { name: s.name, key: s.story_key || '' });

      return allLinks.map(link => {
        const isOutgoing = link.from_work_item_id === workItemId;
        const linkedId = isOutgoing ? link.to_work_item_id : link.from_work_item_id;
        const info = nameMap.get(linkedId);
        return {
          ...link,
          linked_item_name: info?.name || 'Unknown',
          linked_item_key: info?.key || '',
        } as WorkItemLink;
      });
    },
    enabled: !!workItemId,
  });

  // Create a link
  const createLinkMutation = useMutation({
    mutationFn: async (params: {
      targetType: WorkItemType;
      targetId: string;
      linkType: LinkType;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('work_item_links')
        .insert({
          from_work_item_type: workItemType,
          from_work_item_id: workItemId,
          to_work_item_type: params.targetType,
          to_work_item_id: params.targetId,
          link_type: params.linkType,
          description: params.description,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-links'] });
      catalystToast.success('Link created');
    },
    onError: () => {
      catalystToast.error('Failed to create link');
    },
  });

  // Delete a link
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('work_item_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-links'] });
      catalystToast.success('Link removed');
    },
    onError: () => {
      catalystToast.error('Failed to remove link');
    },
  });

  return {
    links,
    isLoading,
    createLink: createLinkMutation.mutate,
    deleteLink: deleteLinkMutation.mutate,
    isCreating: createLinkMutation.isPending,
    isDeleting: deleteLinkMutation.isPending,
  };
}
