/**
 * IssueViewShell — 3-column layout (Left list | Center content | Right details)
 * ════════════════════════════════════════════════════════════════════════════
 * Resizable panels with localStorage persistence.
 * Responsive: 3-col >= 1280px, 2-col 960-1279px, 1-col < 960px.
 */
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useResizablePanel } from '@/hooks/workhub/useResizablePanel';
import { PanelLeft, PanelRight } from 'lucide-react';
import { IssueListPanel } from './IssueListPanel';
import { IssueCenterPanel } from './IssueCenterPanel';
import { IssueRightPanel } from './IssueRightPanel';
import type { IssueViewShellProps } from '@/types/issue-view.types';
import type { AllWorkItem } from '@/types/allwork.types';

export function IssueViewShell({
  projectKey,
  selectedIssueKey,
  onSearch,
  onSelectIssue,
  onSyncUrlSelectedIssue,
  storageKey,
}: IssueViewShellProps) {
  const { isDark } = useTheme();
  const {
    leftWidth,
    rightWidth,
    isDraggingLeft,
    isDraggingRight,
    onLeftSplitterMouseDown,
    onRightSplitterMouseDown,
  } = useResizablePanel({ storageKey });

  // Responsive breakpoint detection
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
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

  // URL sync
  const handleSelectIssue = useCallback((key: string) => {
    onSelectIssue(key);
    onSyncUrlSelectedIssue(key);
    if (is1Col) setLeftDrawerOpen(false);
  }, [onSelectIssue, onSyncUrlSelectedIssue, is1Col]);

  return (
    <div
      className={cn(
        'h-[calc(100vh-var(--cp-layout-topnav))] overflow-hidden',
        isDark ? 'bg-[#0A0A0A]' : 'bg-[#F7F8F9]',
      )}
    >
      {/* 3-column grid layout */}
      <div
        className="h-full flex"
        style={{
          // Prevent text selection during drag
          ...(isDraggingLeft || isDraggingRight ? { userSelect: 'none' } : {}),
        }}
      >
        {/* ─── LEFT PANEL ─── */}
        {(is3Col || is2Col) && (
          <>
            <aside
              className={cn(
                'flex flex-col h-full shrink-0',
                'border-r',
                isDark ? 'bg-[#111111] border-[#2E2E2E]' : 'bg-white border-[#DFE1E6]',
              )}
              style={{ width: leftWidth }}
            >
              <IssueListPanel
                projectKey={projectKey}
                selectedIssueKey={selectedIssueKey ?? null}
                onSelectIssue={handleSelectIssue}
                onSearch={onSearch}
                isDark={isDark}
              />
            </aside>

            {/* Left splitter */}
            <div
              className={cn(
                'w-[6px] shrink-0 cursor-col-resize relative z-10',
                'flex items-center justify-center',
                'hover:bg-[#0C66E4]/10',
                isDraggingLeft && 'bg-[#0C66E4]/10',
              )}
              onMouseDown={onLeftSplitterMouseDown}
            >
              <div
                className={cn(
                  'w-px h-full transition-colors duration-150',
                  isDraggingLeft
                    ? 'bg-[#0C66E4]'
                    : isDark ? 'bg-[#2E2E2E]' : 'bg-transparent hover:bg-[#DFE1E6]',
                )}
              />
            </div>
          </>
        )}

        {/* ─── 1-col: Left drawer overlay ─── */}
        {is1Col && leftDrawerOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setLeftDrawerOpen(false)}
            />
            <aside
              className={cn(
                'relative z-50 w-[360px] max-w-[85vw] h-full shadow-lg',
                isDark ? 'bg-[#111111]' : 'bg-white',
              )}
            >
              <IssueListPanel
                projectKey={projectKey}
                selectedIssueKey={selectedIssueKey ?? null}
                onSelectIssue={handleSelectIssue}
                onSearch={onSearch}
                isDark={isDark}
              />
            </aside>
          </div>
        )}

        {/* ─── CENTER PANEL ─── */}
        <main
          className={cn(
            'flex flex-col h-full flex-1 min-w-0',
            isDark ? 'bg-[#0A0A0A]' : 'bg-white',
          )}
        >
          {/* Mobile controls */}
          {(is1Col || is2Col) && (
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 border-b shrink-0',
              isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
            )}>
              {is1Col && (
                <button
                  onClick={() => setLeftDrawerOpen(true)}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    isDark
                      ? 'hover:bg-[#1F1F1F] text-[#A1A1A1]'
                      : 'hover:bg-[#F4F5F7] text-[#505258]',
                  )}
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              {is2Col && (
                <button
                  onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
                  className={cn(
                    'ml-auto p-1.5 rounded-md transition-colors',
                    isDark
                      ? 'hover:bg-[#1F1F1F] text-[#A1A1A1]'
                      : 'hover:bg-[#F4F5F7] text-[#505258]',
                  )}
                >
                  <PanelRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <IssueCenterPanel
            issueKey={selectedIssueKey ?? null}
            isDark={isDark}
          />
        </main>

        {/* ─── RIGHT PANEL ─── */}
        {is3Col && (
          <>
            {/* Right splitter */}
            <div
              className={cn(
                'w-[6px] shrink-0 cursor-col-resize relative z-10',
                'flex items-center justify-center',
                'hover:bg-[#0C66E4]/10',
                isDraggingRight && 'bg-[#0C66E4]/10',
              )}
              onMouseDown={onRightSplitterMouseDown}
            >
              <div
                className={cn(
                  'w-px h-full transition-colors duration-150',
                  isDraggingRight
                    ? 'bg-[#0C66E4]'
                    : isDark ? 'bg-[#2E2E2E]' : 'bg-transparent hover:bg-[#DFE1E6]',
                )}
              />
            </div>

            <aside
              className={cn(
                'flex flex-col h-full shrink-0',
                'border-l',
                isDark ? 'bg-[#111111] border-[#2E2E2E]' : 'bg-white border-[#DFE1E6]',
              )}
              style={{ width: rightWidth }}
            >
              <IssueRightPanel
                issueKey={selectedIssueKey ?? null}
                isDark={isDark}
              />
            </aside>
          </>
        )}

        {/* ─── 2-col: Right drawer ─── */}
        {is2Col && rightDrawerOpen && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setRightDrawerOpen(false)}
            />
            <aside
              className={cn(
                'relative z-50 w-[400px] max-w-[85vw] h-full shadow-lg',
                isDark ? 'bg-[#111111]' : 'bg-white',
              )}
            >
              <IssueRightPanel
                issueKey={selectedIssueKey ?? null}
                isDark={isDark}
              />
            </aside>
          </div>
        )}

        {/* ─── 1-col: Right full-screen drawer ─── */}
        {is1Col && rightDrawerOpen && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setRightDrawerOpen(false)}
            />
            <aside
              className={cn(
                'relative z-50 w-full h-full shadow-lg',
                isDark ? 'bg-[#111111]' : 'bg-white',
              )}
            >
              <IssueRightPanel
                issueKey={selectedIssueKey ?? null}
                isDark={isDark}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
