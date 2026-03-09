/**
 * EpicDetailDrawer — 560px right slide-in detail panel
 * All fields inline-editable. No separate "Edit" button.
 * Pure white bg, proper data hydration from ph_issues.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { getLozengeStyle, EPIC_STATUS_LOZENGE, formatDueDate, getInitials } from '../../utils/backlog.utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EpicDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string | null;
  projectId: string;
}

const DETAIL_LABEL: React.CSSProperties = {
  width: 100, flexShrink: 0, fontSize: 11, fontWeight: 650,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', lineHeight: '36px',
};
const DETAIL_VALUE: React.CSSProperties = { fontSize: 14, color: '#0F172A', fontWeight: 400 };

const STATUS_GROUPS = [
  { label: 'TO DO', statuses: ['Backlog', 'To Do'] },
  { label: 'IN PROGRESS', statuses: ['In Progress'] },
  { label: 'DONE', statuses: ['Done', 'Cancelled'] },
];

function getEpicStatusColors(status: string): { bg: string; text: string; label: string } {
  const cfg = EPIC_STATUS_LOZENGE[status];
  if (cfg) {
    const style = getLozengeStyle(cfg.color);
    return { ...style, label: cfg.label };
  }
  return { bg: '#DFE1E6', text: '#253858', label: status.replace(/_/g, ' ').toUpperCase() };
}

export const EpicDetailDrawer: React.FC<EpicDetailDrawerProps> = ({ isOpen, onClose, epicId, projectId }) => {
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  const { data: epic, isLoading, error } = useQuery({
    queryKey: ['epic-drawer-detail', epicId],
    queryFn: async () => {
      if (!epicId) return null;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_display_name, reporter_display_name, due_date, story_points, sprint_name, labels, jira_created_at, jira_updated_at, issue_type')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!epicId && isOpen,
  });

  useEffect(() => {
    if (epic) {
      setTitleValue(epic.summary || '');
      setDescValue(epic.description_text || '');
    }
  }, [epic]);

  const updateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!epicId) return;
      const updates: Record<string, any> = { [field]: value };
      if (field === 'status') {
        const done = ['Done', 'Closed', 'In Production', 'Released', 'Cancelled'];
        const inProgress = ['In Progress'];
        if (done.includes(value)) updates.status_category = 'Done';
        else if (inProgress.includes(value)) updates.status_category = 'In Progress';
        else updates.status_category = 'To Do';
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-drawer-detail', epicId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleUpdate = useCallback((field: string, value: any) => {
    updateMutation.mutate({ field, value });
  }, [updateMutation]);

  if (!epicId) return null;

  const statusColors = epic?.status ? getEpicStatusColors(epic.status) : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        style={{ width: 560, maxWidth: '100vw', padding: 0, background: '#FFFFFF' }}
        className="overflow-y-auto border-l"
      >
        {/* Sticky Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF',
          borderBottom: '0.75px solid rgba(15,23,42,0.06)',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {epic ? (
            <>
              <JiraIssueTypeIcon type="epic" size={20} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{epic.issue_key}</span>
              <span style={{ fontSize: 13, color: '#64748B' }}>· Epic</span>
            </>
          ) : (
            <div style={{ height: 20, width: 120, borderRadius: 3, background: '#E2E8F0' }} />
          )}
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 20px' }}>
            <div style={{ height: 20, width: 100, borderRadius: 3, background: '#E2E8F0', marginBottom: 16 }} />
            <div style={{ height: 24, width: '80%', borderRadius: 3, background: '#E2E8F0', marginBottom: 8 }} />
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 100, height: 14, borderRadius: 3, background: '#E2E8F0' }} />
                <div style={{ width: 140, height: 14, borderRadius: 3, background: '#E2E8F0' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#DC2626' }}>Failed to load epic</p>
          </div>
        ) : epic ? (
          <div style={{ padding: '16px 20px', flex: 1 }}>
            {/* Status */}
            <div style={{ marginBottom: 12 }}>
              <Popover>
                <PopoverTrigger asChild>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {statusColors && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" style={{ width: 220, padding: '4px 0', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 9999 }}>
                  {STATUS_GROUPS.map(group => (
                    <div key={group.label}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', padding: '6px 12px 2px' }}>{group.label}</div>
                      {group.statuses.map(s => {
                        const sc = getEpicStatusColors(s);
                        return (
                          <button key={s} onClick={() => handleUpdate('status', s)} style={{
                            width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                            background: epic.status === s ? 'rgba(37,99,235,0.08)' : 'transparent',
                            color: '#0F172A', cursor: 'pointer',
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: sc.bg, color: sc.text }}>{sc.label}</span>
                          </button>
                        );
                      })}
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
                style={{ width: '100%', fontSize: 20, fontWeight: 650, color: '#0F172A', border: '1.5px solid #2563EB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: "'Sora', sans-serif", marginBottom: 8 }}
              />
            ) : (
              <h2 onClick={() => setEditingTitle(true)} style={{ fontSize: 20, fontWeight: 650, color: '#0F172A', margin: '0 0 8px', cursor: 'text', fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
                {epic.summary || <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>Click to add a title...</span>}
              </h2>
            )}

            {/* Description */}
            {editingDesc ? (
              <textarea value={descValue} onChange={e => setDescValue(e.target.value)}
                onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                autoFocus rows={4}
                style={{ width: '100%', border: '1.5px solid #2563EB', borderRadius: 4, padding: 8, fontSize: 14, color: '#0F172A', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', minHeight: 80, marginBottom: 16 }}
              />
            ) : (
              <div onClick={() => setEditingDesc(true)} style={{
                fontSize: 14, color: epic.description_text ? '#334155' : '#94A3B8',
                fontStyle: epic.description_text ? 'normal' : 'italic',
                cursor: 'text', marginBottom: 16, minHeight: 20, lineHeight: 1.6,
              }}>
                {epic.description_text || 'Click to add description...'}
              </div>
            )}

            {/* Key Details */}
            <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 4 }}>Key Details</div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Status</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>
                  {statusColors && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Priority</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>
                  <span style={DETAIL_VALUE}>{epic.priority || '—'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Assignee</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36, gap: 6 }}>
                  {epic.assignee_display_name ? (
                    <>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>{getInitials(epic.assignee_display_name)}</div>
                      <span style={DETAIL_VALUE}>{epic.assignee_display_name}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>— Set assignee</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Reporter</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>
                  {epic.reporter_display_name ? (
                    <span style={DETAIL_VALUE}>{epic.reporter_display_name}</span>
                  ) : (
                    <span style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>— Set reporter</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Due Date</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>
                  <span style={{ ...DETAIL_VALUE, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: epic.due_date ? '#0F172A' : '#94A3B8' }}>
                    {epic.due_date ? format(new Date(epic.due_date), 'MMM d, yyyy') : '— Set date'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Created</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>
                  <span style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                    {epic.jira_created_at ? format(new Date(epic.jira_created_at), 'MMM d, yyyy, hh:mm a') : '—'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
                <span style={DETAIL_LABEL}>Updated</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>
                  <span style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                    {epic.jira_updated_at ? format(new Date(epic.jira_updated_at), 'MMM d, yyyy, hh:mm a') : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
