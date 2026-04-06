/**
 * AllWorkSplitView — Left card list + right detail panel (V12 compliant)
 * Now includes Sub-Tasks tab with navigation stack for nested drill-down.
 */
import { useState, useMemo, memo, Fragment } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Clock, History, ListTree, Link2, Paperclip, Tag, ArrowLeft } from 'lucide-react';
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
}

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

export function AllWorkSplitView({ items, selectedItemKey, onSelectItem }: Props) {
  const { isDark } = useTheme();
  const [sortBy, setSortBy] = useState('Created');
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history' | 'worklog'>('all');

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
    { key: 'subtasks', label: 'Sub-Tasks', icon: <ListTree className="w-3.5 h-3.5" />, count: subTaskCount },
    { key: 'attachments', label: 'Attachments', icon: <Paperclip className="w-3.5 h-3.5" /> },
    { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
    { key: 'links', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-full gap-0 rounded border overflow-hidden" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 4 }}>
      {/* Left card list — 320px */}
      <div className="flex flex-col" style={{ width: 320, borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', backgroundColor: isDark ? '#0A0A0A' : 'var(--bg-app)' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}>
          <button className="flex items-center gap-1 text-[12px]" style={{ color: isDark ? '#A1A1A1' : '#6b6e76', fontFamily: 'Inter, sans-serif' }}>
            {sortBy} <ChevronDown className="w-3 h-3" />
          </button>
          <span className="text-[11px]" style={{ color: 'var(--fg-3)', fontFamily: "'JetBrains Mono', monospace" }}>
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
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))',
                  backgroundColor: isActive ? 'rgba(37,99,235,0.08)' : isDark ? '#0A0A0A' : 'var(--bg-app)',
                  borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <JiraIssueTypeIcon type={item.issue_type} size={14} style={{ marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-[18px] truncate" style={{ color: 'var(--fg-1)', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--cp-blue)', fontWeight: 650 }}>
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

        <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--fg-3)', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', fontFamily: "'JetBrains Mono', monospace" }}>
          {items.length} of {items.length}
        </div>
      </div>

      {/* Detail panel */}
      {currentItem ? (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: isDark ? '#0A0A0A' : 'var(--bg-app)' }}>
          {/* Detail header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}>
            <div className="flex items-center gap-2">
              {/* Back button */}
              {canGoBack && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors duration-[80ms] hover:bg-[var(--hover, rgba(255,255,255,0.04))] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  style={{ color: 'var(--fg-2)', fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif', border: 'none', background: 'none', cursor: 'pointer' }}
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
              <JiraIssueTypeIcon type={currentItem.issue_type} size={16} />
              <span className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--cp-blue)' }}>
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
                  <button onClick={goPrev} disabled={selectedIdx <= 0} className="p-1 rounded hover:bg-[var(--hover, rgba(255,255,255,0.04))] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Previous item">
                    <ChevronLeft className="w-4 h-4" style={{ color: isDark ? '#878787' : '#6b6e76' }} />
                  </button>
                  <span className="text-[11px]" style={{ color: 'var(--fg-3)', fontFamily: "'JetBrains Mono', monospace" }}>{selectedIdx + 1}/{items.length}</span>
                  <button onClick={goNext} disabled={selectedIdx >= items.length - 1} className="p-1 rounded hover:bg-[var(--hover, rgba(255,255,255,0.04))] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Next item">
                    <ChevronRight className="w-4 h-4" style={{ color: isDark ? '#878787' : '#6b6e76' }} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Breadcrumb when navigated into sub-task */}
          {panelStack.length > 1 && (
            <div
              className="flex items-center gap-1.5 px-5 py-2"
              style={{ fontSize: 12, color: 'var(--fg-3)', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', backgroundColor: isDark ? '#1A1A1A' : 'var(--bg-1)' }}
            >
              {panelStack.slice(0, -1).map((item, i) => (
                <Fragment key={item.issue_key}>
                  <button
                    onClick={() => handleBreadcrumbNav(i)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--cp-blue)', fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11, fontWeight: 650, padding: 0,
                    }}
                  >
                    {item.issue_key}
                  </button>
                  <span style={{ color: '#D4D4D8' }}>/</span>
                </Fragment>
              ))}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 650, color: 'var(--fg-1)' }}>
                {currentItem.issue_key}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div
            className="flex items-center gap-0 px-5"
            style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}
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
                    color: isActive ? '#1558bc' : isDark ? '#878787' : '#6b6e76',
                    borderBottom: isActive ? '2px solid #1558bc' : '2px solid transparent',
                    marginBottom: -1, fontFamily: 'Inter, sans-serif',
                    background: 'none', border: 'none', borderBottomStyle: 'solid',
                    borderBottomWidth: 2, borderBottomColor: isActive ? '#1558bc' : 'transparent',
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
                        backgroundColor: isActive ? 'rgba(21,88,188,0.10)' : isDark ? 'rgba(255,255,255,0.06)' : 'var(--bd-subtle, rgba(255,255,255,0.05))',
                        color: isActive ? '#1558bc' : 'var(--fg-3)',
                        fontFamily: "'JetBrains Mono', monospace",
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
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ backgroundColor: isDark ? '#0A0A0A' : undefined }}>
              {/* ─── DETAILS TAB ─── */}
              {activeTab === 'details' && (
                <>
                  <h2 className="text-[20px] font-semibold mb-4" style={{ color: 'var(--fg-1)', lineHeight: '28px', fontFamily: 'Inter, sans-serif' }}>
                    {currentItem.summary}
                  </h2>

                  {/* Key details */}
                  <div className="mb-6">
                    <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
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
                    <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>
                      Description
                    </h3>
                    {currentItem.description_text ? (
                      <p className="text-[13px] leading-[20px]" style={{ color: isDark ? '#A1A1A1' : '#44546f', fontFamily: 'Inter, sans-serif' }}>
                        {currentItem.description_text}
                      </p>
                    ) : (
                      <p className="text-[12px] italic" style={{ color: 'var(--fg-3)' }}>No description provided</p>
                    )}
                  </div>

                  {/* Activity section */}
                  <div>
                    <div className="flex items-center gap-4 mb-3" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', paddingBottom: 8 }}>
                      {(['all', 'comments', 'history', 'worklog'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActivityTab(tab)}
                          className="text-[12px] pb-1 capitalize transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                          style={{
                            color: activityTab === tab ? '#1558bc' : isDark ? '#878787' : '#6b6e76',
                            fontWeight: activityTab === tab ? 600 : 400,
                            borderBottom: activityTab === tab ? '2px solid #1558bc' : '2px solid transparent',
                            fontFamily: 'Inter, sans-serif',
                            background: 'none', border: 'none', borderBottomStyle: 'solid',
                            borderBottomWidth: 2, borderBottomColor: activityTab === tab ? '#1558bc' : 'transparent',
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
                        <p className="text-[13px]" style={{ color: isDark ? '#878787' : '#6b6e76' }}>No activity yet</p>
                      </div>
                    )}

                    {/* Comment input */}
                    <div className="flex items-start gap-2 mt-4">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#4C6EF5' }}>
                        U
                      </div>
                      <div className="flex-1 rounded-lg border px-3 py-2 focus-within:border-[#2563EB] transition-colors duration-[80ms]" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'var(--bd-default, rgba(255,255,255,0.08))' }}>
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          className="w-full text-[13px] border-none outline-none shadow-none bg-transparent"
                          style={{ color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif' }}
                          aria-label="Add a comment"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-[var(--bd-subtle, rgba(255,255,255,0.05))] transition-colors duration-[80ms]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'var(--hover, rgba(255,255,255,0.04))', color: isDark ? '#878787' : '#6b6e76' }}>
                            Status update...
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-[var(--bd-subtle, rgba(255,255,255,0.05))] transition-colors duration-[80ms]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'var(--hover, rgba(255,255,255,0.04))', color: isDark ? '#878787' : '#6b6e76' }}>
                            Thanks!
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] mt-2 ml-9" style={{ color: 'var(--fg-3)' }}>
                      <b>Pro tip:</b> press <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'var(--hover, rgba(255,255,255,0.04))', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}>M</kbd> to comment
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
            <div className="overflow-y-auto py-4 px-4" style={{ width: 260, borderLeft: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }}>
              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Status</span>
                <StatusLozenge status={currentItem.status} />
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Assignee</span>
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
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Priority</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[currentItem.priority] || 'var(--cp-blue)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--fg-1)' }}>{currentItem.priority}</span>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Fix Version</span>
                <span className="text-[13px]" style={{ color: currentItem.fix_version_name ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                  {currentItem.fix_version_name || '—'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Reporter</span>
                <span className="text-[13px]" style={{ color: currentItem.reporter_name ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                  {currentItem.reporter_name || '—'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Labels</span>
                {currentItem.labels?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {currentItem.labels.map(l => (
                      <span key={l} className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'var(--hover, rgba(255,255,255,0.04))', color: isDark ? '#A1A1A1' : '#44546f' }}>{l}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] italic" style={{ color: 'var(--fg-3)' }}>None</span>
                )}
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}>
                <div className="mb-2">
                  <span className="text-[11px] uppercase font-semibold block mb-0.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Created</span>
                  <span className="text-[12px]" style={{ color: isDark ? '#A1A1A1' : '#44546f', fontFamily: "'JetBrains Mono', monospace" }} title={currentItem.jira_created_at || ''}>
                    {formatRel(currentItem.jira_created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold block mb-0.5" style={{ color: isDark ? '#878787' : '#6b6e76', letterSpacing: '0.05em' }}>Updated</span>
                  <span className="text-[12px]" style={{ color: isDark ? '#A1A1A1' : '#44546f', fontFamily: "'JetBrains Mono', monospace" }} title={currentItem.jira_updated_at || ''}>
                    {formatRel(currentItem.jira_updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: isDark ? '#0A0A0A' : 'var(--bg-1)' }}>
          <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>Select an item to view details</p>
        </div>
      )}
    </div>
  );
}
