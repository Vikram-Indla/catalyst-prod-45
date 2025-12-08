import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LinkType = 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates' | 'is_duplicated_by' | 'parent_of' | 'child_of';
export type WorkItemType = 'epic' | 'feature' | 'story';

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
  relates_to: 'Relates to',
  duplicates: 'Duplicates',
  is_duplicated_by: 'Is duplicated by',
  parent_of: 'Parent of',
  child_of: 'Child of',
};

export const INVERSE_LINK_TYPES: Record<string, string> = {
  blocks: 'is_blocked_by',
  is_blocked_by: 'blocks',
  duplicates: 'is_duplicated_by',
  is_duplicated_by: 'duplicates',
  parent_of: 'child_of',
  child_of: 'parent_of',
  relates_to: 'relates_to',
};

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

      // Enrich with linked item names
      const allLinks = [...(outgoing || []), ...(incoming || [])];
      const enrichedLinks: WorkItemLink[] = [];

      for (const link of allLinks) {
        const isOutgoing = link.from_work_item_id === workItemId;
        const linkedId = isOutgoing ? link.to_work_item_id : link.from_work_item_id;
        const linkedType = isOutgoing ? link.to_work_item_type : link.from_work_item_type;
        
        let linkedItemName = 'Unknown';
        let linkedItemKey = '';

        // Fetch linked item name based on type
        if (linkedType === 'epic') {
          const { data } = await supabase.from('epics').select('name, epic_key').eq('id', linkedId).single();
          if (data) {
            linkedItemName = data.name;
            linkedItemKey = data.epic_key || '';
          }
        } else if (linkedType === 'feature') {
          const { data } = await supabase.from('features').select('name, display_id').eq('id', linkedId).single();
          if (data) {
            linkedItemName = data.name;
            linkedItemKey = data.display_id || '';
          }
        } else if (linkedType === 'story') {
          const { data } = await supabase.from('stories').select('name, story_key').eq('id', linkedId).single();
          if (data) {
            linkedItemName = data.name;
            linkedItemKey = data.story_key || '';
          }
        }

        enrichedLinks.push({
          ...link,
          linked_item_name: linkedItemName,
          linked_item_key: linkedItemKey,
        });
      }

      return enrichedLinks;
    },
    enabled: !!workItemId,
  });

  // Create a link
  const createLink = useMutation({
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
      toast.success('Link created');
    },
    onError: () => {
      toast.error('Failed to create link');
    },
  });

  // Delete a link
  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('work_item_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-links'] });
      toast.success('Link removed');
    },
    onError: () => {
      toast.error('Failed to remove link');
    },
  });

  return {
    links,
    isLoading,
    createLink: createLink.mutate,
    deleteLink: deleteLink.mutate,
    isCreating: createLink.isPending,
    isDeleting: deleteLink.isPending,
  };
}
