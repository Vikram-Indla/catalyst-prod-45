// ============================================================
// DISPLAY ID GENERATION UTILITIES
// Generates PROJECT-TYPE-SEQ format display IDs
// ============================================================

/**
 * Generate display ID in PROJECT-TYPE-SEQ format
 * @param projectCode - Project code (e.g., "DIP")
 * @param itemType - Item type (epic, feature, story)
 * @param sequence - Sequence number
 * @returns Formatted display ID (e.g., "DIP-EPIC-001")
 */
export function generateDisplayId(
  projectCode: string,
  itemType: 'epic' | 'feature' | 'story' | 'prd' | 'task' | 'test_case',
  sequence: number
): string {
  const typePrefix: Record<string, string> = {
    prd: 'PRD',
    epic: 'EPIC',
    feature: 'FEAT',
    story: 'US',
    task: 'TASK',
    test_case: 'TC',
  };

  const prefix = typePrefix[itemType] || itemType.toUpperCase();
  const paddedSeq = String(sequence).padStart(3, '0');
  
  if (projectCode) {
    return `${projectCode}-${prefix}-${paddedSeq}`;
  }
  
  return `${prefix}-${paddedSeq}`;
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
