// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ AI SUGGESTIONS API
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { T10AISuggestionRow, T10AISuggestionWithAssignee, T10AISuggestionPriority } from '../types';
import type { Database } from '@/integrations/supabase/types';

type DbT10Suggestion = Database['public']['Tables']['t10_ai_suggestions']['Row'];

/**
 * Convert DB row to domain type
 */
function mapDbSuggestionToRow(dbSuggestion: DbT10Suggestion): T10AISuggestionRow {
  return {
    id: dbSuggestion.id,
    list_id: dbSuggestion.list_id,
    taskhub_key: dbSuggestion.taskhub_key,
    title: dbSuggestion.title,
    assignee_id: dbSuggestion.assignee_id,
    priority: dbSuggestion.priority as T10AISuggestionPriority,
    due_date: dbSuggestion.due_date,
    is_added: dbSuggestion.is_added,
    created_at: dbSuggestion.created_at,
    updated_at: dbSuggestion.updated_at,
  };
}

/**
 * Fetch AI suggestions for a list
 */
export async function fetchT10Suggestions(
  listId: string,
  includeAdded: boolean = false
): Promise<T10AISuggestionWithAssignee[]> {
  let query = supabase
    .from('t10_ai_suggestions')
    .select(`
      *,
      assignee:profiles!t10_ai_suggestions_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .eq('list_id', listId)
    .order('created_at', { ascending: false });

  if (!includeAdded) {
    query = query.eq('is_added', false);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data || []).map((suggestion: any) => ({
    ...mapDbSuggestionToRow(suggestion),
    assignee: suggestion.assignee,
  }));
}

/**
 * Add a suggestion to the current week's items
 */
export async function addT10SuggestionToWeek(
  suggestionId: string,
  weekId: string,
  rank?: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get suggestion details
  const { data: suggestion, error: fetchError } = await supabase
    .from('t10_ai_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Get next rank if not provided
  let targetRank = rank;
  if (!targetRank) {
    const { data: items } = await supabase
      .from('t10_items')
      .select('rank')
      .eq('week_id', weekId)
      .order('rank', { ascending: false })
      .limit(1);

    targetRank = (items?.[0]?.rank || 0) + 1;
  }

  // Create item from suggestion
  const { error: insertError } = await supabase
    .from('t10_items')
    .insert({
      week_id: weekId,
      title: suggestion.title,
      rank: targetRank,
      status: 'todo',
      taskhub_key: suggestion.taskhub_key,
      assignee_id: suggestion.assignee_id,
      due_date: suggestion.due_date,
      created_by: user.id,
    });

  if (insertError) throw new Error(insertError.message);

  // Mark suggestion as added
  const { error: updateError } = await supabase
    .from('t10_ai_suggestions')
    .update({ is_added: true })
    .eq('id', suggestionId);

  if (updateError) throw new Error(updateError.message);
}

/**
 * Dismiss a suggestion
 */
export async function dismissT10Suggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('t10_ai_suggestions')
    .update({ is_added: true }) // Mark as added to hide it
    .eq('id', suggestionId);

  if (error) throw new Error(error.message);
}

/**
 * Create a new AI suggestion (for testing or manual creation)
 */
export async function createT10Suggestion(input: {
  list_id: string;
  title: string;
  taskhub_key?: string;
  assignee_id?: string;
  priority?: T10AISuggestionPriority;
  due_date?: string;
}): Promise<T10AISuggestionRow> {
  const { data, error } = await supabase
    .from('t10_ai_suggestions')
    .insert({
      list_id: input.list_id,
      title: input.title,
      taskhub_key: input.taskhub_key || null,
      assignee_id: input.assignee_id || null,
      priority: input.priority || 'medium',
      due_date: input.due_date || null,
      is_added: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapDbSuggestionToRow(data);
}
