/**
 * IssueViewShell — Jira "All work" tab layout:
 * Tabs strip → Toolbar + sortable table (left) + detail panel (right)
 */
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useIssueViewData } from '@/hooks/workhub/useIssueViewData';
import { AllWorkTable } from './AllWorkTable';
import { IssueDetailPanel } from './IssueDetailPanel';

interface Props {
  projectKey: string;
  storageKey: string;
}

export function IssueViewShell({ projectKey, storageKey }: Props) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedKey, setSelectedKey] = useState<string | null>(searchParams.get('selectedIssue'));
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(true);

  const data = useIssueViewData(projectKey, selectedKey, searchQuery);

  // Auto-select first item
  useEffect(() => {
    if (!selectedKey && data.items.length > 0 && !data.itemsLoading) {
      const key = data.items[0].issue_key;
      setSelectedKey(key);
      setSearchParams(p => { p.set('selectedIssue', key); return p; }, { replace: true });
    }
  }, [data.items, selectedKey, data.itemsLoading]);

  const handleSelect = useCallback((key: string) => {
    setSelectedKey(key);
    setDetailOpen(true);
    setSearchParams(p => { p.set('selectedIssue', key); return p; });
  }, [setSearchParams]);

  return (
    <div className={`allwork-root ${isDark ? 'dark' : ''}`}>
      {/* ── Tabs ── */}
      <div className="allwork-tabs">
        <button className="allwork-tab allwork-tab--active">All work</button>
        <button className="allwork-tab">Board</button>
        <button className="allwork-tab">Timeline</button>
      </div>

      {/* ── Main: table + detail panel ── */}
      <div className="allwork-main">
        {/* Left: toolbar + table */}
        <div className="allwork-left">
          <AllWorkTable
            items={data.items}
            loading={data.itemsLoading}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            projectKey={projectKey}
          />
        </div>

        {/* Right: detail panel */}
        {detailOpen && selectedKey && (
          <IssueDetailPanel
            item={data.selectedItem}
            parentItem={data.parentItem}
            onClose={() => setDetailOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
