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
import type { AllWorkItem } from '@/types/allwork.types';

/* ── Avatar helpers ── */
const AVATAR_COLORS = ['#6554C0', '#2684FF', '#36B37E', '#FF5630', '#FFAB00', '#00B8D9', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

/* ── Sort options (Jira parity) ── */
type SortKey = 'updated' | 'created' | 'key' | 'priority' | 'status';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Last viewed' },
  { key: 'created', label: 'Created' },
  { key: 'key', label: 'Key' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
];

/* ── Avatar resolution hook ── */
function useAvatarMap(items: AllWorkItem[]) {
  // Collect unique assignee names that need avatar resolution
  const assigneeNames = useMemo(() => {
    const names = new Set<string>();
    items.forEach(i => { if (i.assignee_display_name) names.add(i.assignee_display_name); });
    return Array.from(names);
  }, [items]);

  const { data: profileMap } = useQuery({
    queryKey: ['avatar-map-profiles', assigneeNames.join(',')],
    queryFn: async () => {
      if (assigneeNames.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .in('full_name', assigneeNames);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { if (p.avatar_url) map[p.full_name] = p.avatar_url; });
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
              {SORT_OPTIONS.map(opt => (
                <label key={opt.key} className="jlpSortOption">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortKey === opt.key}
                    onChange={() => { setSortKey(opt.key); setSortMenuOpen(false); }}
                  />
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
                      <span className="jlpCardKey">{item.issue_key}</span>
                    </div>
                    {item.assignee_display_name ? (
                      avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={item.assignee_display_name}
                          title={item.assignee_display_name}
                          className="jlpCardAvatar"
                        />
                      ) : (
                        <div
                          className="jlpCardAvatarFallback"
                          style={{ background: avatarBg(item.assignee_display_name) }}
                          title={item.assignee_display_name}
                        >
                          {initials(item.assignee_display_name)}
                        </div>
                      )
                    ) : (
                      <div className="jlpCardAvatarEmpty" title="Unassigned">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B3BAC5" strokeWidth="1.5">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M20 21a8 8 0 10-16 0" />
                        </svg>
                      </div>
                    )}
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
