// Map a work item's type string (from a notification entity, a global-search
// row, etc.) to a canonical StarredItemType, so a star created from any entry
// point lands on the same row in user_starred_items. Unknown types fall back to
// the generic 'ph_issue' (still a work item; the Starred hub resolves the real
// icon from ph_issues).
import type { StarredItemType } from '@/hooks/home/useStarredItems';

export function workItemStarType(entityType: string | null | undefined): StarredItemType {
  const t = (entityType || '').toLowerCase().trim();
  if (t === 'epic') return 'epic';
  if (t === 'feature') return 'feature';
  if (t === 'story') return 'story';
  if (t === 'bug' || t === 'defect' || t === 'qa bug') return 'defect';
  if (t === 'incident' || t === 'production incident') return 'production_incident';
  if (t === 'business request') return 'business_request';
  if (t === 'business gap') return 'business_gap';
  if (t === 'change request') return 'change_request';
  if (t === 'task' || t === 'sub-task' || t === 'subtask' || t === 'brd task') return 'task';
  return 'ph_issue';
}

// Map a sidebar/nav row's route to a canonical StarredItemType, so a star
// created from any sidebar row lands in user_starred_items. Known surface route
// words map to their specific type (so a backlog/dashboard starred from the
// sidebar shares the SAME (item_id, item_type) as one starred from
// ProjectPageHeader — no duplicate rows). Everything else falls back to the
// generic 'page' — never a guessed surface type (zero-assumption).
const SIDEBAR_SURFACE_TYPE: Record<string, StarredItemType> = {
  backlog: 'backlog',
  dashboard: 'dashboard',
  board: 'board',
  roadmap: 'roadmap',
  filter: 'filter',
  filters: 'filter',
};

export function sidebarStarType(path: string | null | undefined): StarredItemType {
  const clean = (path || '').split('?')[0].replace(/\/+$/, '');
  const routeWord = clean.split('/').filter(Boolean).pop()?.toLowerCase() ?? '';
  return SIDEBAR_SURFACE_TYPE[routeWord] ?? 'page';
}
