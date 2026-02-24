/**
 * Issue Detail Drawer — 560px slide-in from right
 */
import React, { useEffect, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { PHIssue, PHRelease } from '@/services/project-hub.service';
import { getDisplayKey } from '@/services/project-hub.service';
import { PHIssueTypeIcon } from './PHIssueTypeIcon';
import { PHSourceTag } from './PHSourceTag';
import { PHStatusLozenge } from './PHStatusLozenge';
import { PHPriorityIcon } from './PHPriorityIcon';
import type { IssueStatus } from '@/types/project-hub.types';
import { STATUS_CONFIG } from '@/types/project-hub.types';

interface Props {
  issue: PHIssue | null;
  children: PHIssue[];
  releases: PHRelease[];
  open: boolean;
  onClose: () => void;
  onSelectIssue: (issue: PHIssue) => void;
  onUpdateIssue: (id: string, updates: Partial<PHIssue>) => void;
}

export function PHDetailDrawer({ issue, children: childIssues, releases, open, onClose, onSelectIssue, onUpdateIssue }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!issue || !open) return null;

  const relName = releases.find(r => r.id === issue.release_id)?.name ?? '—';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(15,23,42,.4)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 560,
          background: '#fff',
          borderLeft: '1px solid #E2E8F0',
          boxShadow: '-8px 0 30px rgba(15,23,42,.1)',
          animation: 'slideInRight .2s ease',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 flex-shrink-0"
          style={{ height: 52, borderBottom: '1px solid #E2E8F0' }}
        >
          <PHIssueTypeIcon type={issue.type} size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>
            {getDisplayKey(issue)}
          </span>
          <PHSourceTag source={issue.source} />
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 transition"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={16} color="#64748B" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 16, lineHeight: 1.3 }}>
              {issue.title}
            </h2>

            {/* Description */}
            <div className="mb-5">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Description
              </div>
              <div
                className="rounded-lg p-3"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: 13,
                  color: issue.description ? '#334155' : '#94A3B8',
                  minHeight: 60,
                  lineHeight: 1.5,
                }}
              >
                {issue.description || 'Click to add a description…'}
              </div>
            </div>

            {/* Child Issues */}
            {childIssues.length > 0 && (
              <div className="mb-5">
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Child Issues ({childIssues.length})
                </div>
                <div className="flex flex-col gap-1">
                  {childIssues.map(child => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 px-3 rounded-md cursor-pointer hover:bg-gray-50 transition"
                      style={{ height: 36, border: '1px solid #F1F5F9' }}
                      onClick={() => onSelectIssue(child as unknown as PHIssue)}
                    >
                      <PHIssueTypeIcon type={child.type} size={14} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>
                        {child.key}
                      </span>
                      <span className="truncate flex-1" style={{ fontSize: 12, color: '#334155' }}>
                        {child.title}
                      </span>
                      <PHStatusLozenge status={child.status} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity placeholder */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                Activity
              </div>
              <div className="rounded-lg p-4 flex items-center justify-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                No activity yet
              </div>
            </div>
          </div>

          {/* Aside */}
          <div
            className="flex-shrink-0 border-l overflow-y-auto"
            style={{ width: 200, borderColor: '#E2E8F0', background: '#FAFBFC', padding: 16 }}
          >
            {[
              {
                label: 'Status',
                content: (
                  <select
                    value={issue.status}
                    onChange={e => onUpdateIssue(issue.id, { status: e.target.value as IssueStatus } as any)}
                    className="w-full rounded-md text-xs font-medium px-2 py-1.5"
                    style={{ border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 11 }}
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: 'Priority',
                content: <PHPriorityIcon priority={issue.priority} showLabel />,
              },
              {
                label: 'Assignee',
                content: (
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {issue.assignee_id ? 'Assigned' : 'Unassigned'}
                  </span>
                ),
              },
              {
                label: 'Release',
                content: <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{relName}</span>,
              },
              {
                label: 'Due Date',
                content: (
                  <span style={{
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: issue.overdue_days > 0 ? '#EF4444' : '#334155',
                    fontWeight: 500,
                  }}>
                    {issue.due_date
                      ? new Date(issue.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </span>
                ),
              },
              {
                label: 'Source',
                content: <PHSourceTag source={issue.source} />,
              },
            ].map(field => (
              <div key={field.label} className="mb-4">
                <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  {field.label}
                </div>
                {field.content}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
