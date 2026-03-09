/**
 * WorkHubSidePanel — 560px right slide-in detail panel
 * All fields editable, subtasks, links, activity
 */
import { useEffect, useCallback, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useWorkItem, useUpdateWorkItem, useActivity, useAddComment } from '@/hooks/useWorkHub';
import type { WorkHubItem } from '@/services/workhub-service';
import WorkHubTypeIcon from './WorkHubTypeIcon';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import WorkHubPriorityIcon from './WorkHubPriorityIcon';
import WorkHubDatePicker from './WorkHubDatePicker';
import WorkHubSidePanelActivity from './WorkHubSidePanelActivity';
import { AvatarCircle } from './WorkHubAssigneePicker';
import { format } from 'date-fns';

interface WorkHubSidePanelProps {
  itemId: string | null;
  projectKey: string;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 0', gap: 12, minHeight: 32 }}>
      <span style={{ width: 100, flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em', paddingTop: 2 }}>
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function WorkHubSidePanel({ itemId, projectKey, onClose }: WorkHubSidePanelProps) {
  const { data: item, isLoading } = useWorkItem(itemId);
  const updateMutation = useUpdateWorkItem(projectKey);
  const { data: activities = [], isLoading: activityLoading } = useActivity(item?.issue_key ?? null);
  const addCommentMutation = useAddComment(item?.issue_key ?? '');

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  useEffect(() => {
    if (item) { setTitleValue(item.summary); setDescValue(item.description_text || ''); }
  }, [item]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleUpdate = useCallback((field: string, value: any) => {
    if (!itemId) return;
    updateMutation.mutate({ itemId, updates: { [field]: value } });
  }, [itemId, updateMutation]);

  if (!itemId) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, top: 48, background: 'rgba(0,0,0,0.1)', zIndex: 40,
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 48, bottom: 0, width: 560,
        background: '#FFFFFF', zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 250ms ease-out',
        overflowY: 'auto',
      }}>
        {/* Sticky Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF',
          borderBottom: '0.75px solid rgba(15,23,42,0.06)',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {item && <WorkHubTypeIcon type={item.issue_type} size={20} />}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
            {item?.issue_key}
          </span>
          <span style={{ fontSize: 13, color: '#64748B' }}>· {item?.issue_type}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 24, color: '#94A3B8', fontSize: 13 }}>Loading...</div>
        ) : item ? (
          <div style={{ padding: '16px 20px', flex: 1 }}>
            {/* Status */}
            <div style={{ marginBottom: 12 }}>
              <WorkHubStatusLozenge status={item.status} statusCategory={item.status_category} />
            </div>

            {/* Title */}
            {editingTitle ? (
              <input
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={() => { handleUpdate('summary', titleValue); setEditingTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
                style={{ width: '100%', fontSize: 20, fontWeight: 650, color: '#0F172A', border: '1.5px solid #2563EB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: "'Sora', sans-serif", marginBottom: 8 }}
              />
            ) : (
              <h2 onClick={() => setEditingTitle(true)} style={{
                fontSize: 20, fontWeight: 650, color: '#0F172A', margin: '0 0 8px',
                cursor: 'text', fontFamily: "'Sora', sans-serif", lineHeight: 1.3,
              }}>
                {item.summary}
              </h2>
            )}

            {/* Description */}
            {editingDesc ? (
              <textarea
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                autoFocus
                rows={4}
                style={{
                  width: '100%', border: '1.5px solid #2563EB', borderRadius: 4, padding: 8,
                  fontSize: 13, color: '#0F172A', fontFamily: 'Inter, sans-serif', outline: 'none',
                  resize: 'vertical', minHeight: 80, marginBottom: 16,
                }}
              />
            ) : (
              <div onClick={() => setEditingDesc(true)} style={{
                fontSize: 13, color: item.description_text ? '#334155' : '#94A3B8',
                fontStyle: item.description_text ? 'normal' : 'italic',
                cursor: 'text', marginBottom: 16, minHeight: 20, lineHeight: 1.6,
              }}>
                {item.description_text || 'Click to add description...'}
              </div>
            )}

            {/* Key Details */}
            <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 4 }}>Key Details</div>

              <DetailRow label="Status">
                <WorkHubStatusLozenge status={item.status} statusCategory={item.status_category} />
              </DetailRow>
              <DetailRow label="Priority">
                <WorkHubPriorityIcon priority={item.priority} size={16} showLabel />
              </DetailRow>
              <DetailRow label="Assignee">
                {item.assignee_display_name ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AvatarCircle name={item.assignee_display_name} size={24} />
                    <span style={{ fontSize: 13, color: '#0F172A' }}>{item.assignee_display_name}</span>
                  </span>
                ) : <span style={{ fontSize: 13, color: '#94A3B8' }}>— Set assignee</span>}
              </DetailRow>
              <DetailRow label="Reporter">
                {item.reporter_display_name ? (
                  <span style={{ fontSize: 13, color: '#0F172A' }}>{item.reporter_display_name}</span>
                ) : <span style={{ fontSize: 13, color: '#94A3B8' }}>— Set reporter</span>}
              </DetailRow>
              <DetailRow label="Due Date">
                <WorkHubDatePicker
                  value={item.due_date}
                  onChange={d => handleUpdate('due_date', d)}
                />
              </DetailRow>
              <DetailRow label="Points">
                <span style={{ fontSize: 13, color: item.story_points != null ? '#0F172A' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.story_points != null ? item.story_points : '— Set points'}
                </span>
              </DetailRow>
              <DetailRow label="Sprint">
                <span style={{ fontSize: 13, color: item.sprint_name ? '#0F172A' : '#94A3B8' }}>
                  {item.sprint_name || '—'}
                </span>
              </DetailRow>
              <DetailRow label="Created">
                <span style={{ fontSize: 13, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.jira_created_at ? format(new Date(item.jira_created_at), 'MMM d, yyyy, hh:mm a') : '—'}
                </span>
              </DetailRow>
              <DetailRow label="Updated">
                <span style={{ fontSize: 13, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.jira_updated_at ? format(new Date(item.jira_updated_at), 'MMM d, yyyy, hh:mm a') : '—'}
                </span>
              </DetailRow>
            </div>

            {/* Subtasks */}
            {item.child_count > 0 && (
              <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                    Subtasks ({item.completed_child_count}/{item.child_count} done)
                  </span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={14} color="#64748B" /></button>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${item.child_count > 0 ? (item.completed_child_count / item.child_count) * 100 : 0}%`, background: '#16A34A', borderRadius: 2, transition: 'width 300ms' }} />
                </div>
              </div>
            )}

            {/* Activity */}
            <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 8 }}>
                Activity
              </div>
              <WorkHubSidePanelActivity
                activities={activities}
                onAddComment={text => addCommentMutation.mutate(text)}
                isLoading={activityLoading}
              />
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
