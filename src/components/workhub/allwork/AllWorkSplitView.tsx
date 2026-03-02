/**
 * AllWorkSplitView — Left card list + right detail panel
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Clock, History } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { formatDistanceToNow, format } from 'date-fns';

interface Props {
  items: JiraIssue[];
  selectedItemKey: string | null;
  onSelectItem: (key: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e', Lowest: '#8c8f96',
};

function formatRel(d: string | null): string {
  if (!d) return '—';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return '—'; }
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

  const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];

  return (
    <div className="flex h-full gap-0 rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(11,18,14,0.14)' }}>
      {/* Left card list */}
      <div className="flex flex-col" style={{ width: 320, borderRight: '1px solid #E2E8F0', backgroundColor: '#fff' }}>
        {/* Sort bar */}
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <button className="flex items-center gap-1 text-[12px]" style={{ color: '#6b6e76' }}>
            {sortBy} <ChevronDown className="w-3 h-3" />
          </button>
          <span className="text-[11px]" style={{ color: '#8c8f96' }}>{items.length} items</span>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = item.issue_key === selectedItem?.issue_key;
            const nameHash = (item.assignee_display_name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            return (
              <div
                key={item.issue_key}
                onClick={() => onSelectItem(item.issue_key)}
                className="px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: isActive ? '#e9f2fe' : '#fff',
                  borderLeft: isActive ? '3px solid #1868db' : '3px solid transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <JiraIssueTypeIcon type={item.issue_type} size={14} style={{ marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-[18px] truncate" style={{ color: '#1A1D23', fontWeight: 500 }}>
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1868db', fontWeight: 600 }}>
                        {item.issue_key}
                      </span>
                      {item.assignee_display_name && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ backgroundColor: AVATAR_COLORS[nameHash % AVATAR_COLORS.length] }}
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

        {/* Footer */}
        <div className="px-3 py-2 text-[11px]" style={{ color: '#8c8f96', borderTop: '1px solid #E2E8F0' }}>
          {items.length} of {items.length}
        </div>
      </div>

      {/* Detail panel */}
      {selectedItem ? (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#fff' }}>
          {/* Detail header */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-2">
              <JiraIssueTypeIcon type={selectedItem.issue_type} size={16} />
              <span className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1868db' }}>
                {selectedItem.issue_key}
              </span>
              {selectedItem.parent_key && (
                <>
                  <span className="text-[12px]" style={{ color: '#8c8f96' }}>in</span>
                  <span className="text-[12px]" style={{ color: '#1868db' }}>{selectedItem.parent_key}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={goPrev} disabled={selectedIdx <= 0} className="p-1 rounded hover:bg-[#f1f5f9] disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" style={{ color: '#6b6e76' }} />
              </button>
              <span className="text-[11px]" style={{ color: '#8c8f96' }}>{selectedIdx + 1}/{items.length}</span>
              <button onClick={goNext} disabled={selectedIdx >= items.length - 1} className="p-1 rounded hover:bg-[#f1f5f9] disabled:opacity-30">
                <ChevronRight className="w-4 h-4" style={{ color: '#6b6e76' }} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Main detail content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h2 className="text-[20px] font-semibold mb-4" style={{ color: '#1A1D23', lineHeight: '28px' }}>
                {selectedItem.summary}
              </h2>

              {/* Key details */}
              <div className="mb-6">
                <h3 className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: '#6b6e76' }}>
                  Key Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] block mb-1" style={{ color: '#8c8f96' }}>Priority</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[selectedItem.priority] || '#3b82f6' }} />
                      <span className="text-[13px]" style={{ color: '#1A1D23' }}>{selectedItem.priority}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] block mb-1" style={{ color: '#8c8f96' }}>Status</span>
                    <StatusLozenge status={selectedItem.status} />
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description_text && (
                <div className="mb-6">
                  <h3 className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: '#6b6e76' }}>
                    Description
                  </h3>
                  <p className="text-[13px] leading-[20px]" style={{ color: '#44546f' }}>
                    {selectedItem.description_text}
                  </p>
                </div>
              )}

              {/* Subtasks placeholder */}
              <div className="mb-6">
                <h3 className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: '#6b6e76' }}>
                  Sub-tasks
                </h3>
                <div className="text-center py-6 rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
                  <p className="text-[12px]" style={{ color: '#8c8f96' }}>No sub-tasks</p>
                  <button className="text-[12px] mt-1" style={{ color: '#1868db' }}>Add a sub-task</button>
                </div>
              </div>

              {/* Linked items placeholder */}
              <div className="mb-6">
                <h3 className="text-[10px] uppercase font-semibold tracking-wider mb-2" style={{ color: '#6b6e76' }}>
                  Linked Work Items
                </h3>
                <div className="text-center py-6 rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
                  <p className="text-[12px]" style={{ color: '#8c8f96' }}>No linked work items</p>
                  <button className="text-[12px] mt-1" style={{ color: '#1868db' }}>Link a work item</button>
                </div>
              </div>

              {/* Activity section */}
              <div>
                <div className="flex items-center gap-4 mb-3" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                  {(['all', 'comments', 'history', 'worklog'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActivityTab(tab)}
                      className="text-[12px] pb-1 capitalize"
                      style={{
                        color: activityTab === tab ? '#1558bc' : '#6b6e76',
                        fontWeight: activityTab === tab ? 600 : 400,
                        borderBottom: activityTab === tab ? '2px solid #1558bc' : '2px solid transparent',
                      }}
                    >
                      {tab === 'all' ? 'All' : tab === 'worklog' ? 'Work log' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Empty activity state */}
                <div className="text-center py-8">
                  {activityTab === 'comments' ? (
                    <>
                      <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: '#8c8f96' }} />
                      <p className="text-[13px]" style={{ color: '#6b6e76' }}>No comments yet</p>
                      <p className="text-[11px] mt-1" style={{ color: '#8c8f96' }}>Start the conversation</p>
                    </>
                  ) : activityTab === 'worklog' ? (
                    <>
                      <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: '#8c8f96' }} />
                      <p className="text-[13px]" style={{ color: '#6b6e76' }}>No time logged</p>
                      <p className="text-[11px] mt-1" style={{ color: '#8c8f96' }}>Log your first work entry</p>
                    </>
                  ) : activityTab === 'history' ? (
                    <>
                      <History className="w-8 h-8 mx-auto mb-2" style={{ color: '#8c8f96' }} />
                      <p className="text-[13px]" style={{ color: '#6b6e76' }}>No changes recorded</p>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: '#8c8f96' }} />
                      <p className="text-[13px]" style={{ color: '#6b6e76' }}>No activity yet</p>
                    </>
                  )}
                </div>

                {/* Comment input */}
                <div className="flex items-start gap-2 mt-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#4C6EF5' }}>
                    U
                  </div>
                  <div className="flex-1 rounded-lg border px-3 py-2" style={{ borderColor: '#DFE1E6' }}>
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      className="w-full text-[13px] border-none outline-none bg-transparent"
                      style={{ color: '#1A1D23' }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f1f5f9', color: '#6b6e76', cursor: 'pointer' }}>
                        Status update...
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f1f5f9', color: '#6b6e76', cursor: 'pointer' }}>
                        Thanks!
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] mt-2 ml-9" style={{ color: '#8c8f96' }}>
                  <b>Pro tip:</b> press <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: '#f1f5f9', border: '1px solid #E2E8F0' }}>M</kbd> to comment
                </p>
              </div>
            </div>

            {/* Right detail sidebar */}
            <div className="overflow-y-auto py-4 px-4" style={{ width: 260, borderLeft: '1px solid #E2E8F0' }}>
              {/* Status */}
              <div className="mb-4">
                <span className="text-[10px] uppercase font-semibold tracking-wider block mb-1.5" style={{ color: '#6b6e76' }}>Status</span>
                <StatusLozenge status={selectedItem.status} />
              </div>

              {/* Assignee */}
              <div className="mb-4">
                <span className="text-[10px] uppercase font-semibold tracking-wider block mb-1.5" style={{ color: '#6b6e76' }}>Assignee</span>
                {selectedItem.assignee_display_name ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#4C6EF5' }}>
                      {selectedItem.assignee_display_name.charAt(0)}
                    </div>
                    <span className="text-[13px]" style={{ color: '#1A1D23' }}>{selectedItem.assignee_display_name}</span>
                  </div>
                ) : (
                  <span className="text-[13px]" style={{ color: '#8c8f96' }}>Unassigned</span>
                )}
                <button className="text-[11px] mt-1" style={{ color: '#1868db' }}>Assign to me</button>
              </div>

              {/* Priority */}
              <div className="mb-4">
                <span className="text-[10px] uppercase font-semibold tracking-wider block mb-1.5" style={{ color: '#6b6e76' }}>Priority</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[selectedItem.priority] || '#3b82f6' }} />
                  <span className="text-[13px]" style={{ color: '#1A1D23' }}>{selectedItem.priority}</span>
                </div>
              </div>

              {/* Reporter */}
              <div className="mb-4">
                <span className="text-[10px] uppercase font-semibold tracking-wider block mb-1.5" style={{ color: '#6b6e76' }}>Reporter</span>
                <span className="text-[13px]" style={{ color: '#1A1D23' }}>—</span>
              </div>

              {/* Labels */}
              <div className="mb-4">
                <span className="text-[10px] uppercase font-semibold tracking-wider block mb-1.5" style={{ color: '#6b6e76' }}>Labels</span>
                {selectedItem.labels?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.labels.map(l => (
                      <span key={l} className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#44546f' }}>{l}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px]" style={{ color: '#8c8f96' }}>None</span>
                )}
              </div>

              {/* Timestamps */}
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
                <div className="mb-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wider block mb-0.5" style={{ color: '#6b6e76' }}>Created</span>
                  <span className="text-[12px]" style={{ color: '#44546f' }} title={selectedItem.jira_created_at || ''}>
                    {formatRel(selectedItem.jira_created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider block mb-0.5" style={{ color: '#6b6e76' }}>Updated</span>
                  <span className="text-[12px]" style={{ color: '#44546f' }} title={selectedItem.jira_updated_at || ''}>
                    {formatRel(selectedItem.jira_updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#fafbfc' }}>
          <p className="text-[13px]" style={{ color: '#8c8f96' }}>Select an item to view details</p>
        </div>
      )}
    </div>
  );
}
