/**
 * IssueViewShell — 3-panel layout matching Jira Cloud:
 * Top: toolbar (Ask AI, Search, avatars, Filter, Saved filters, Table/Split toggle)
 * Left: issue list | Right: issue view (content + collapsible Details sidebar)
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useIssueViewData } from '@/hooks/workhub/useIssueViewData';
import { IssueListPanel } from './IssueListPanel';
import { IssueContentView } from './IssueContentView';
import { Search, SlidersHorizontal, ChevronDown, LayoutGrid, Columns2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  projectKey: string;
  storageKey: string;
}

/** Fetch unique assignees for the avatar stack */
function useAssigneeAvatars(projectKey: string) {
  return useQuery({
    queryKey: ['assignee-avatars-toolbar', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('assignee_display_name, assignee_avatar')
        .eq('project_key', projectKey)
        .not('assignee_display_name', 'is', null)
        .limit(200);
      // Deduplicate by name
      const map = new Map<string, { name: string; avatar: string | null }>();
      (data ?? []).forEach((r: any) => {
        if (r.assignee_display_name && !map.has(r.assignee_display_name)) {
          map.set(r.assignee_display_name, { name: r.assignee_display_name, avatar: r.assignee_avatar || null });
        }
      });
      return Array.from(map.values());
    },
    staleTime: 5 * 60 * 1000,
  });
}

const AVATAR_COLORS = ['#6554C0', '#2684FF', '#36B37E', '#FF5630', '#FFAB00', '#00B8D9'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

export function IssueViewShell({ projectKey, storageKey }: Props) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(
    searchParams.get('selectedIssue'),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toolbarSearch, setToolbarSearch] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');

  const {
    items, itemsLoading, selectedItem, parentItem,
    children, childrenLoading, links, linksLoading,
    comments, commentsLoading, history, historyLoading, createComment,
  } = useIssueViewData(projectKey, selectedIssueKey, searchQuery);

  const { data: assignees = [] } = useAssigneeAvatars(projectKey);

  // Auto-select first
  useEffect(() => {
    if (!selectedIssueKey && items.length > 0 && !itemsLoading) {
      const key = items[0].issue_key;
      setSelectedIssueKey(key);
      setSearchParams(p => { p.set('selectedIssue', key); return p; }, { replace: true });
    }
  }, [items, selectedIssueKey, itemsLoading]);

  const handleSelect = useCallback((key: string) => {
    setSelectedIssueKey(key);
    setSearchParams(p => { p.set('selectedIssue', key); return p; });
  }, [setSearchParams]);

  // Navigate prev/next
  const handlePrevNext = useCallback((direction: 'prev' | 'next') => {
    if (!items.length || !selectedIssueKey) return;
    const idx = items.findIndex(i => i.issue_key === selectedIssueKey);
    if (direction === 'prev' && idx > 0) handleSelect(items[idx - 1].issue_key);
    if (direction === 'next' && idx < items.length - 1) handleSelect(items[idx + 1].issue_key);
  }, [items, selectedIssueKey, handleSelect]);

  const visibleAvatars = assignees.slice(0, 5);
  const overflowCount = Math.max(0, assignees.length - 5);

  return (
    <div className={`awShellWrap ${isDark ? 'dark' : ''}`}>
      {/* ── Top toolbar (Jira parity: Ask AI, Search, avatars, Filter, Saved filters, view toggle) ── */}
      <div className="awToolbar">
        <div className="awToolbarLeft">
          {/* Search work */}
          <div className="awToolbarSearch">
            <Search style={{ width: 14, height: 14, color: '#6B778C', flexShrink: 0 }} />
            <input
              placeholder="Search work"
              value={toolbarSearch}
              onChange={e => { setToolbarSearch(e.target.value); setSearchQuery(e.target.value); }}
              className="awToolbarSearchInput"
            />
          </div>

          {/* Avatar stack */}
          <div className="awToolbarAvatars">
            {visibleAvatars.map((a, i) => (
              a.avatar ? (
                <img key={a.name} src={a.avatar} alt={a.name} title={a.name} className="awToolbarAvatar" style={{ zIndex: 10 - i, marginLeft: i > 0 ? -6 : 0 }} />
              ) : (
                <div key={a.name} className="awToolbarAvatarFallback" style={{ background: avatarBg(a.name), zIndex: 10 - i, marginLeft: i > 0 ? -6 : 0 }} title={a.name}>
                  {initials(a.name)}
                </div>
              )
            ))}
            {overflowCount > 0 && (
              <div className="awToolbarAvatarOverflow" style={{ marginLeft: -6 }}>+{overflowCount}</div>
            )}
          </div>

          {/* Filter */}
          <button className="awToolbarBtn">
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
            Filter
          </button>
        </div>

        <div className="awToolbarRight">
          {/* View toggle: Table / Split */}
          <div className="awViewToggle">
            <button
              className={`awViewToggleBtn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <LayoutGrid style={{ width: 16, height: 16 }} />
            </button>
            <button
              className={`awViewToggleBtn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Split view"
            >
              <Columns2 style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* More */}
          <button className="awToolbarBtn" style={{ padding: '0 6px' }}>⋯</button>
        </div>
      </div>

      {/* ── 2-column split view ── */}
      <div className={`awShell ${isDark ? 'dark' : ''}`}>
        {/* Left: issue list */}
        <div className="awCol">
          <IssueListPanel
            projectKey={projectKey}
            selectedIssueKey={selectedIssueKey}
            onSelectIssue={handleSelect}
            onSearch={setSearchQuery}
            items={items}
            loading={itemsLoading}
            totalCount={items.length}
          />
        </div>

        {/* Divider */}
        <div className="awDivider" />

        {/* Right: issue view (content + collapsible details sidebar) */}
        <div className="awCol">
          <IssueContentView
            issueKey={selectedIssueKey}
            item={selectedItem}
            parentItem={parentItem}
            childItems={children}
            childrenLoading={childrenLoading}
            links={links}
            linksLoading={linksLoading}
            comments={comments}
            commentsLoading={commentsLoading}
            historyItems={history}
            historyLoading={historyLoading}
            createComment={createComment}
            loading={itemsLoading && !selectedItem}
            onPrev={() => handlePrevNext('prev')}
            onNext={() => handlePrevNext('next')}
          />
        </div>
      </div>
    </div>
  );
}
