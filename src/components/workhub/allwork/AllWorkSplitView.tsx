/**
 * @deprecated 2026-04-19 — DO NOT EDIT. Consumed only by the legacy
 *   /workhub/all-work route (src/pages/workhub/AllWork.tsx, also deprecated).
 *   The canonical "All Work" surface is
 *   src/pages/project-hub/jira-list/ProjectAllWorkView.tsx, whose detail
 *   panel is rendered by CatalystDetailRouter → StoryDetailModal.
 *
 * AllWorkSplitView — Left card list + right detail panel (V12 compliant)
 * Now includes Child work items tab with navigation stack for nested drill-down.
 */
import { useState, useMemo, useRef, useEffect, memo, Fragment } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Clock, History, ListTree, Link2, Paperclip, Tag, ArrowLeft, ArrowUp, ArrowDown, Check, Plus } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { AllWorkEmptyState } from './AllWorkEmptyState';
import { SubTasksTab, useSubTasks } from './SubTasksTab';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  items: AllWorkItem[];
  selectedItemKey: string | null;
  onSelectItem: (key: string) => void;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  /** Project display name for the detail-panel breadcrumb. Defaults to "Senaei BAU". */
  projectName?: string;
}

/** Sort fields exposed in the left-panel dropdown. Values map directly to
 *  columns accepted by supabase.order() in workhubService.fetchAllWorkList. */
const SORT_OPTIONS: { field: string; label: string }[] = [
  { field: 'updated_at', label: 'Last updated' },
  { field: 'created_at', label: 'Created' },
  { field: 'priority',   label: 'Priority' },
  { field: 'item_key',   label: 'Key' },
  { field: 'summary',    label: 'Title' },
];

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e', Lowest: '#8c8f96',
};

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];

type DetailTab = 'details' | 'subtasks' | 'attachments' | 'comments' | 'history' | 'links';

function formatRel(d: string | null): string {
  if (!d) return '—';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return '—'; }
}

function nameToHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

export function AllWorkSplitView({ items, selectedItemKey, onSelectItem, sortField, sortDir, onSort, projectName = 'Senaei BAU' }: Props) {
  const { isDark } = useTheme();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history' | 'worklog'>('all');

  // Click-outside + Esc to close sort dropdown
  useEffect(() => {
    if (!sortOpen) return;
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [sortOpen]);

  // Click-outside + Esc to close Add menu (TC-H7)
  useEffect(() => {
    if (!addOpen) return;
    const onClick = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [addOpen]);

  // TC-AC7 — press M (outside inputs) focuses the comment composer.
  // Switches to Details tab first, then focuses on next paint.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'm' && e.key !== 'M') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      )) return;
      e.preventDefault();
      setActiveTab('details');
      requestAnimationFrame(() => {
        commentInputRef.current?.focus();
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const currentSortLabel = SORT_OPTIONS.find(o => o.field === sortField)?.label ?? 'Last updated';

  // Navigation stack for nested drill-down
  const [panelStack, setPanelStack] = useState<AllWorkItem[]>([]);

  const listSelectedItem = useMemo(() =>
    items.find(i => i.issue_key === selectedItemKey) ?? items[0] ?? null
  , [items, selectedItemKey]);

  // When the list selection changes, reset the stack
  const prevListKey = useMemo(() => listSelectedItem?.issue_key, [listSelectedItem]);

  // Current item is top of stack, or the list-selected item
  const currentItem = panelStack.length > 0 ? panelStack[panelStack.length - 1] : listSelectedItem;
  const canGoBack = panelStack.length > 0;

  // Sub-task count for the tab badge
  const { subTasks: currentSubTasks } = useSubTasks(currentItem?.issue_key ?? null);
  const subTaskCount = currentSubTasks.length;

  const selectedIdx = items.findIndex(i => i.issue_key === listSelectedItem?.issue_key);

  const goPrev = () => { if (selectedIdx > 0) { onSelectItem(items[selectedIdx - 1].issue_key); setPanelStack([]); setActiveTab('details'); } };
  const goNext = () => { if (selectedIdx < items.length - 1) { onSelectItem(items[selectedIdx + 1].issue_key); setPanelStack([]); setActiveTab('details'); } };

  const handleListSelect = (key: string) => {
    onSelectItem(key);
    setPanelStack([]);
    setActiveTab('details');
  };

  const handleSubTaskClick = (subTask: AllWorkItem) => {
    // Push onto stack — first push the list item if stack is empty
    setPanelStack(prev => {
      if (prev.length === 0 && listSelectedItem) {
        return [listSelectedItem, subTask];
      }
      return [...prev, subTask];
    });
    setActiveTab('details');
  };

  const handleBack = () => {
    setPanelStack(prev => {
      if (prev.length <= 1) return [];
      return prev.slice(0, -1);
    });
    setActiveTab('details');
  };

  const handleBreadcrumbNav = (index: number) => {
    setPanelStack(prev => prev.slice(0, index + 1));
    setActiveTab('details');
  };

  // Tab config
  const TABS: { key: DetailTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'details', label: 'Details', icon: null },
    { key: 'subtasks', label: 'Child work items', icon: <ListTree className="w-3.5 h-3.5" />, count: subTaskCount },
    { key: 'attachments', label: 'Attachments', icon: <Paperclip className="w-3.5 h-3.5" /> },
    { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
    { key: 'links', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-full gap-0 rounded border overflow-hidden" style={{ borderColor: isDark ? '#2E2E2E' : 'var(--bd-default, #2E2E2E)', borderRadius: 4 }}>
      {/* Left card list — 320px */}
      <div className="flex flex-col" style={{ width: 320, borderRight: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)', backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--bg-app)' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)' }}>
          {/* Sort dropdown + direction toggle (TC-L1, TC-L2) */}
          <div className="relative flex items-center gap-0.5" ref={sortRef}>
            <button
              onClick={() => setSortOpen(v => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              aria-label={`Sort by ${currentSortLabel}. Click to change field.`}
              className="flex items-center gap-1 text-[12px] px-1.5 py-0.5 rounded transition-colors duration-[80ms] hover:bg-[var(--hover,#1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              style={{
                color: isDark ? '#A1A1A1' : '#6b6e76',
                fontFamily: 'var(--cp-font-body)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>Sort: {currentSortLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => onSort(sortField)}
              aria-label={sortDir === 'asc' ? 'Ascending. Click to reverse.' : 'Descending. Click to reverse.'}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="p-1 rounded transition-colors duration-[80ms] hover:bg-[var(--hover,#1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              style={{
                color: isDark ? '#A1A1A1' : '#6b6e76',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {sortDir === 'asc'
                ? <ArrowUp className="w-3 h-3" />
                : <ArrowDown className="w-3 h-3" />}
            </button>

            {sortOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-48 rounded-lg border shadow-lg z-50 py-1 animate-scale-in"
                style={{
                  borderColor: isDark ? '#2E2E2E' : 'var(--bd-default, #2E2E2E)',
                  backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--bg-app)',
                }}
                role="listbox"
                aria-label="Sort field"
              >
                {SORT_OPTIONS.map(opt => {
                  const isSelected = opt.field === sortField;
                  return (
                    <button
                      key={opt.field}
                      onClick={() => { onSort(opt.field); setSortOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-left transition-colors duration-[80ms] hover:bg-[var(--hover,#1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                      style={{
                        color: isDark ? '#EDEDED' : 'var(--fg-1)',
                        fontFamily: 'var(--cp-font-body)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3" style={{ color: '#2563EB' }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-[11px]" style={{ color: 'var(--fg-3)', fontFamily: 'var(--cp-font-mono)' }}>
            {items.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = item.issue_key === listSelectedItem?.issue_key;
            const hash = nameToHash(item.assignee_display_name || '');
            return (
              <div
                key={item.issue_key}
                onClick={() => handleListSelect(item.issue_key)}
                className="px-3 py-2.5 cursor-pointer transition-colors duration-[80ms]"
                style={{
                  borderBottom: isDark ? '1px solid #292929' : '1px solid var(--bd-subtle, #292929)',
                  backgroundColor: isActive ? 'rgba(37,99,235,0.08)' : isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--bg-app)',
                  borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <JiraIssueTypeIcon type={item.issue_type} size={14} style={{ marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-[18px] truncate" style={{ color: 'var(--fg-1)', fontWeight: 500, fontFamily: 'var(--cp-font-body)' }}>
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px]" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-blue)', fontWeight: 650 }}>
                        {item.issue_key}
                      </span>
                      {item.assignee_display_name && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
                          title={item.assignee_display_name}
                        >
                          {item.assignee_display_name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--fg-3)', borderTop: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)', fontFamily: 'var(--cp-font-mono)' }}>
          {items.length} of {items.length}
        </div>
      </div>

      {/* Detail panel */}
      {currentItem ? (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--bg-app)' }}>
          {/* Breadcrumb — always rendered, Jira parity */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 px-5 py-2"
            style={{
              fontSize: 12,
              lineHeight: '16px',
              fontFamily: 'var(--cp-font-body)',
              borderBottom: isDark ? '1px solid #292929' : '1px solid var(--bd-subtle, #292929)',
              backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--bg-app)',
              minHeight: 32,
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--cp-text-tertiary, #6b6e76)' }}>Projects</span>
            <span aria-hidden="true" style={{ color: 'var(--cp-border-strong, #CBD5E1)' }}>/</span>
            <span style={{ color: 'var(--cp-text-tertiary, #6b6e76)' }}>{projectName}</span>
            <span aria-hidden="true" style={{ color: 'var(--cp-border-strong, #CBD5E1)' }}>/</span>
            {panelStack.length > 1 ? (
              <>
                {panelStack.slice(0, -1).map((item) => {
                  const stackIndex = panelStack.indexOf(item);
                  return (
                    <Fragment key={item.issue_key}>
                      <button
                        onClick={() => handleBreadcrumbNav(stackIndex)}
                        className="transition-colors duration-[80ms] hover:underline focus-visible:outline-2 focus-visible:outline-[#2563EB] rounded-sm"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#2563EB',
                          fontFamily: 'var(--cp-font-mono)',
                          fontSize: 11,
                          fontWeight: 650,
                        }}
                      >
                        {item.issue_key}
                      </button>
                      <span aria-hidden="true" style={{ color: 'var(--cp-border-strong, #CBD5E1)' }}>/</span>
                    </Fragment>
                  );
                })}
                <span
                  aria-current="page"
                  style={{
                    fontFamily: 'var(--cp-font-mono)',
                    fontSize: 11,
                    fontWeight: 650,
                    color: isDark ? '#EDEDED' : 'var(--fg-1)',
                  }}
                >
                  {currentItem.issue_key}
                </span>
              </>
            ) : (
              <span
                aria-current="page"
                style={{
                  fontFamily: 'var(--cp-font-mono)',
                  fontSize: 11,
                  fontWeight: 650,
                  color: isDark ? '#EDEDED' : 'var(--fg-1)',
                }}
              >
                {currentItem.issue_key}
              </span>
            )}
          </nav>

          {/* Detail header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)' }}>
            <div className="flex items-center gap-2">
              {/* Back button */}
              {canGoBack && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors duration-[80ms] hover:bg-[var(--hover, #1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  style={{ color: 'var(--fg-2)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--cp-font-body)', border: 'none', background: 'none', cursor: 'pointer' }}
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
              <JiraIssueTypeIcon type={currentItem.issue_type} size={16} />
              <span className="text-[13px] font-semibold" style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-blue)' }}>
                {currentItem.issue_key}
              </span>
              {currentItem.parent_key && !canGoBack && (
                <>
                  <span className="text-[12px]" style={{ color: 'var(--fg-3)' }}>in</span>
                  <span className="text-[12px]" style={{ color: 'var(--cp-blue)' }}>{currentItem.parent_key}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!canGoBack && (
                <>
                  <button onClick={goPrev} disabled={selectedIdx <= 0} className="p-1 rounded hover:bg-[var(--hover, #1F1F1F)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Previous item">
                    <ChevronLeft className="w-4 h-4" style={{ color: 'var(--cp-text-tertiary, #6b6e76)' }} />
                  </button>
                  <span className="text-[11px]" style={{ color: 'var(--fg-3)', fontFamily: 'var(--cp-font-mono)' }}>{selectedIdx + 1}/{items.length}</span>
                  <button onClick={goNext} disabled={selectedIdx >= items.length - 1} className="p-1 rounded hover:bg-[var(--hover, #1F1F1F)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Next item">
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--cp-text-tertiary, #6b6e76)' }} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex items-center gap-0 px-5"
            style={{ borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)' }}
            role="tablist"
          >
            {TABS.map(tab => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-2.5 transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  style={{
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#2563EB' : 'var(--cp-text-tertiary, #6b6e76)',
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    marginBottom: -1, fontFamily: 'var(--cp-font-body)',
                    background: 'none', border: 'none', borderBottomStyle: 'solid',
                    borderBottomWidth: 2, borderBottomColor: isActive ? '#2563EB' : 'transparent',
                    cursor: 'pointer',
                  }}
                  role="tab"
                  aria-selected={isActive}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center',
                        padding: '1px 5px', borderRadius: 12,
                        backgroundColor: isActive ? 'rgba(37,99,235,0.10)' : isDark ? '#292929' : 'var(--bd-subtle, #292929)',
                        color: isActive ? '#2563EB' : 'var(--fg-3)',
                        fontFamily: 'var(--cp-font-mono)',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Main detail content */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : undefined }}>
              {/* ─── DETAILS TAB ─── */}
              {activeTab === 'details' && (
                <>
                  <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--fg-1)', lineHeight: '28px', fontFamily: 'var(--cp-font-body)' }}>
                    {currentItem.summary}
                  </h2>

                  {/* Quick-add (TC-H7) — labelled menu, not a naked + */}
                  <div className="relative mb-4" ref={addRef}>
                    <button
                      onClick={() => setAddOpen(v => !v)}
                      aria-haspopup="menu"
                      aria-expanded={addOpen}
                      aria-label="Add child issue, attachment, or link"
                      className="inline-flex items-center gap-1 text-[12px] px-2 h-7 rounded border transition-colors duration-[80ms] hover:bg-[var(--hover,#1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                      style={{
                        borderColor: isDark ? '#2E2E2E' : 'var(--bd-default, #2E2E2E)',
                        color: isDark ? '#A1A1A1' : 'var(--fg-2)',
                        backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--bg-app)',
                        fontFamily: 'var(--cp-font-body)',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {addOpen && (
                      <div
                        className="absolute top-full left-0 mt-1 w-52 rounded-lg border shadow-lg z-50 py-1 animate-scale-in"
                        style={{
                          borderColor: isDark ? '#2E2E2E' : 'var(--bd-default, #2E2E2E)',
                          backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--bg-app)',
                        }}
                        role="menu"
                        aria-label="Add to this work item"
                      >
                        {[
                          { key: 'child',  label: 'Add child issue',  icon: <ListTree className="w-3.5 h-3.5" />,  tab: 'subtasks' as DetailTab },
                          { key: 'attach', label: 'Add attachment',   icon: <Paperclip className="w-3.5 h-3.5" />, tab: 'attachments' as DetailTab },
                          { key: 'link',   label: 'Add link',         icon: <Link2 className="w-3.5 h-3.5" />,     tab: 'links' as DetailTab },
                        ].map(action => (
                          <button
                            key={action.key}
                            onClick={() => { setActiveTab(action.tab); setAddOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors duration-[80ms] hover:bg-[var(--hover,#1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                            style={{
                              color: isDark ? '#EDEDED' : 'var(--fg-1)',
                              fontFamily: 'var(--cp-font-body)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            role="menuitem"
                          >
                            <span style={{ color: 'var(--cp-text-tertiary, #6b6e76)' }}>{action.icon}</span>
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Key details */}
                  <div className="mb-6">
                    <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em', fontFamily: 'var(--cp-font-body)' }}>
                      Key Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] block mb-1" style={{ color: 'var(--fg-3)' }}>Priority</span>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[currentItem.priority] || 'var(--cp-blue)' }} />
                          <span className="text-[13px]" style={{ color: 'var(--fg-1)' }}>{currentItem.priority}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] block mb-1" style={{ color: 'var(--fg-3)' }}>Status</span>
                        <StatusLozenge status={currentItem.status} />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>
                      Description
                    </h3>
                    {currentItem.description_text ? (
                      <p className="text-[13px] leading-[20px]" style={{ color: 'var(--cp-text-secondary, #44546f)', fontFamily: 'var(--cp-font-body)' }}>
                        {currentItem.description_text}
                      </p>
                    ) : (
                      <p className="text-[12px] italic" style={{ color: 'var(--fg-3)' }}>No description provided</p>
                    )}
                  </div>

                  {/* Activity section */}
                  <div>
                    <div className="flex items-center gap-4 mb-3" style={{ borderBottom: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)', paddingBottom: 8 }}>
                      {(['all', 'comments', 'history', 'worklog'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActivityTab(tab)}
                          className="text-[12px] pb-1 capitalize transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                          style={{
                            color: activityTab === tab ? '#2563EB' : 'var(--cp-text-tertiary, #6b6e76)',
                            fontWeight: activityTab === tab ? 600 : 400,
                            borderBottom: activityTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                            fontFamily: 'var(--cp-font-body)',
                            background: 'none', border: 'none', borderBottomStyle: 'solid',
                            borderBottomWidth: 2, borderBottomColor: activityTab === tab ? '#2563EB' : 'transparent',
                            cursor: 'pointer',
                          }}
                          role="tab"
                          aria-selected={activityTab === tab}
                        >
                          {tab === 'all' ? 'All' : tab === 'worklog' ? 'Work log' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>

                    {activityTab === 'comments' ? (
                      <AllWorkEmptyState type="no-comments" />
                    ) : activityTab === 'worklog' ? (
                      <AllWorkEmptyState type="no-worklogs" />
                    ) : activityTab === 'history' ? (
                      <AllWorkEmptyState type="no-history" />
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fg-3)' }} />
                        <p className="text-[13px]" style={{ color: 'var(--cp-text-tertiary, #6b6e76)' }}>No activity yet</p>
                      </div>
                    )}

                    {/* Comment input */}
                    <div className="flex items-start gap-2 mt-4">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#4C6EF5' }}>
                        U
                      </div>
                      <div className="flex-1 rounded-lg border px-3 py-2 focus-within:border-[#2563EB] transition-colors duration-[80ms]" style={{ borderColor: isDark ? '#2E2E2E' : 'var(--bd-default, #2E2E2E)' }}>
                        <input
                          ref={commentInputRef}
                          id="aw-comment-input"
                          type="text"
                          placeholder="Add a comment..."
                          className="w-full text-[13px] border-none outline-none shadow-none bg-transparent"
                          style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
                          aria-label="Add a comment"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-[var(--bd-subtle, #292929)] transition-colors duration-[80ms]" style={{ backgroundColor: isDark ? '#292929' : 'var(--hover, #1F1F1F)', color: 'var(--cp-text-tertiary, #6b6e76)' }}>
                            Status update...
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-[var(--bd-subtle, #292929)] transition-colors duration-[80ms]" style={{ backgroundColor: isDark ? '#292929' : 'var(--hover, #1F1F1F)', color: 'var(--cp-text-tertiary, #6b6e76)' }}>
                            Thanks!
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] mt-2 ml-9" style={{ color: 'var(--fg-3)' }}>
                      <b>Tip:</b> press <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: isDark ? '#292929' : 'var(--hover, #1F1F1F)', border: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)' }}>M</kbd> to comment
                    </p>
                  </div>
                </>
              )}

              {/* ─── SUB-TASKS TAB ─── */}
              {activeTab === 'subtasks' && (
                <SubTasksTab
                  parentKey={currentItem.issue_key}
                  onSubTaskClick={handleSubTaskClick}
                />
              )}

              {/* ─── ATTACHMENTS TAB ─── */}
              {activeTab === 'attachments' && (
                <AllWorkEmptyState type="no-attachments" onAction={() => {}} />
              )}

              {/* ─── COMMENTS TAB ─── */}
              {activeTab === 'comments' && (
                <AllWorkEmptyState type="no-comments" />
              )}

              {/* ─── HISTORY TAB ─── */}
              {activeTab === 'history' && (
                <AllWorkEmptyState type="no-history" />
              )}

              {/* ─── LINKS TAB ─── */}
              {activeTab === 'links' && (
                <AllWorkEmptyState type="no-links" onAction={() => {}} />
              )}
            </div>

            {/* Right detail sidebar — 260px */}
            <div className="overflow-y-auto py-4 px-4" style={{ width: 260, borderLeft: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)', backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF' }}>
              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Status</span>
                <StatusLozenge status={currentItem.status} />
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Assignee</span>
                {currentItem.assignee_display_name ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: '#4C6EF5' }}>
                      {currentItem.assignee_display_name.charAt(0)}
                    </div>
                    <span className="text-[13px]" style={{ color: 'var(--fg-1)' }}>{currentItem.assignee_display_name}</span>
                  </div>
                ) : (
                  <span className="text-[13px] italic" style={{ color: 'var(--fg-3)' }}>Unassigned</span>
                )}
                <button className="text-[11px] mt-1" style={{ color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>Assign to me</button>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Priority</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[currentItem.priority] || 'var(--cp-blue)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--fg-1)' }}>{currentItem.priority}</span>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Fix Version</span>
                <span className="text-[13px]" style={{ color: currentItem.fix_version_name ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                  {currentItem.fix_version_name || '—'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Reporter</span>
                <span className="text-[13px]" style={{ color: currentItem.reporter_name ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                  {currentItem.reporter_name || '—'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Labels</span>
                {currentItem.labels?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {currentItem.labels.map(l => (
                      <span key={l} className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: isDark ? '#292929' : 'var(--hover, #1F1F1F)', color: 'var(--cp-text-secondary, #44546f)' }}>{l}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] italic" style={{ color: 'var(--fg-3)' }}>None</span>
                )}
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: isDark ? '1px solid #2E2E2E' : '1px solid var(--bd-subtle, #292929)' }}>
                <div className="mb-2">
                  <span className="text-[11px] uppercase font-semibold block mb-0.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Created</span>
                  <span className="text-[12px]" style={{ color: 'var(--cp-text-secondary, #44546f)', fontFamily: 'var(--cp-font-mono)' }} title={currentItem.jira_created_at || ''}>
                    {formatRel(currentItem.jira_created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold block mb-0.5" style={{ color: 'var(--cp-text-tertiary, #6b6e76)', letterSpacing: '0.05em' }}>Updated</span>
                  <span className="text-[12px]" style={{ color: 'var(--cp-text-secondary, #44546f)', fontFamily: 'var(--cp-font-mono)' }} title={currentItem.jira_updated_at || ''}>
                    {formatRel(currentItem.jira_updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--bg-1)' }}>
          <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>Select an item to view details</p>
        </div>
      )}
    </div>
  );
}
