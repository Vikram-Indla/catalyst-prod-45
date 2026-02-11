/**
 * WorkItemDrawer — Detail view for a single work item
 */

import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Lock, Calendar } from 'lucide-react';
import { WorkHubDrawer, TypeBadge, StatusBadge, AvatarChip } from '@/components/workhub/shared';
import { useWorkItem, useWorkItemChildren, useUpdateWorkItem } from '@/hooks/workhub/useWorkItems';
import { useWHReleases } from '@/hooks/workhub/useReleases';
import { useWHThemes } from '@/hooks/workhub/useThemes';
import { useWHResources } from '@/hooks/workhub/useResources';
import { STATUS_CONFIG } from '@/lib/workhub/constants';
import type { WorkItemStatus, Priority } from '@/types/workhub.types';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface WorkItemDrawerProps {
  itemId: string | null;
  onClose: () => void;
  onNavigate?: (id: string) => void;
}

const ALL_STATUSES: WorkItemStatus[] = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked', 'Cancelled'];
const ALL_PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];

function DetailRow({ label, children, locked }: { label: string; children: React.ReactNode; locked?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b" style={{ borderColor: '#f1f5f9' }}>
      <span className="text-[12px] font-medium shrink-0 flex items-center gap-1" style={{ width: '120px', color: 'var(--wh-text-tertiary)' }}>
        {label}
        {locked && <Lock className="w-3 h-3" style={{ color: 'var(--wh-text-tertiary)' }} />}
      </span>
      <div className="flex-1 text-[13px]" style={{ color: 'var(--wh-text-primary)' }}>{children}</div>
    </div>
  );
}

export function WorkItemDrawer({ itemId, onClose, onNavigate }: WorkItemDrawerProps) {
  const { data: item, isLoading } = useWorkItem(itemId || '');
  const { data: children } = useWorkItemChildren(itemId || '');
  const { data: releases } = useWHReleases();
  const { data: themes } = useWHThemes();
  const { data: resources } = useWHResources();
  const updateItem = useUpdateWorkItem();

  const [dirty, setDirty] = useState<Record<string, any>>({});

  useEffect(() => { setDirty({}); }, [itemId]);

  const currentVal = (field: string) => dirty[field] ?? (item as any)?.[field];

  const setField = (field: string, value: any) => {
    setDirty(prev => ({ ...prev, [field]: value }));
  };

  const isDirty = Object.keys(dirty).length > 0;
  const isLocked = item?.is_jira_locked;

  const handleSave = async () => {
    if (!item) return;
    for (const [field, value] of Object.entries(dirty)) {
      await updateItem.mutateAsync({ id: item.id, field, value });
    }
    toast.success(`${item.item_key} updated`);
    setDirty({});
  };

  const footer = (
    <div className="flex items-center gap-2 justify-end">
      <button
        onClick={onClose}
        className="px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-slate-50"
        style={{ borderColor: 'var(--wh-border)', color: 'var(--wh-text-secondary)' }}
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!isDirty}
        className="px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-40"
        style={{ backgroundColor: 'var(--wh-primary)' }}
      >
        Save Changes
      </button>
    </div>
  );

  return (
    <WorkHubDrawer
      isOpen={!!itemId}
      onClose={onClose}
      title={item ? '' : 'Loading...'}
      footer={footer}
    >
      {isLoading || !item ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-20 bg-slate-100 rounded" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <TypeBadge type={item.item_type} />
            <span
              className="text-base font-semibold"
              style={{ fontFamily: 'var(--wh-font-mono)', color: 'var(--wh-text-primary)' }}
            >
              {item.item_key}
            </span>
            {item.jira_url && (
              <a
                href={item.jira_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[11px] font-medium hover:underline"
                style={{ color: 'var(--wh-primary)' }}
              >
                Open in Jira <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Summary */}
          <input
            type="text"
            value={currentVal('summary') || ''}
            onChange={e => setField('summary', e.target.value)}
            className="w-full text-lg font-semibold bg-transparent outline-none border-b-2 border-transparent focus:border-[var(--wh-primary)] transition-colors"
            style={{ fontFamily: 'var(--wh-font-sans)', color: 'var(--wh-text-primary)' }}
          />

          {/* Description */}
          <textarea
            value={currentVal('description') || ''}
            onChange={e => setField('description', e.target.value)}
            placeholder="Add a description..."
            className="w-full min-h-[80px] text-[13px] bg-transparent outline-none border border-dashed rounded-lg p-3 focus:border-[var(--wh-primary)] transition-colors resize-y"
            style={{ borderColor: 'var(--wh-border)', color: 'var(--wh-text-primary)' }}
          />

          {/* Detail grid */}
          <div>
            <DetailRow label="Status" locked={isLocked}>
              <select
                value={currentVal('status')}
                onChange={e => setField('status', e.target.value)}
                disabled={isLocked}
                className="text-[13px] bg-transparent outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: 'var(--wh-text-primary)' }}
              >
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </DetailRow>

            <DetailRow label="Priority" locked={isLocked}>
              <select
                value={currentVal('priority')}
                onChange={e => setField('priority', e.target.value)}
                disabled={isLocked}
                className="text-[13px] bg-transparent outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: 'var(--wh-text-primary)' }}
              >
                {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </DetailRow>

            <DetailRow label="Assignee">
              <select
                value={currentVal('assignee_user_id') || ''}
                onChange={e => setField('assignee_user_id', e.target.value || null)}
                className="text-[13px] bg-transparent outline-none cursor-pointer"
                style={{ color: 'var(--wh-text-primary)' }}
              >
                <option value="">Unassigned</option>
                {(resources ?? []).map(r => <option key={r.user_id} value={r.user_id}>{r.name}</option>)}
              </select>
            </DetailRow>

            <DetailRow label="Release">
              <select
                value={currentVal('release_id') || ''}
                onChange={e => setField('release_id', e.target.value || null)}
                className="text-[13px] bg-transparent outline-none cursor-pointer"
                style={{ color: 'var(--wh-text-primary)' }}
              >
                <option value="">None</option>
                {(releases ?? []).map(r => <option key={r.id} value={r.id}>{r.name} — {r.title}</option>)}
              </select>
            </DetailRow>

            <DetailRow label="Theme">
              <select
                value={currentVal('theme_id') || ''}
                onChange={e => setField('theme_id', e.target.value || null)}
                className="text-[13px] bg-transparent outline-none cursor-pointer"
                style={{ color: 'var(--wh-text-primary)' }}
              >
                <option value="">None</option>
                {(themes ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </DetailRow>

            <DetailRow label="Project">
              <span
                className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                {item.project_key || '—'}
              </span>
            </DetailRow>

            <DetailRow label="Due Date">
              <input
                type="date"
                value={currentVal('due_date') || ''}
                onChange={e => setField('due_date', e.target.value || null)}
                className="text-[13px] bg-transparent outline-none cursor-pointer"
                style={{ color: 'var(--wh-text-primary)' }}
              />
            </DetailRow>

            <DetailRow label="Story Points">
              <input
                type="number"
                value={currentVal('story_points') ?? ''}
                onChange={e => setField('story_points', e.target.value ? Number(e.target.value) : null)}
                className="w-20 text-[13px] bg-transparent outline-none border-b border-transparent focus:border-[var(--wh-primary)]"
                style={{ color: 'var(--wh-text-primary)' }}
              />
            </DetailRow>

            <DetailRow label="Est. Hours">
              <input
                type="number"
                value={currentVal('estimated_hours') ?? ''}
                onChange={e => setField('estimated_hours', e.target.value ? Number(e.target.value) : null)}
                className="w-20 text-[13px] bg-transparent outline-none border-b border-transparent focus:border-[var(--wh-primary)]"
                style={{ color: 'var(--wh-text-primary)' }}
              />
            </DetailRow>

            <DetailRow label="Created">
              <span style={{ color: 'var(--wh-text-tertiary)' }}>
                {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy HH:mm') : '—'}
              </span>
            </DetailRow>

            <DetailRow label="Updated">
              <span style={{ color: 'var(--wh-text-tertiary)' }}>
                {item.updated_at ? format(new Date(item.updated_at), 'MMM d, yyyy HH:mm') : '—'}
              </span>
            </DetailRow>

            <DetailRow label="Last Synced">
              <span style={{ color: 'var(--wh-text-tertiary)' }}>
                {item.last_synced_at ? formatDistanceToNow(new Date(item.last_synced_at), { addSuffix: true }) : '—'}
              </span>
            </DetailRow>
          </div>

          {/* Parent */}
          {item.parent_id && item.parent_key && (
            <div className="pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
              <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--wh-text-tertiary)' }}>Parent</span>
              <button
                onClick={() => onNavigate?.(item.parent_id!)}
                className="block mt-1 text-[13px] font-medium hover:text-[var(--wh-primary)] transition-colors"
                style={{ fontFamily: 'var(--wh-font-mono)', color: 'var(--wh-text-primary)' }}
              >
                {item.parent_key} — {item.parent_summary}
              </button>
            </div>
          )}

          {/* Children */}
          {item.children_count > 0 && children && children.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
              <span className="text-[11px] font-semibold uppercase mb-2 block" style={{ color: 'var(--wh-text-tertiary)' }}>
                Children ({children.length})
              </span>
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--wh-border)' }}>
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => onNavigate?.(child.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left border-b last:border-b-0 hover:bg-slate-50 transition-colors"
                    style={{ borderColor: '#f1f5f9' }}
                  >
                    <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--wh-font-mono)', color: 'var(--wh-text-secondary)' }}>
                      {child.item_key}
                    </span>
                    <TypeBadge type={child.item_type} size="sm" />
                    <span className="text-[12px] truncate flex-1" style={{ color: 'var(--wh-text-primary)' }}>
                      {child.summary}
                    </span>
                    <StatusBadge status={child.status} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WorkHubDrawer>
  );
}
