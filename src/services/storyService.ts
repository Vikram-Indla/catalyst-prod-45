/**
 * Story Service - CRUD operations for Stories
 */

import { supabase } from '@/integrations/supabase/client';
import type { CreateStoryInput } from '@/types/story';

export async function createStory(input: CreateStoryInput) {
  const { data: user } = await supabase.auth.getUser();
  
  // Get count of stories for this feature to generate story key
  const { count } = await supabase
    .from('stories')
    .select('*', { count: 'exact', head: true })
    .eq('feature_id', input.feature_id);
  
  // Create story
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .insert([{
      name: input.title,
      title: input.title,
      description: input.description,
      feature_id: input.feature_id,
      change_number_id: input.change_number_id,
      priority: input.priority,
      owner_id: input.owner_id,
      status: 'todo' as const,
    }])
    .select()
    .single();
    
  if (storyError) throw storyError;
  
  // Create acceptance criteria
  if (input.acceptance_criteria.length > 0) {
    const validCriteria = input.acceptance_criteria.filter(ac => ac.trim());
    if (validCriteria.length > 0) {
      const { error: acError } = await supabase
        .from('acceptance_criteria')
        .insert(
          validCriteria.map((content, index) => ({
            story_id: story.id,
            content,
            order_index: index,
          }))
        );
      if (acError) {
        console.error('Failed to create acceptance criteria:', acError);
      }
    }
  }
  
  // Create subtasks
  if (input.subtasks.length > 0) {
    const validSubtasks = input.subtasks.filter(st => st.title.trim());
    if (validSubtasks.length > 0) {
      const { error: stError } = await supabase
        .from('subtasks')
        .insert(
          validSubtasks.map((st, index) => ({
            story_id: story.id,
            name: st.title, // DB uses 'name' for subtask title
            type: st.type,
            assignee_id: st.assignee_id || null,
            release_id: st.release_id || null,
            status: 'todo' as const,
            order_index: index,
          }))
        );
      if (stError) {
        console.error('Failed to create subtasks:', stError);
      }
    }
  }
  
  return story;
}

export async function getStoriesByFeature(featureId: string) {
  const { data, error } = await (supabase as any)
    .from('stories')
    .select(`
      *,
      owner:profiles!stories_owner_id_fkey(id, full_name, avatar_url),
      change_number:change_numbers(id, number, description)
    `)
    .eq('feature_id', featureId)
    .is('deleted_at', null)
    .order('rank_order', { ascending: true, nullsFirst: false });
    
  if (error) throw error;
  return data || [];
}
