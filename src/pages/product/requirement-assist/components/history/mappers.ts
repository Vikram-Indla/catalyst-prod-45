import { RAGeneration } from '@/types/requirement-assist';
import { GenerationHistoryItem } from './types';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { stripHtmlAndTruncate } from '../../utils/textUtils';

/**
 * Maps a database RAGeneration record to the UI GenerationHistoryItem format
 * PRD is treated as a background document, not a work item
 */
export function mapGenerationToHistoryItem(
  generation: RAGeneration & { 
    author_name?: string | null;
    prd_content?: string | null;
    prd_title?: string | null;
    item_counts?: { prd: number; epic: number; feature: number; story: number; test_case?: number } | null;
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

  // Get item counts from joined data or defaults - PRD is NOT counted as a work item
  const itemCounts = generation.item_counts;

  return {
    id: generation.display_id,
    title: cleanTitle,
    status: generation.status === 'processing' ? 'draft' : generation.status,
    items: {
      epics: itemCounts?.epic ?? 0,
      features: itemCounts?.feature ?? 0,
      stories: itemCounts?.story ?? 0,
      testCases: itemCounts?.test_case ?? 0,
    },
    // PRD is a background document
    hasPrd: !!generation.prd_content || !!itemCounts?.prd || generation.output_prd,
    prdTitle: generation.prd_title || undefined,
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
    prd_content?: string | null;
    prd_title?: string | null;
    item_counts?: { prd: number; epic: number; feature: number; story: number; test_case?: number } | null;
  })[]
): GenerationHistoryItem[] {
  return generations.map(g => mapGenerationToHistoryItem(g));
}
