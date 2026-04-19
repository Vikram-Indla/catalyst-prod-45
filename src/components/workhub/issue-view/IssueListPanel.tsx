/**
 * IssueListPanel — Jira Cloud "All work" left panel
 * Card-style rows: Summary prominent → icon + key on left, avatar on right
 * Sort dropdown header, face avatars, no status lozenges in cards
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ArrowUpNarrowWide, ArrowDownNarrowWide, RotateCcw } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IssueKeyLink } from '@/components/shared/IssueKeyLink';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';
import type { AllWorkItem } from '@/types/allwork.types';

/* ── Sort options (Jira parity — full set) ── */
type SortKey = 'updated' | 'created' | 'key' | 'priority' | 'status' | 'assignee' | 'reporter' | 'summary' | 'work_type' | 'resolution';
const SORT_OPTIONS: { key: SortKey; label: string; group?: 'order' | 'extra' }[] = [
  { key: 'updated', label: 'Last viewed', group: 'order' },
  { key: 'created', label: 'Created', group: 'order' },
  { key: 'key', label: 'Key', group: 'order' },
  { key: 'priority', label: 'Priority', group: 'order' },
  { key: 'resolution', label: 'Resolved', group: 'order' },
  { key: 'status', label: 'Status', group: 'order' },
  { key: 'work_type', label: 'Work type', group: 'extra' },
  { key: 'assignee', label: 'Assignee', group: 'extra' },
  { key: 'reporter', label: 'Reporter', group: 'extra' },
  { key: 'summary', label: 'Summary', group: 'extra' },
];

/* ── Avatar resolution hook (jira_identity_map → profiles fallback) ── */
function useAvatarMap(items: AllWorkItem[]) {
  const assigneeNames = useMemo(() => {
    const names = new Set<string>();
    items.forEach(i => { if (i.assignee_display_name) names.add(i.assignee_display_name); });
    return Array.from(names);
  }, [items]);

  const assigneeIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach(i => { if (i.assignee_id) ids.add(i.assignee_id); });
    return Array.from(ids);
  }, [items]);

  // Build name→id mapping for merging results
  const nameToId = useMemo(() => {
    const m: Record<string, string> = {};
    items.forEach(i => { if (i.assignee_display_name && i.assignee_id) m[i.assignee_display_name] = i.assignee_id; });
    return m;
  }, [items]);

  const { data: profileMap } = useQuery({
    queryKey: ['avatar-map-combined', assigneeNames.join(','), assigneeIds.join(',')],
    queryFn: async () => {
      if (assigneeNames.length === 0) return {};
      const map: Record<string, string> = {};

      // 1. Try jira_identity_map first (has Jira face avatars)
      if (assigneeIds.length > 0) {
        const { data: jiraRows } = await supabase
          .from('jira_identity_map')
          .select('jira_account_id, avatar_url, display_name')
          .in('jira_account_id', assigneeIds);
        (jiraRows ?? []).forEach((r: any) => {
          if (r.avatar_url && r.display_name) map[r.display_name] = r.avatar_url;
        });
      }

      // 2. Fallback: profiles table for any names still missing
      const missing = assigneeNames.filter(n => !map[n]);
      if (missing.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .in('full_name', missing);
        (profiles ?? []).forEach((p: any) => { if (p.avatar_url) map[p.full_name] = p.avatar_url; });
      }

      return map;
    },
    enabled: assigneeNames.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return profileMap ?? {};
}

interface Props {
  projectKey: string;
  selectedIssueKey: string | null;
  onSelectIssue: (key: string) => void;
  onSearch: (query: string) => void;
  items?: AllWorkItem[];
  loading?: boolean;
  totalCount?: number;
}

export function IssueListPanel({
  projectKey, selectedIssueKey, onSelectIssue, onSearch,
  items = [], loading = false,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortAsc, setSortAsc] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sortRef = useRef<HTMLDivElement>(null);
  const avatarMap = useAvatarMap(items);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 300);
  }, [onSearch]);

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortMenuOpen]);

  const sortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Last viewed';

  // Sort items based on selected sort key and direction
  const PRIORITY_ORDER: Record<string, number> = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };
  const STATUS_CAT_ORDER: Record<string, number> = { done: 0, in_progress: 1, todo: 2 };

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      let cmp = 0;
      const collate = (a2: string | null, b2: string | null) => (a2 ?? '').localeCompare(b2 ?? '');
      switch (sortKey) {
        case 'updated':
          cmp = new Date(b.jira_updated_at ?? 0).getTime() - new Date(a.jira_updated_at ?? 0).getTime();
          break;
        case 'created':
          cmp = new Date(b.jira_created_at ?? 0).getTime() - new Date(a.jira_created_at ?? 0).getTime();
          break;
        case 'key': {
          const aNum = parseInt(a.issue_key.split('-').pop() ?? '0', 10);
          const bNum = parseInt(b.issue_key.split('-').pop() ?? '0', 10);
          cmp = aNum - bNum;
          break;
        }
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case 'status':
          cmp = (STATUS_CAT_ORDER[a.status_category ?? 'todo'] ?? 99) - (STATUS_CAT_ORDER[b.status_category ?? 'todo'] ?? 99);
          break;
        case 'assignee':
          cmp = collate(a.assignee_display_name, b.assignee_display_name);
          break;
        case 'reporter':
          cmp = collate(a.reporter_name, b.reporter_name);
          break;
        case 'summary':
          cmp = collate(a.summary, b.summary);
          break;
        case 'work_type':
          cmp = collate(a.issue_type, b.issue_type);
          break;
        case 'resolution':
          cmp = collate(a.resolution, b.resolution);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [items, sortKey, sortAsc]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!sortedItems.length) return;
    const idx = sortedItems.findIndex(i => i.issue_key === selectedIssueKey);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < sortedItems.length - 1) onSelectIssue(sortedItems[idx + 1].issue_key); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) onSelectIssue(sortedItems[idx - 1].issue_key); }
  }, [sortedItems, selectedIssueKey, onSelectIssue]);

  return (
    <>
      {/* ── Header toolbar ── */}
      <div className="jlpHeader">
        <div className="jlpSortRow" ref={sortRef}>
          <button
            className={`jlpSortBtn ${sortMenuOpen ? 'active' : ''}`}
            onClick={() => setSortMenuOpen(o => !o)}
          >
            {sortLabel} <ChevronDown size={14} />
          </button>
          <button className="jlpToolBtn" title={sortAsc ? 'Sort ascending' : 'Sort descending'} onClick={() => setSortAsc(a => !a)}>
            {sortAsc ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />}
          </button>
          <button className="jlpToolBtn" title="Refresh"><RotateCcw size={16} /></button>

          {sortMenuOpen && (
            <div className="jlpSortMenu">
              <div className="jlpSortMenuTitle">Order work items by</div>
              {SORT_OPTIONS.filter(o => o.group === 'order').map(opt => (
                <label key={opt.key} className="jlpSortOption">
                  <input type="radio" name="sort" checked={sortKey === opt.key} onChange={() => { setSortKey(opt.key); setSortMenuOpen(false); }} />
                  {opt.label}
                </label>
              ))}
              <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
              {SORT_OPTIONS.filter(o => o.group === 'extra').map(opt => (
                <label key={opt.key} className="jlpSortOption">
                  <input type="radio" name="sort" checked={sortKey === opt.key} onChange={() => { setSortKey(opt.key); setSortMenuOpen(false); }} />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable card list ── */}
      <div className="jlpBody" onKeyDown={handleKeyDown} tabIndex={0}>
        {loading && !sortedItems.length ? (
          <div className="jlpCards">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="jlpCard jlpCardSkeleton">
                <div className="jlpSkLine" style={{ width: '85%', height: 14 }} />
                <div className="jlpSkLine" style={{ width: '60%', height: 14, marginTop: 6 }} />
                <div className="jlpSkRow">
                  <div className="jlpSkLine" style={{ width: 60, height: 12 }} />
                  <div className="jlpSkCircle" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="jlpEmpty">
            No issues found
            {searchQuery && (
              <button onClick={() => handleSearchChange('')} className="jlpResetLink">
                Reset search
              </button>
            )}
          </div>
        ) : (
          <div className="jlpCards" role="listbox" aria-label="Issues">
            {sortedItems.map((item) => {
              const isSelected = item.issue_key === selectedIssueKey;
              const avatarUrl = item.assignee_avatar || (item.assignee_display_name ? avatarMap[item.assignee_display_name] : null);

              return (
                <div
                  key={item.issue_key}
                  role="option"
                  aria-selected={isSelected}
                  className={`jlpCard ${isSelected ? 'jlpCardSelected' : ''}`}
                  onClick={() => onSelectIssue(item.issue_key)}
                >
                  {/* Summary — prominent, top of card */}
                  <div className={`jlpCardSummary ${isSelected ? 'jlpCardSummaryActive' : ''}`}>
                    {item.summary}
                  </div>

                  {/* Bottom row: icon + key  ···  avatar */}
                  <div className="jlpCardFooter">
                    <div className="jlpCardMeta">
                      <JiraIssueTypeIcon type={item.issue_type} size={16} />
                      <IssueKeyLink
                        issueKey={item.issue_key}
                        className="jlpCardKey"
                        style={{ color: '#0052CC', textDecoration: 'none' }}
                      />
                    </div>
                    <CatalystOwnerAvatar
                      type={item.assignee_display_name ? 'human' : 'placeholder'}
                      name={item.assignee_display_name || undefined}
                      avatarUrl={avatarUrl || undefined}
                      size="md"
                      showTooltip
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Footer count — pinned outside scroll, Jira parity */}
      {sortedItems.length > 0 && (
        <div className="jlpFooterCount">
          {sortedItems.length} of <strong>{sortedItems.length >= 1000 ? '1000+' : sortedItems.length}</strong>
        </div>
      )}
    </>
  );
}
