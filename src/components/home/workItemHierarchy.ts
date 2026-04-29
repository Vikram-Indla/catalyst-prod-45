/**
 * Work Item Hierarchy Engine — Tier-based freshness gating, sorting, and collapsing.
 * Every query and renderer uses this as the single source of truth.
 */

export interface TierConfig {
  tier: number;
  label: string;
  freshnessDays: number;
  renderMode: 'individual' | 'collapsed';
  color: string;
}

export const WORK_ITEM_HIERARCHY: Record<string, TierConfig> = {
  // TIER 1 — STRATEGIC (individual cards, 14-day window)
  'Request':           { tier: 1, label: 'INITIATIVE',          freshnessDays: 14, renderMode: 'individual', color: '#722ED1' },
  'Business Request':     { tier: 1, label: 'BUSINESS REQUEST',    freshnessDays: 14, renderMode: 'individual', color: '#722ED1' },
  'BRD':                  { tier: 1, label: 'BUSINESS REQUEST',    freshnessDays: 14, renderMode: 'individual', color: '#722ED1' },
  'BRD Task':             { tier: 1, label: 'BUSINESS REQUEST',    freshnessDays: 14, renderMode: 'individual', color: '#722ED1' },

  // TIER 2 — PORTFOLIO (individual cards, 14-day window)
  'Epic':                 { tier: 2, label: 'EPIC',                freshnessDays: 14, renderMode: 'individual', color: '#531DAB' },

  // TIER 3 — DELIVERY (individual cards, 7-day window)
  'Story':                { tier: 3, label: 'STORY',               freshnessDays: 7,  renderMode: 'individual', color: '#4C6EF5' },

  // TIER 4 — OPERATIONAL (individual cards, 14-day window — incidents are always urgent)
  'Incident':             { tier: 4, label: 'PRODUCTION INCIDENT', freshnessDays: 14, renderMode: 'individual', color: '#CF1322' },
  'Production Incident':  { tier: 4, label: 'PRODUCTION INCIDENT', freshnessDays: 14, renderMode: 'individual', color: '#CF1322' },

  // TIER 5 — QUALITY (collapsed, 3-day window)
  'Bug':                  { tier: 5, label: 'DEFECT',              freshnessDays: 3,  renderMode: 'collapsed',  color: '#FA541C' },
  'Defect':               { tier: 5, label: 'DEFECT',              freshnessDays: 3,  renderMode: 'collapsed',  color: '#FA541C' },
  'QA Bug':               { tier: 5, label: 'DEFECT',              freshnessDays: 3,  renderMode: 'collapsed',  color: '#FA541C' },

  // TIER 6 — EXECUTION (collapsed, 3-day window)
  'Sub-task':             { tier: 6, label: 'SUB-TASK',            freshnessDays: 3,  renderMode: 'collapsed',  color: '#8B8FA3' },
  'Task':                 { tier: 6, label: 'TASK',                freshnessDays: 3,  renderMode: 'collapsed',  color: '#13C2C2' },
};

const DEFAULT_TIER: TierConfig = { tier: 6, label: 'ITEM', freshnessDays: 3, renderMode: 'collapsed', color: '#8B8FA3' };

export function getTierConfig(type: string | null | undefined): TierConfig {
  if (!type) return DEFAULT_TIER;
  if (WORK_ITEM_HIERARCHY[type]) return WORK_ITEM_HIERARCHY[type];
  const key = Object.keys(WORK_ITEM_HIERARCHY).find(k => k.toLowerCase() === type.toLowerCase());
  if (key) return WORK_ITEM_HIERARCHY[key];
  const partial = Object.keys(WORK_ITEM_HIERARCHY).find(k => type.toLowerCase().includes(k.toLowerCase()));
  if (partial) return WORK_ITEM_HIERARCHY[partial];
  return DEFAULT_TIER;
}

export function isWithinFreshness(updatedAt: string, tierConfig: TierConfig): boolean {
  const daysSinceUpdate = Math.ceil(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceUpdate <= tierConfig.freshnessDays;
}

export function sortByHierarchy<T extends { type: string; updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tierA = getTierConfig(a.type).tier;
    const tierB = getTierConfig(b.type).tier;
    if (tierA !== tierB) return tierA - tierB;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function sortWithIncidentPriority<T extends { type: string; updatedAt: string; status?: string }>(items: T[]): T[] {
  const incidents = items.filter(i => getTierConfig(i.type).tier === 4 && !(i.status || '').toLowerCase().match(/done|closed|resolved/));
  const rest = items.filter(i => getTierConfig(i.type).tier !== 4 || (i.status || '').toLowerCase().match(/done|closed|resolved/));
  return [...sortByHierarchy(incidents), ...sortByHierarchy(rest)];
}

/** Find common title pattern from a group of similar items */
export function findCommonTitlePattern(titles: string[]): string {
  if (titles.length === 1) return titles[0];

  const sorted = [...titles].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  let commonLen = 0;
  while (commonLen < first.length && commonLen < last.length && first[commonLen] === last[commonLen]) {
    commonLen++;
  }

  if (commonLen > 10) {
    const cleaned = first.substring(0, commonLen).trim().replace(/[\s\-|:,]+$/, '').trim();
    if (cleaned.length > 8) return cleaned + '...';
  }

  const wordCounts: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'is', 'it', 'on', 'at', 'by', 'less', 'than', 'score']);
  titles.forEach(t => {
    const words = t.toLowerCase().split(/[\s|]+/).filter(w => w.length > 3 && !stopWords.has(w));
    const unique = new Set(words);
    unique.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
  });

  const threshold = titles.length * 0.5;
  const commonWords = Object.entries(wordCounts)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  if (commonWords.length > 0) return commonWords.join(' ') + ' related';
  return `${titles.length} items`;
}
