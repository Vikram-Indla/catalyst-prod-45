import { RAGeneration } from '@/types/requirement-assist';
import { GenerationHistoryItem } from './types';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Maps a database RAGeneration record to the UI GenerationHistoryItem format
 */
export function mapGenerationToHistoryItem(
  generation: RAGeneration,
  itemCounts?: { prd: number; epic: number; feature: number; story: number }
): GenerationHistoryItem {
  const createdAt = parseISO(generation.created_at);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Format date based on recency
  let dateStr: string;
  if (diffDays === 0) {
    dateStr = formatDistanceToNow(createdAt, { addSuffix: true });
  } else if (diffDays === 1) {
    dateStr = 'Yesterday';
  } else if (diffDays < 7) {
    dateStr = `${diffDays} days ago`;
  } else {
    dateStr = format(createdAt, 'MMM d, yyyy');
  }

  // Extract author name from user_id (in real app, would join with profiles)
  // For now, generate a placeholder
  const authorName = 'User'; // This should come from a join with profiles
  const authorInitial = authorName.charAt(0).toUpperCase();

  return {
    id: generation.display_id,
    title: generation.title,
    status: generation.status === 'processing' ? 'draft' : generation.status,
    items: {
      prd: itemCounts?.prd ?? (generation.output_prd ? 1 : 0),
      epics: itemCounts?.epic ?? 0,
      features: itemCounts?.feature ?? 0,
      stories: itemCounts?.story ?? 0,
    },
    author: {
      name: authorName,
      initial: authorInitial,
    },
    date: dateStr,
    dateSort: createdAt.getTime(),
    program: 'Program', // Would come from join with programs table
    project: undefined,
    // Add the original ID for operations
    _originalId: generation.id,
  };
}

/**
 * Maps multiple generations to history items
 */
export function mapGenerationsToHistoryItems(
  generations: RAGeneration[],
  itemCountsMap?: Map<string, { prd: number; epic: number; feature: number; story: number }>
): GenerationHistoryItem[] {
  return generations.map(g => 
    mapGenerationToHistoryItem(g, itemCountsMap?.get(g.id))
  );
}
