import { normalizePlannerTitle } from './normalizePlannerTitle';

/**
 * Computes overlap ratio between two normalized title strings.
 * Uses word-level Jaccard similarity: |intersection| / |union|.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  setA.forEach((w) => { if (setB.has(w)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

/**
 * For each proposal title, returns true if it's a near-duplicate of any
 * existing title. threshold=0.75 means 75% word overlap triggers dedup.
 */
export function detectPlannerDuplicates(
  proposals: string[],
  existing: string[],
  threshold = 0.75,
): boolean[] {
  const normExisting = existing.map(normalizePlannerTitle);
  return proposals.map((proposal) => {
    const norm = normalizePlannerTitle(proposal);
    return normExisting.some((ex) => jaccardSimilarity(norm, ex) >= threshold);
  });
}

/**
 * Filters out proposals that duplicate existing items.
 * Returns the non-duplicate proposals.
 */
export function filterDuplicateProposals<T extends { title: string }>(
  proposals: T[],
  existingTitles: string[],
  threshold = 0.75,
): T[] {
  const flags = detectPlannerDuplicates(
    proposals.map((p) => p.title),
    existingTitles,
    threshold,
  );
  return proposals.filter((_, i) => !flags[i]);
}
