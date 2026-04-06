/**
 * WorkHubSidePanel — 560px right slide-in with 3 tabs: Details, Comments, History
 * Pure white bg, independent section loading, all fields editable
 */
import { useEffect, useCallback, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useWorkItem, useUpdateWorkItem, useWorkItemComments, useChangelogs } from '@/hooks/useWorkHub';
import WorkHubTypeIcon from './WorkHubTypeIcon';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import WorkHubPriorityIcon from './WorkHubPriorityIcon';
import WorkHubDatePicker from './WorkHubDatePicker';
import SidePanelCycleTime from './SidePanelCycleTime';
import SidePanelComments from './SidePanelComments';
import SidePanelHistory from './SidePanelHistory';
import { AvatarCircle } from './WorkHubAssigneePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { deriveStatusCategory } from '@/services/workhub-service';

interface WorkHubSidePanelProps {
  itemId: string | null;
  projectKey: string;
  onClose: () => void;
}

const STATUS_GROUPS = [
  { label: 'TO DO', category: 'To Do', statuses: ['Backlog', 'In Requirements', 'To Do', 'Open'] },
  { label: 'IN PROGRESS', category: 'In Progress', statuses: ['In Progress', 'In Review', 'In Development', 'In Beta', 'In UAT', 'In QA', 'Ready for QA'] },
  { label: 'DONE', category: 'Done', statuses: ['Done', 'Closed', 'In Production', 'Released'] },
];
const PRIORITY_OPTIONS = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

type TabKey = 'details' | 'comments' | 'history';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', height: 50, gap: 12 }}>
      <span style={{ width: 100, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: '36px' }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: 50 }}>{children}</div>
    </div>
  );
}

function FieldSkeleton() {
  return <div className="wh-skeleton" style={{ height: 14, width: 120, borderRadius: 3 }} />;
}

export default function WorkHubSidePanel({ itemId, projectKey, onClose }: WorkHubSidePanelProps) {
  const { data: item, isLoading } = useWorkItem(itemId);
  const updateMutation = useUpdateWorkItem(projectKey);
  const { data: comments = [] } = useWorkItemComments(itemId);
  const { data: changelogs = [] } = useChangelogs(itemId);

  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  useEffect(() => {
    if (item) { setTitleValue(item.summary); setDescValue(item.description_text || ''); }
  }, [item]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleUpdate = useCallback((field: string, value: any) => {
    if (!itemId) return;
    const updates: Record<string, any> = { [field]: value };
    if (field === 'status') updates.status_category = deriveStatusCategory(value);
    updateMutation.mutate({ itemId, updates });
  }, [itemId, updateMutation]);

  if (!itemId) return null;

  const commentCount = comments.length;
  const changelogCount = changelogs.length;

  const TABS: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'comments', label: 'Comments', badge: commentCount || undefined },
    { key: 'history', label: 'History', badge: changelogCount || undefined },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, top: 48, background: 'rgba(0,0,0,0.1)', zIndex: 40 }} />

      <div role="complementary" aria-label="Work item details" style={{
        position: 'fixed', right: 0, top: 48, bottom: 0, width: 560,
        background: 'var(--bg-app)', zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 250ms ease-out',
      }}>
        {/* Sticky Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-app)',
          borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {isLoading ? <FieldSkeleton /> : item && (
            <>
              <WorkHubTypeIcon type={item.issue_type} size={20} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{item.issue_key}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>· {item.issue_type}</span>
            </>
          )}
          <button onClick={onClose} aria-label="Close panel" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="rgba(237,237,237,0.40)" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--bd-subtle, rgba(255,255,255,0.05))',
          padding: '0 20px', background: 'var(--bg-app)', position: 'sticky', top: 62, zIndex: 10,
        }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 16px', fontSize: 13, fontWeight: activeTab === tab.key ? 650 : 400,
              color: activeTab === tab.key ? 'var(--fg-1)' : 'var(--fg-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
              transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, background: 'var(--bg-1)', color: 'var(--fg-3)',
                  padding: '1px 6px', borderRadius: 12, minWidth: 18, textAlign: 'center',
                }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div>
              <div className="wh-skeleton" style={{ height: 20, width: 100, borderRadius: 4, marginBottom: 16 }} />
              <div className="wh-skeleton" style={{ height: 24, width: '80%', borderRadius: 4, marginBottom: 8 }} />
              <div className="wh-skeleton" style={{ height: 14, width: '60%', borderRadius: 4, marginBottom: 24 }} />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div className="wh-skeleton" style={{ width: 100, height: 14, borderRadius: 3 }} />
                  <div className="wh-skeleton" style={{ width: 140, height: 14, borderRadius: 3 }} />
                </div>
              ))}
            </div>
          ) : item ? (
            <>
              {/* ═══ DETAILS TAB ═══ */}
              {activeTab === 'details' && (
                <div>
                  {/* Status */}
                  <div style={{ marginBottom: 12 }}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <WorkHubStatusLozenge status={item.status} statusCategory={item.status_category} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" style={{ width: 220, padding: '4px 0', background: 'var(--bg-app)', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6, zIndex: 9999, maxHeight: 320, overflowY: 'auto' }}>
                        {STATUS_GROUPS.map(group => (
                          <div key={group.label}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-4)', padding: '6px 12px 2px' }}>{group.label}</div>
                            {group.statuses.map(s => (
                              <button key={s} onClick={() => handleUpdate('status', s)} style={{
                                width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                                background: item.status === s ? 'rgba(37,99,235,0.08)' : 'transparent',
                                color: 'var(--fg-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                              }}>
                                <WorkHubStatusLozenge status={s} statusCategory={group.category} />
                              </button>
                            ))}
                          </div>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Title */}
                  {editingTitle ? (
                    <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                      onBlur={() => { handleUpdate('summary', titleValue); setEditingTitle(false); }}
                      onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                      autoFocus
                      style={{ width: '100%', fontSize: 20, fontWeight: 650, color: 'var(--fg-1)', border: '1.5px solid #2563EB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: "'Sora', sans-serif", marginBottom: 8 }} />
                  ) : (
                    <h2 onClick={() => setEditingTitle(true)} style={{ fontSize: 20, fontWeight: 650, color: 'var(--fg-1)', margin: '0 0 8px', cursor: 'text', fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
                      {item.summary}
                    </h2>
                  )}

                  {/* Description */}
                  {editingDesc ? (
                    <textarea value={descValue} onChange={e => setDescValue(e.target.value)}
                      onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                      autoFocus rows={4}
                      style={{ width: '100%', border: '1.5px solid #2563EB', borderRadius: 4, padding: 8, fontSize: 14, color: 'var(--fg-1)', fontFamily: 'Geist, -apple-system, sans-serif', outline: 'none', resize: 'vertical', minHeight: 80, marginBottom: 16 }} />
                  ) : (
                    <div onClick={() => setEditingDesc(true)} style={{
                      fontSize: 14, color: item.description_text ? 'var(--fg-2)' : 'var(--fg-4)',
                      fontStyle: item.description_text ? 'normal' : 'italic',
                      cursor: 'text', marginBottom: 16, minHeight: 20, lineHeight: 1.6,
                    }}>
                      {item.description_text || 'Click to add description...'}
                    </div>
                  )}

                  {/* Cycle Time Banner */}
                  <SidePanelCycleTime workItemId={item.id} />

                  {/* Key Details */}
                  <div style={{ border: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))', borderRadius: 6, padding: '8px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', marginBottom: 4 }}>Key Details</div>

                    <DetailRow label="Status">
                      <WorkHubStatusLozenge status={item.status} statusCategory={item.status_category} />
                    </DetailRow>
                    <DetailRow label="Priority">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <WorkHubPriorityIcon priority={item.priority || 'Medium'} size={16} showLabel />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" style={{ width: 160, padding: '4px 0', background: 'var(--bg-app)', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6, zIndex: 9999 }}>
                          {PRIORITY_OPTIONS.map(p => (
                            <button key={p} onClick={() => handleUpdate('priority', p)} style={{
                              width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                              background: item.priority === p ? 'rgba(37,99,235,0.08)' : 'transparent',
                              color: 'var(--fg-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <WorkHubPriorityIcon priority={p} size={14} showLabel />
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </DetailRow>
                    <DetailRow label="Assignee">
                      {item.assignee_display_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <AvatarCircle name={item.assignee_display_name} size={24} />
                          <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{item.assignee_display_name}</span>
                        </span>
                      ) : <span style={{ fontSize: 14, color: 'var(--fg-4)', fontStyle: 'italic' }}>— Set assignee</span>}
                    </DetailRow>
                    <DetailRow label="Reporter">
                      {item.reporter_display_name ? (
                        <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>{item.reporter_display_name}</span>
                      ) : <span style={{ fontSize: 14, color: 'var(--fg-4)', fontStyle: 'italic' }}>— Set reporter</span>}
                    </DetailRow>
                    <DetailRow label="Due Date">
                      <WorkHubDatePicker value={item.due_date} onChange={d => handleUpdate('due_date', d)} />
                    </DetailRow>
                    <DetailRow label="Points">
                      <span style={{ fontSize: 14, color: item.story_points != null ? 'var(--fg-1)' : 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.story_points != null ? item.story_points : '— Set points'}
                      </span>
                    </DetailRow>
                    <DetailRow label="Release">
                      <span style={{ fontSize: 14, color: item.sprint_name ? 'var(--fg-1)' : 'var(--fg-4)' }}>
                        {item.sprint_name || '—'}
                      </span>
                    </DetailRow>
                    <DetailRow label="Created">
                      <span style={{ fontSize: 12, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.jira_created_at ? format(new Date(item.jira_created_at), 'MMM d, yyyy, hh:mm a') : '—'}
                      </span>
                    </DetailRow>
                    <DetailRow label="Updated">
                      <span style={{ fontSize: 12, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.jira_updated_at ? format(new Date(item.jira_updated_at), 'MMM d, yyyy, hh:mm a') : '—'}
                      </span>
                    </DetailRow>
                  </div>

                  {/* Subtasks */}
                  <div style={{ border: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))', borderRadius: 6, padding: '8px 16px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)' }}>
                        Subtasks ({item.completed_child_count}/{item.child_count} done)
                      </span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={14} color="rgba(237,237,237,0.40)" /></button>
                    </div>
                    {item.child_count > 0 ? (
                      <div style={{ height: 4, background: 'var(--bg-1)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${(item.completed_child_count / item.child_count) * 100}%`, background: 'var(--sem-success)', borderRadius: 4, transition: 'width 300ms' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--fg-4)', padding: '4px 0' }}>No subtasks yet</div>
                    )}
                  </div>

                  {/* Linked Items */}
                  <div style={{ border: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)' }}>Linked Items</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--cp-blue)' }}>+ Link an item</button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-4)', padding: '4px 0' }}>No linked items</div>
                  </div>
                </div>
              )}

              {/* ═══ COMMENTS TAB ═══ */}
              {activeTab === 'comments' && (
                <SidePanelComments workItemId={item.id} />
              )}

              {/* ═══ HISTORY TAB ═══ */}
              {activeTab === 'history' && (
                <SidePanelHistory
                  workItemId={item.id}
                  currentStatus={item.status}
                  currentStatusCategory={item.status_category}
                />
              )}
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes wh-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .wh-skeleton { background: var(--bd-default, rgba(255,255,255,0.10)); animation: wh-pulse 1.5s ease-in-out infinite; }
      `}</style>
    </>
  );
}
