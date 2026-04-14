/**
 * IssueViewShell — 3-panel layout matching Jira Cloud:
 * Top: toolbar (Search, Filter — matches For You page pattern)
 * Left: issue list | Right: issue view (content + collapsible Details sidebar)
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useIssueViewData } from '@/hooks/workhub/useIssueViewData';
import { IssueListPanel } from './IssueListPanel';
import { IssueContentView } from './IssueContentView';
import { Search } from 'lucide-react';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  projectKey: string;
  storageKey: string;
}

export function IssueViewShell({ projectKey, storageKey }: Props) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(
    searchParams.get('selectedIssue'),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toolbarSearch, setToolbarSearch] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string[]>>({});

  const {
    items, itemsLoading, selectedItem, parentItem,
    children, childrenLoading, links, linksLoading,
    comments, commentsLoading, history, historyLoading,
    worklogs, worklogsLoading, createComment, logWork,
  } = useIssueViewData(projectKey, selectedIssueKey, searchQuery);

  // Build filter categories from items
  const filterCategories = useMemo<FilterCategory[]>(() => {
    const statuses = [...new Set(items.map(i => i.status).filter(Boolean))].sort();
    const priorities = [...new Set(items.map(i => i.priority).filter(Boolean))].sort();
    const assignees = [...new Set(items.map(i => i.assignee_display_name).filter(Boolean))].sort();
    const types = [...new Set(items.map(i => i.issue_type).filter(Boolean))].sort();

    return [
      { id: 'status', label: 'Status', options: statuses.map(s => ({ id: s, label: s })) },
      { id: 'priority', label: 'Priority', options: priorities.map(p => ({ id: p, label: p })) },
      { id: 'assignee', label: 'Assignee', options: assignees.map(a => ({ id: a, label: a })) },
      { id: 'type', label: 'Type', options: types.map(t => ({ id: t, label: t })) },
    ].filter(c => c.options.length > 0);
  }, [items]);

  const advancedFilterCount = useMemo(() => Object.values(advancedFilters).flat().length, [advancedFilters]);

  const handleAdvancedFilterChange = useCallback((key: string, values: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: values }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setAdvancedFilters({});
  }, []);

  // Filter items based on advanced filters
  const filteredItems = useMemo(() => {
    if (advancedFilterCount === 0) return items;
    return items.filter(item => {
      if (advancedFilters.status?.length && !advancedFilters.status.includes(item.status)) return false;
      if (advancedFilters.priority?.length && !advancedFilters.priority.includes(item.priority)) return false;
      if (advancedFilters.assignee?.length && !advancedFilters.assignee.includes(item.assignee_display_name || '')) return false;
      if (advancedFilters.type?.length && !advancedFilters.type.includes(item.issue_type)) return false;
      return true;
    });
  }, [items, advancedFilters, advancedFilterCount]);

  // Auto-select first
  useEffect(() => {
    if (!selectedIssueKey && filteredItems.length > 0 && !itemsLoading) {
      const key = filteredItems[0].issue_key;
      setSelectedIssueKey(key);
      setSearchParams(p => { p.set('selectedIssue', key); return p; }, { replace: true });
    }
  }, [filteredItems, selectedIssueKey, itemsLoading]);

  const handleSelect = useCallback((key: string) => {
    setSelectedIssueKey(key);
    setSearchParams(p => { p.set('selectedIssue', key); return p; });
  }, [setSearchParams]);

  // Navigate prev/next
  const handlePrevNext = useCallback((direction: 'prev' | 'next') => {
    if (!filteredItems.length || !selectedIssueKey) return;
    const idx = filteredItems.findIndex(i => i.issue_key === selectedIssueKey);
    if (direction === 'prev' && idx > 0) handleSelect(filteredItems[idx - 1].issue_key);
    if (direction === 'next' && idx < filteredItems.length - 1) handleSelect(filteredItems[idx + 1].issue_key);
  }, [filteredItems, selectedIssueKey, handleSelect]);

  return (
    <div className={`awShellWrap ${isDark ? 'dark' : ''}`}>
      {/* ── Top toolbar (For You page pattern: Search + Filter) ── */}
      <div className="awToolbar">
        <div className="awToolbarLeft">
          {/* Search work — matches For You page w-80 pattern */}
          <div className="awToolbarSearch" style={{ width: 320 }}>
            <Search style={{ width: 14, height: 14, color: '#6B778C', flexShrink: 0 }} />
            <input
              placeholder="Search work"
              value={toolbarSearch}
              onChange={e => { setToolbarSearch(e.target.value); setSearchQuery(e.target.value); }}
              className="awToolbarSearchInput"
            />
          </div>

          {/* Filter — JiraBasicFilter pattern from For You */}
          <div style={{ position: 'relative' }}>
            <FilterTriggerButton
              count={advancedFilterCount}
              onClick={() => setFilterPanelOpen(v => !v)}
              isOpen={filterPanelOpen}
            />
            {filterPanelOpen && (
              <JiraBasicFilter
                categories={filterCategories}
                selected={advancedFilters}
                onSelectionChange={handleAdvancedFilterChange}
                onClearAll={handleClearAllFilters}
                onClose={() => setFilterPanelOpen(false)}
              />
            )}
          </div>
        </div>

        <div className="awToolbarRight" />
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
            items={filteredItems}
            loading={itemsLoading}
            totalCount={filteredItems.length}
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
            worklogs={worklogs}
            worklogsLoading={worklogsLoading}
            createComment={createComment}
            logWork={logWork}
            loading={itemsLoading && !selectedItem}
            onPrev={() => handlePrevNext('prev')}
            onNext={() => handlePrevNext('next')}
          />
        </div>
      </div>
    </div>
  );
}
