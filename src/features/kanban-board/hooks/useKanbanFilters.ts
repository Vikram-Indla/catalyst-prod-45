/**
 * useKanbanFilters — board filter + group-by state and derived results.
 */
import { useMemo, useState, useCallback } from 'react';
import { SIZES } from '../constants';
import type { BoardIssue, GroupByMode } from '../types';

export interface FilterApi {
  search: string;
  setSearch: (v: string) => void;
  assignees: Set<string>;
  toggleAssignee: (name: string) => void;
  epics: Set<string>;
  toggleEpic: (key: string) => void;
  types: Set<string>;
  toggleType: (t: string) => void;
  priorities: Set<string>;
  togglePriority: (p: string) => void;
  quickFilters: Set<string>;
  toggleQuickFilter: (id: string) => void;
  groupBy: GroupByMode;
  setGroupBy: (g: GroupByMode) => void;
  clearAll: () => void;
  hasAnyFilter: boolean;
  // aggregations
  allAssignees: string[];
  allTypes: string[];
  allPriorities: string[];
  allEpics: { key: string; summary: string }[];
  filtered: BoardIssue[];
}

function toggle(set: Set<string>, v: string): Set<string> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v); else next.add(v);
  return next;
}

export function useKanbanFilters(issues: BoardIssue[]): FilterApi {
  const [search, setSearch] = useState('');
  const [assignees, setAssignees] = useState<Set<string>>(new Set());
  const [epics, setEpics] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [priorities, setPriorities] = useState<Set<string>>(new Set());
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');

  const { allAssignees, allTypes, allPriorities, allEpics } = useMemo(() => {
    const a = new Set<string>(), t = new Set<string>(), p = new Set<string>();
    const epicMap = new Map<string, string>();
    for (const i of issues) {
      if (i.assigneeName) a.add(i.assigneeName);
      if (i.issueType) t.add(i.issueType);
      if (i.priority) p.add(i.priority);
      if ((i.issueType ?? '').toLowerCase() === 'epic') epicMap.set(i.issueKey, i.summary);
    }
    return {
      allAssignees: Array.from(a).sort(),
      allTypes: Array.from(t).sort(),
      allPriorities: Array.from(p).sort(),
      allEpics: Array.from(epicMap, ([key, summary]) => ({ key, summary })).sort((x, y) => x.summary.localeCompare(y.summary)),
    };
  }, [issues]);

  const recentlyUpdatedCutoff = useMemo(() => Date.now() - SIZES.RECENTLY_UPDATED_DAYS * 86400_000, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (q && !(`${i.issueKey} ${i.summary}`.toLowerCase().includes(q))) return false;
      if (assignees.size && !(i.assigneeName && assignees.has(i.assigneeName))) return false;
      if (types.size && !types.has(i.issueType)) return false;
      if (priorities.size && !priorities.has(i.priority)) return false;
      if (epics.size && !(i.parentKey && epics.has(i.parentKey))) return false;
      if (quickFilters.has('recently-updated')) {
        const u = i.updatedAt ? Date.parse(i.updatedAt) : 0;
        if (!(u >= recentlyUpdatedCutoff)) return false;
      }
      // 'my-issues' resolved by caller via assignee set normally; left as no-op here
      return true;
    });
  }, [issues, search, assignees, types, priorities, epics, quickFilters, recentlyUpdatedCutoff]);

  const clearAll = useCallback(() => {
    setSearch(''); setAssignees(new Set()); setEpics(new Set());
    setTypes(new Set()); setPriorities(new Set()); setQuickFilters(new Set());
  }, []);

  const hasAnyFilter = !!search || assignees.size > 0 || epics.size > 0 || types.size > 0 || priorities.size > 0 || quickFilters.size > 0;

  return {
    search, setSearch,
    assignees, toggleAssignee: (n) => setAssignees((s) => toggle(s, n)),
    epics, toggleEpic: (k) => setEpics((s) => toggle(s, k)),
    types, toggleType: (t) => setTypes((s) => toggle(s, t)),
    priorities, togglePriority: (p) => setPriorities((s) => toggle(s, p)),
    quickFilters, toggleQuickFilter: (id) => setQuickFilters((s) => toggle(s, id)),
    groupBy, setGroupBy,
    clearAll, hasAnyFilter,
    allAssignees, allTypes, allPriorities, allEpics, filtered,
  };
}
