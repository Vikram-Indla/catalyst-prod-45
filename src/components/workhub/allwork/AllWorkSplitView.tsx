/**
 * AllWorkSplitView — Left card list + right detail panel (V12 compliant)
 */
import { useState, useMemo, memo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Clock, History, ListTree, Link2, Paperclip, Tag } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { AllWorkEmptyState } from './AllWorkEmptyState';
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

function formatRel(d: string | null): string {
  if (!d) return '—';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return '—'; }
}

function nameToHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

export function AllWorkSplitView({ items, selectedItemKey, onSelectItem }: Props) {
  const [sortBy, setSortBy] = useState('Created');
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history' | 'worklog'>('all');

  const selectedItem = useMemo(() =>
    items.find(i => i.issue_key === selectedItemKey) ?? items[0] ?? null
  , [items, selectedItemKey]);

  const selectedIdx = items.findIndex(i => i.issue_key === (selectedItem?.issue_key));

  const goPrev = () => { if (selectedIdx > 0) onSelectItem(items[selectedIdx - 1].issue_key); };
  const goNext = () => { if (selectedIdx < items.length - 1) onSelectItem(items[selectedIdx + 1].issue_key); };

  return (
    <div className="flex h-full gap-0 rounded border overflow-hidden" style={{ borderColor: 'rgba(15,23,42,0.12)', borderRadius: 4 }}>
      {/* Left card list — 320px */}
      <div className="flex flex-col" style={{ width: 320, borderRight: '1px solid rgba(15,23,42,0.08)', backgroundColor: '#fff' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
          <button className="flex items-center gap-1 text-[12px]" style={{ color: '#6b6e76', fontFamily: 'Inter, sans-serif' }}>
            {sortBy} <ChevronDown className="w-3 h-3" />
          </button>
          <span className="text-[11px]" style={{ color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
            {items.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = item.issue_key === selectedItem?.issue_key;
            const hash = nameToHash(item.assignee_display_name || '');
            return (
              <div
                key={item.issue_key}
                onClick={() => onSelectItem(item.issue_key)}
                className="px-3 py-2.5 cursor-pointer transition-colors duration-[80ms]"
                style={{
                  borderBottom: '1px solid rgba(15,23,42,0.06)',
                  backgroundColor: isActive ? 'rgba(37,99,235,0.08)' : '#fff',
                  borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <JiraIssueTypeIcon type={item.issue_type} size={14} style={{ marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-[18px] truncate" style={{ color: '#0F172A', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2563EB', fontWeight: 650 }}>
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

        <div className="px-3 py-2 text-[11px]" style={{ color: '#71717A', borderTop: '1px solid rgba(15,23,42,0.08)', fontFamily: "'JetBrains Mono', monospace" }}>
          {items.length} of {items.length}
        </div>
      </div>

      {/* Detail panel */}
      {selectedItem ? (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#fff' }}>
          {/* Detail header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
            <div className="flex items-center gap-2">
              <JiraIssueTypeIcon type={selectedItem.issue_type} size={16} />
              <span className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2563EB' }}>
                {selectedItem.issue_key}
              </span>
              {selectedItem.parent_key && (
                <>
                  <span className="text-[12px]" style={{ color: '#71717A' }}>in</span>
                  <span className="text-[12px]" style={{ color: '#2563EB' }}>{selectedItem.parent_key}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={goPrev} disabled={selectedIdx <= 0} className="p-1 rounded hover:bg-[rgba(15,23,42,0.04)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Previous item">
                <ChevronLeft className="w-4 h-4" style={{ color: '#6b6e76' }} />
              </button>
              <span className="text-[11px]" style={{ color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>{selectedIdx + 1}/{items.length}</span>
              <button onClick={goNext} disabled={selectedIdx >= items.length - 1} className="p-1 rounded hover:bg-[rgba(15,23,42,0.04)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#2563EB]" aria-label="Next item">
                <ChevronRight className="w-4 h-4" style={{ color: '#6b6e76' }} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Main detail content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h2 className="text-[20px] font-semibold mb-4" style={{ color: '#0F172A', lineHeight: '28px', fontFamily: 'Inter, sans-serif' }}>
                {selectedItem.summary}
              </h2>

              {/* Key details */}
              <div className="mb-6">
                <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: '#6b6e76', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>
                  Key Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] block mb-1" style={{ color: '#71717A' }}>Priority</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[selectedItem.priority] || '#3b82f6' }} />
                      <span className="text-[13px]" style={{ color: '#0F172A' }}>{selectedItem.priority}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] block mb-1" style={{ color: '#71717A' }}>Status</span>
                    <StatusLozenge status={selectedItem.status} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>
                  Description
                </h3>
                {selectedItem.description_text ? (
                  <p className="text-[13px] leading-[20px]" style={{ color: '#44546f', fontFamily: 'Inter, sans-serif' }}>
                    {selectedItem.description_text}
                  </p>
                ) : (
                  <p className="text-[12px] italic" style={{ color: '#71717A' }}>No description provided</p>
                )}
              </div>

              {/* Subtasks */}
              <div className="mb-6">
                <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>
                  Sub-tasks
                </h3>
                <AllWorkEmptyState type="no-subtasks" onAction={() => {}} />
              </div>

              {/* Linked items */}
              <div className="mb-6">
                <h3 className="text-[11px] uppercase font-semibold mb-2" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>
                  Linked Work Items
                </h3>
                <AllWorkEmptyState type="no-links" onAction={() => {}} />
              </div>

              {/* Activity section */}
              <div>
                <div className="flex items-center gap-4 mb-3" style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: 8 }}>
                  {(['all', 'comments', 'history', 'worklog'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActivityTab(tab)}
                      className="text-[12px] pb-1 capitalize transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                      style={{
                        color: activityTab === tab ? '#1558bc' : '#6b6e76',
                        fontWeight: activityTab === tab ? 600 : 400,
                        borderBottom: activityTab === tab ? '2px solid #1558bc' : '2px solid transparent',
                        fontFamily: 'Inter, sans-serif',
                      }}
                      role="tab"
                      aria-selected={activityTab === tab}
                    >
                      {tab === 'all' ? 'All' : tab === 'worklog' ? 'Work log' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Activity empty states */}
                {activityTab === 'comments' ? (
                  <AllWorkEmptyState type="no-comments" />
                ) : activityTab === 'worklog' ? (
                  <AllWorkEmptyState type="no-worklogs" />
                ) : activityTab === 'history' ? (
                  <AllWorkEmptyState type="no-history" />
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: '#71717A' }} />
                    <p className="text-[13px]" style={{ color: '#6b6e76' }}>No activity yet</p>
                  </div>
                )}

                {/* Comment input */}
                <div className="flex items-start gap-2 mt-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#4C6EF5' }}>
                    U
                  </div>
                  <div className="flex-1 rounded-lg border px-3 py-2 focus-within:border-[#2563EB] transition-colors duration-[80ms]" style={{ borderColor: 'rgba(15,23,42,0.12)' }}>
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      className="w-full text-[13px] border-none outline-none shadow-none bg-transparent"
                      style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
                      aria-label="Add a comment"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-[rgba(15,23,42,0.06)] transition-colors duration-[80ms]" style={{ backgroundColor: 'rgba(15,23,42,0.04)', color: '#6b6e76' }}>
                        Status update...
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-[rgba(15,23,42,0.06)] transition-colors duration-[80ms]" style={{ backgroundColor: 'rgba(15,23,42,0.04)', color: '#6b6e76' }}>
                        Thanks!
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] mt-2 ml-9" style={{ color: '#71717A' }}>
                  <b>Pro tip:</b> press <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}>M</kbd> to comment
                </p>
              </div>
            </div>

            {/* Right detail sidebar — 260px */}
            <div className="overflow-y-auto py-4 px-4" style={{ width: 260, borderLeft: '1px solid rgba(15,23,42,0.08)' }}>
              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Status</span>
                <StatusLozenge status={selectedItem.status} />
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Assignee</span>
                {selectedItem.assignee_display_name ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: '#4C6EF5' }}>
                      {selectedItem.assignee_display_name.charAt(0)}
                    </div>
                    <span className="text-[13px]" style={{ color: '#0F172A' }}>{selectedItem.assignee_display_name}</span>
                  </div>
                ) : (
                  <span className="text-[13px] italic" style={{ color: '#71717A' }}>Unassigned</span>
                )}
                <button className="text-[11px] mt-1" style={{ color: '#2563EB' }}>Assign to me</button>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Priority</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[selectedItem.priority] || '#3b82f6' }} />
                  <span className="text-[13px]" style={{ color: '#0F172A' }}>{selectedItem.priority}</span>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Fix Version</span>
                <span className="text-[13px]" style={{ color: selectedItem.fix_version_name ? '#0F172A' : '#71717A' }}>
                  {selectedItem.fix_version_name || '—'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Reporter</span>
                <span className="text-[13px]" style={{ color: selectedItem.reporter_name ? '#0F172A' : '#71717A' }}>
                  {selectedItem.reporter_name || '—'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-[11px] uppercase font-semibold block mb-1.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Labels</span>
                {selectedItem.labels?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.labels.map(l => (
                      <span key={l} className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(15,23,42,0.04)', color: '#44546f' }}>{l}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] italic" style={{ color: '#71717A' }}>None</span>
                )}
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
                <div className="mb-2">
                  <span className="text-[11px] uppercase font-semibold block mb-0.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Created</span>
                  <span className="text-[12px]" style={{ color: '#44546f', fontFamily: "'JetBrains Mono', monospace" }} title={selectedItem.jira_created_at || ''}>
                    {formatRel(selectedItem.jira_created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold block mb-0.5" style={{ color: '#6b6e76', letterSpacing: '0.05em' }}>Updated</span>
                  <span className="text-[12px]" style={{ color: '#44546f', fontFamily: "'JetBrains Mono', monospace" }} title={selectedItem.jira_updated_at || ''}>
                    {formatRel(selectedItem.jira_updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#fafbfc' }}>
          <p className="text-[13px]" style={{ color: '#71717A' }}>Select an item to view details</p>
        </div>
      )}
    </div>
  );
}
