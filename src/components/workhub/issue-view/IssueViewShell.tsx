/**
 * IssueViewShell — Flat 3-column layout matching Jira issue view
 * ════════════════════════════════════════════════════════════════════════════
 * Flat white columns · 1px separators · sticky headers · independent scroll
 * Uses CSS classes from allwork.css (no Tailwind panel cards/shadows)
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useIssueViewData } from '@/hooks/workhub/useIssueViewData';
import { IssueListPanel } from './IssueListPanel';
import { IssueCenterPanel } from './IssueCenterPanel';
import { IssueRightPanel } from './IssueRightPanel';

interface IssueViewShellProps {
  projectKey: string;
  storageKey: string;
}

export function IssueViewShell({ projectKey, storageKey }: IssueViewShellProps) {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSelectedKey = searchParams.get('selectedIssue');
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(urlSelectedKey);
  const [searchQuery, setSearchQuery] = useState('');

  // Splitter state
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftW, setLeftW] = useState(() => {
    try { const s = localStorage.getItem(storageKey); if (s) { const p = JSON.parse(s); return p.left ?? 340; } } catch {}
    return 340;
  });
  const [rightW, setRightW] = useState(() => {
    try { const s = localStorage.getItem(storageKey); if (s) { const p = JSON.parse(s); return p.right ?? 360; } } catch {}
    return 360;
  });

  // Persist widths
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ left: leftW, right: rightW })); } catch {}
  }, [leftW, rightW, storageKey]);

  // Data
  const {
    items, itemsLoading, selectedItem, parentItem,
    children, childrenLoading, links, linksLoading,
    comments, commentsLoading, history, historyLoading, createComment,
  } = useIssueViewData(projectKey, selectedIssueKey, searchQuery);

  // Auto-select first
  useEffect(() => {
    if (!selectedIssueKey && items.length > 0 && !itemsLoading) {
      const firstKey = items[0].issue_key;
      setSelectedIssueKey(firstKey);
      setSearchParams(prev => { prev.set('selectedIssue', firstKey); return prev; }, { replace: true });
    }
  }, [items, selectedIssueKey, itemsLoading]);

  const handleSelectIssue = useCallback((key: string) => {
    setSelectedIssueKey(key);
    setSearchParams(prev => { prev.set('selectedIssue', key); return prev; });
  }, [setSearchParams]);

  // Splitter drag handlers
  const handleSplitterDrag = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === 'left' ? leftW : rightW;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (side === 'left') {
        setLeftW(Math.max(280, Math.min(520, startW + delta)));
      } else {
        setRightW(Math.max(320, Math.min(520, startW - delta)));
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftW, rightW]);

  return (
    <div
      ref={containerRef}
      className={`awShell ${isDark ? 'dark' : ''}`}
      style={{
        '--aw-left': `${leftW}px`,
        '--aw-right': `${rightW}px`,
      } as React.CSSProperties}
    >
      {/* ── LEFT COLUMN ── */}
      <div className="awCol">
        <IssueListPanel
          projectKey={projectKey}
          selectedIssueKey={selectedIssueKey}
          onSelectIssue={handleSelectIssue}
          onSearch={setSearchQuery}
          items={items}
          loading={itemsLoading}
        />
      </div>

      {/* ── LEFT SPLITTER ── */}
      <div className="awSplitter" onMouseDown={(e) => handleSplitterDrag('left', e)} />

      {/* ── CENTER COLUMN ── */}
      <div className="awCol">
        <IssueCenterPanel
          issueKey={selectedIssueKey}
          item={selectedItem}
          parentItem={parentItem}
          loading={itemsLoading && !selectedItem}
        />
      </div>

      {/* ── RIGHT SPLITTER ── */}
      <div className="awSplitter" onMouseDown={(e) => handleSplitterDrag('right', e)} />

      {/* ── RIGHT COLUMN ── */}
      <div className="awCol">
        <IssueRightPanel
          issueKey={selectedIssueKey}
          isDark={isDark}
          item={selectedItem}
          parentItem={parentItem}
          children={children}
          childrenLoading={childrenLoading}
          links={links}
          linksLoading={linksLoading}
          comments={comments}
          commentsLoading={commentsLoading}
          history={history}
          historyLoading={historyLoading}
          createComment={createComment}
        />
      </div>
    </div>
  );
}
