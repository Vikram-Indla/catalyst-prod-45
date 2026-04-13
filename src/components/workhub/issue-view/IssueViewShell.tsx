/**
 * IssueViewShell — 3-column layout (Left list | Center content | Right details)
 * ════════════════════════════════════════════════════════════════════════════
 * Production-ready: wired to Supabase via useIssueViewData composite hook.
 * Resizable panels with localStorage persistence.
 * Responsive: 3-col >= 1280px, 2-col 960-1279px, 1-col < 960px.
 * URL sync: ?selectedIssue=KEY via pushState (user action) / replaceState (refresh).
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useResizablePanel } from '@/hooks/workhub/useResizablePanel';
import { useIssueViewData } from '@/hooks/workhub/useIssueViewData';
import { PanelLeft, PanelRight } from 'lucide-react';
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

  // URL sync: ?selectedIssue=KEY
  const urlSelectedKey = searchParams.get('selectedIssue');
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(urlSelectedKey);
  const [searchQuery, setSearchQuery] = useState('');

  // Resizable panels
  const {
    leftWidth, rightWidth,
    isDraggingLeft, isDraggingRight,
    onLeftSplitterMouseDown, onRightSplitterMouseDown,
  } = useResizablePanel({ storageKey });

  // Responsive breakpoints
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const is3Col = windowWidth >= 1280;
  const is2Col = windowWidth >= 960 && windowWidth < 1280;
  const is1Col = windowWidth < 960;

  // ─── Data layer (real Supabase) ───
  const {
    items, itemsLoading,
    selectedItem, parentItem,
    children, childrenLoading,
    links, linksLoading,
    comments, commentsLoading,
    history, historyLoading,
    createComment,
  } = useIssueViewData(projectKey, selectedIssueKey, searchQuery);

  // Auto-select first item if none selected
  useEffect(() => {
    if (!selectedIssueKey && items.length > 0 && !itemsLoading) {
      const firstKey = items[0].issue_key;
      setSelectedIssueKey(firstKey);
      setSearchParams(prev => {
        prev.set('selectedIssue', firstKey);
        return prev;
      }, { replace: true });
    }
  }, [items, selectedIssueKey, itemsLoading]);

  // URL sync: when selection changes via user action
  const handleSelectIssue = useCallback((key: string) => {
    setSelectedIssueKey(key);
    setSearchParams(prev => {
      prev.set('selectedIssue', key);
      return prev;
    });
    if (is1Col) setLeftDrawerOpen(false);
  }, [setSearchParams, is1Col]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <div
      className={cn(
        'h-[calc(100vh-var(--cp-layout-topnav))] overflow-hidden',
        isDark ? 'bg-[#0A0A0A]' : 'bg-[#F7F8F9]',
      )}
    >
      <div
        className="h-full flex"
        style={isDraggingLeft || isDraggingRight ? { userSelect: 'none' } : undefined}
      >
        {/* ─── LEFT PANEL ─── */}
        {(is3Col || is2Col) && (
          <>
            <aside
              className={cn(
                'flex flex-col h-full shrink-0 border-r',
                isDark ? 'bg-[#111111] border-[#2E2E2E]' : 'bg-white border-[#DFE1E6]',
              )}
              style={{ width: leftWidth }}
            >
              <IssueListPanel
                projectKey={projectKey}
                selectedIssueKey={selectedIssueKey}
                onSelectIssue={handleSelectIssue}
                onSearch={handleSearch}
                isDark={isDark}
                items={items}
                loading={itemsLoading}
              />
            </aside>
            <div
              className={cn(
                'w-[6px] shrink-0 cursor-col-resize relative z-10 flex items-center justify-center',
                'hover:bg-[#0C66E4]/10',
                isDraggingLeft && 'bg-[#0C66E4]/10',
              )}
              onMouseDown={onLeftSplitterMouseDown}
              onDoubleClick={() => {/* reset handled by hook */}}
            >
              <div className={cn(
                'w-px h-full transition-colors duration-150',
                isDraggingLeft ? 'bg-[#0C66E4]' : isDark ? 'bg-[#2E2E2E]' : 'bg-transparent hover:bg-[#DFE1E6]',
              )} />
            </div>
          </>
        )}

        {/* 1-col: Left drawer overlay */}
        {is1Col && leftDrawerOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setLeftDrawerOpen(false)} />
            <aside className={cn('relative z-50 w-[360px] max-w-[85vw] h-full shadow-lg', isDark ? 'bg-[#111111]' : 'bg-white')}>
              <IssueListPanel
                projectKey={projectKey}
                selectedIssueKey={selectedIssueKey}
                onSelectIssue={handleSelectIssue}
                onSearch={handleSearch}
                isDark={isDark}
                items={items}
                loading={itemsLoading}
              />
            </aside>
          </div>
        )}

        {/* ─── CENTER PANEL ─── */}
        <main className={cn('flex flex-col h-full flex-1 min-w-0', isDark ? 'bg-[#0A0A0A]' : 'bg-white')}>
          {(is1Col || is2Col) && (
            <div className={cn('flex items-center gap-2 px-4 py-2 border-b shrink-0', isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]')}>
              {is1Col && (
                <button onClick={() => setLeftDrawerOpen(true)} className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-[#1F1F1F] text-[#A1A1A1]' : 'hover:bg-[#F4F5F7] text-[#505258]')}>
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              {is2Col && (
                <button onClick={() => setRightDrawerOpen(!rightDrawerOpen)} className={cn('ml-auto p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-[#1F1F1F] text-[#A1A1A1]' : 'hover:bg-[#F4F5F7] text-[#505258]')}>
                  <PanelRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <IssueCenterPanel
            issueKey={selectedIssueKey}
            isDark={isDark}
            item={selectedItem}
            parentItem={parentItem}
            loading={itemsLoading && !selectedItem}
          />
        </main>

        {/* ─── RIGHT PANEL ─── */}
        {is3Col && (
          <>
            <div
              className={cn(
                'w-[6px] shrink-0 cursor-col-resize relative z-10 flex items-center justify-center',
                'hover:bg-[#0C66E4]/10',
                isDraggingRight && 'bg-[#0C66E4]/10',
              )}
              onMouseDown={onRightSplitterMouseDown}
            >
              <div className={cn(
                'w-px h-full transition-colors duration-150',
                isDraggingRight ? 'bg-[#0C66E4]' : isDark ? 'bg-[#2E2E2E]' : 'bg-transparent hover:bg-[#DFE1E6]',
              )} />
            </div>
            <aside
              className={cn('flex flex-col h-full shrink-0 border-l', isDark ? 'bg-[#111111] border-[#2E2E2E]' : 'bg-white border-[#DFE1E6]')}
              style={{ width: rightWidth }}
            >
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
            </aside>
          </>
        )}

        {/* 2-col / 1-col: Right drawer */}
        {((is2Col && rightDrawerOpen) || (is1Col && rightDrawerOpen)) && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setRightDrawerOpen(false)} />
            <aside className={cn('relative z-50 h-full shadow-lg', is1Col ? 'w-full' : 'w-[400px] max-w-[85vw]', isDark ? 'bg-[#111111]' : 'bg-white')}>
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
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
