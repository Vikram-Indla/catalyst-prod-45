import { RAGeneration } from '@/types/requirement-assist';
import { GenerationHistoryItem } from './types';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { stripHtmlAndTruncate } from '../../utils/textUtils';

/**
 * Maps a database RAGeneration record to the UI GenerationHistoryItem format
 */
export function mapGenerationToHistoryItem(
  generation: RAGeneration & { 
    author_name?: string | null;
    item_counts?: { prd: number; epic: number; feature: number; story: number } | null;
  }
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

  // Use author_name from database, fallback to 'Unknown'
  const authorName = generation.author_name || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();

  // Strip HTML from title and truncate
  const cleanTitle = stripHtmlAndTruncate(generation.title, 60);

  // Get item counts from joined data or defaults
  const itemCounts = generation.item_counts;

  return {
    id: generation.display_id,
    title: cleanTitle,
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
    program: 'Program',
    project: undefined,
    _originalId: generation.id,
  };
}

/**
 * Maps multiple generations to history items
 */
export function mapGenerationsToHistoryItems(
  generations: (RAGeneration & { 
    author_name?: string | null;
    item_counts?: { prd: number; epic: number; feature: number; story: number } | null;
  })[]
): GenerationHistoryItem[] {
  return generations.map(g => mapGenerationToHistoryItem(g));
}
