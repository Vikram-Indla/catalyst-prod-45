/**
 * WorkItemDrawer — Detail view for a single Jira issue from wh_issues
 */

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { WorkHubDrawer } from '@/components/workhub/shared';
import { useUpdateWorkItem } from '@/hooks/workhub/useWorkItems';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface WorkItemDrawerProps {
  item: JiraIssue | null;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b" style={{ borderColor: '#f1f5f9' }}>
      <span className="text-[12px] font-medium shrink-0" style={{ width: '120px', color: 'var(--wh-text-tertiary, #94a3b8)' }}>
        {label}
      </span>
      <div className="flex-1 text-[13px]" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>{children}</div>
    </div>
  );
}

export function WorkItemDrawer({ item, onClose }: WorkItemDrawerProps) {
  return (
    <WorkHubDrawer
      isOpen={!!item}
      onClose={onClose}
      title={item ? `${item.issue_key} — ${item.issue_type}` : ''}
    >
      {!item ? null : (
        <div className="space-y-5">
          {/* Header */}
          <div>
            <span
              className="text-base font-bold"
              style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--wh-primary, #2563eb)' }}
            >
              {item.issue_key}
            </span>
          </div>

          {/* Summary */}
          <h2 className="text-lg font-semibold" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>
            {item.summary}
          </h2>

          {/* Detail grid */}
          <div>
            <DetailRow label="Status">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                {item.status}
              </span>
            </DetailRow>
            <DetailRow label="Type">{item.issue_type}</DetailRow>
            <DetailRow label="Priority">{item.priority}</DetailRow>
            <DetailRow label="Project">{item.project_key}</DetailRow>
            <DetailRow label="Assignee">{item.assignee_display_name || '—'}</DetailRow>
            <DetailRow label="Due Date">{item.due_date || '—'}</DetailRow>
            <DetailRow label="Story Points">{item.story_points ?? '—'}</DetailRow>
            <DetailRow label="Sprint">{item.sprint_name || '—'}</DetailRow>
            <DetailRow label="Resolution">{item.resolution || '—'}</DetailRow>
            <DetailRow label="Labels">{(item.labels || []).join(', ') || '—'}</DetailRow>
            <DetailRow label="Components">{(item.components || []).join(', ') || '—'}</DetailRow>

            {item.parent_key && (
              <DetailRow label="Parent">
                <span style={{ fontFamily: 'var(--wh-font-mono, monospace)', color: 'var(--wh-primary, #2563eb)' }}>
                  {item.parent_key}
                </span>
              </DetailRow>
            )}

            {item.fix_versions && item.fix_versions.length > 0 && (
              <DetailRow label="Fix Versions">
                {item.fix_versions.map((v: any, i: number) => (
                  <span key={i} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                    {v.name}
                  </span>
                ))}
              </DetailRow>
            )}

            <DetailRow label="Created">
              {item.jira_created_at ? format(new Date(item.jira_created_at), 'MMM d, yyyy HH:mm') : '—'}
            </DetailRow>
            <DetailRow label="Updated">
              {item.jira_updated_at ? format(new Date(item.jira_updated_at), 'MMM d, yyyy HH:mm') : '—'}
            </DetailRow>
            <DetailRow label="Synced">
              {item.synced_at ? formatDistanceToNow(new Date(item.synced_at), { addSuffix: true }) : '—'}
            </DetailRow>
          </div>
        </div>
      )}
    </WorkHubDrawer>
  );
}
