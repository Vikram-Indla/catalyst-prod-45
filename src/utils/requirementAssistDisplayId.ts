// ============================================================
// DISPLAY ID GENERATION UTILITIES
// Generates CODE-SEQ format display IDs
// Epics/Features use PROGRAM code, Stories use PROJECT code
// ============================================================

/**
 * Generate display ID in CODE-SEQ format
 * Epics and Features belong to Program → use programCode
 * Stories belong to Project → use projectCode
 * 
 * @param itemType - Item type (epic, feature, story, etc.)
 * @param programCode - Program code (e.g., "CAT" for Catalyst Epics)
 * @param projectCode - Project code (e.g., "DIP" for Digital Investor Portal)
 * @param sequence - Sequence number
 * @returns Formatted display ID (e.g., "CAT-001" for epics, "DIP-001" for stories)
 */
export function generateDisplayId(
  itemType: 'epic' | 'feature' | 'story' | 'prd' | 'task' | 'test_case',
  programCode: string,
  projectCode: string,
  sequence: number
): string {
  // Epics and Features use PROGRAM code
  // Stories, Tasks, Test Cases use PROJECT code
  // PRDs are source documents, use PROJECT code
  const code = (itemType === 'epic' || itemType === 'feature') 
    ? programCode 
    : projectCode;

  const paddedSeq = String(sequence).padStart(3, '0');
  
  if (code) {
    return `${code}-${paddedSeq}`;
  }
  
  return paddedSeq;
}

/**
 * Format confidence score for display
 * Handles both 0-1 range and 0-100 range values
 * @param score - Raw confidence score
 * @returns Percentage value (0-100)
 */
export function formatConfidencePercent(score: number | null | undefined): number {
  if (score === null || score === undefined) return 85; // Default
  
  // If score is > 1, assume it's already a percentage
  if (score > 1) {
    // If it's way too high (like 9700), divide by 100
    if (score > 100) {
      return Math.round(score / 100);
    }
    return Math.round(score);
  }
  
  // Score is 0-1 range, convert to percentage
  return Math.round(score * 100);
}

/**
 * Get color classes based on confidence percentage
 * @param percent - Confidence percentage (0-100)
 * @returns Tailwind color classes
 */
export function getConfidenceColor(percent: number): string {
  if (percent >= 90) return 'text-emerald-600 bg-emerald-50';
  if (percent >= 80) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Check if an item is publishable
 * PRDs are not publishable, already published items are not publishable
 */
export function isPublishable(item: { itemType: string; isPublished?: boolean }): boolean {
  return item.itemType !== 'prd' && !item.isPublished;
}
