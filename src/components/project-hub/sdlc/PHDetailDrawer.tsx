/**
 * Issue Detail Drawer — 560px slide-in from right
 * Cycle 2: Replaced native <select> with custom status dropdown
 */
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
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
        style={{ background: 'rgba(15,23,42,.4)', animation: 'phFadeIn 200ms ease' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-[var(--cp-float)]"
        style={{
          width: 560,
          borderLeft: '1px solid var(--divider)',
          boxShadow: '-8px 0 30px rgba(15,23,42,.1)',
          animation: 'phSlideInRight 200ms ease',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 flex-shrink-0"
          style={{ height: 52, borderBottom: '1px solid var(--divider)' }}
        >
          <PHIssueTypeIcon type={issue.type} size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-blue)', fontFamily: "'JetBrains Mono', monospace" }}>
            {getDisplayKey(issue)}
          </span>
          <PHSourceTag source={issue.source} />
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-bd-zone)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} color="var(--fg-3)" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 16, lineHeight: 1.3 }}>
              {issue.title}
            </h2>

            {/* Description */}
            <div className="mb-5">
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Description
              </div>
              <div
                className="rounded-lg p-3 bg-[var(--bg-1)]"
                style={{
                  border: '1px solid var(--divider)',
                  fontSize: 13,
                  color: issue.description ? 'var(--fg-2)' : 'var(--fg-4)',
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
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Child Issues ({childIssues.length})
                </div>
                <div className="flex flex-col gap-1">
                  {childIssues.map(child => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 px-3 rounded-md cursor-pointer transition-colors"
                      style={{ height: 50, border: '1px solid var(--cp-bd-zone)' }}
                      onClick={() => onSelectIssue(child as unknown as PHIssue)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <PHIssueTypeIcon type={child.type} size={14} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {child.key}
                      </span>
                      <span className="truncate flex-1" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                        {child.title}
                      </span>
                      <PHStatusLozenge status={child.status} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Activity
              </div>
              <div className="rounded-lg p-4 flex items-center justify-center bg-[var(--bg-1)]" style={{ border: '1px solid var(--divider)', color: 'var(--fg-4)', fontSize: 12 }}>
                No activity yet
              </div>
            </div>
          </div>

          {/* Aside */}
          <div
            className="flex-shrink-0 border-l overflow-y-auto bg-[var(--bg-1)]"
            style={{ width: 200, borderColor: 'var(--divider)', padding: 16 }}
          >
            {/* Status — custom dropdown, NO native select */}
            <AsideField label="Status">
              <StatusDropdown
                value={issue.status}
                onChange={s => onUpdateIssue(issue.id, { status: s } as any)}
              />
            </AsideField>

            <AsideField label="Priority">
              <PHPriorityIcon priority={issue.priority} showLabel />
            </AsideField>

            <AsideField label="Assignee">
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                <span
                  className={`rounded-full inline-flex items-center justify-center ${issue.assignee_id ? 'bg-[var(--bg-3)]' : 'bg-transparent'}`}
                  style={{
                    width: 20, height: 20,
                    border: issue.assignee_id ? 'none' : '1.5px dashed var(--divider)',
                    fontSize: 8, color: 'var(--fg-3)',
                  }}
                >
                  {issue.assignee_id ? '👤' : ''}
                </span>
                {issue.assignee_id ? 'Assigned' : 'Unassigned'}
              </span>
            </AsideField>

            <AsideField label="Release">
              <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 500 }}>{relName}</span>
            </AsideField>

            <AsideField label="Due Date">
              <span style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: (issue.overdue_days ?? 0) > 0 ? 'var(--sem-danger)' : 'var(--fg-2)',
                fontWeight: 500,
              }}>
                {issue.due_date
                  ? new Date(issue.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </span>
            </AsideField>

            <AsideField label="Source">
              <PHSourceTag source={issue.source} />
            </AsideField>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes phSlideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes phFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── Aside field wrapper ── */
function AsideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* ── Custom Status Dropdown (replaces banned native <select>) ── */
function StatusDropdown({ value, onChange }: { value: IssueStatus; onChange: (s: IssueStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const cfg = STATUS_CONFIG[value];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1 rounded-md transition-colors bg-[var(--bg-app)]"
        style={{
          padding: '4px 8px',
          fontSize: 11, fontWeight: 600,
          border: '1px solid var(--divider)',
          color: 'var(--fg-2)',
          cursor: 'pointer',
        }}
      >
        <PHStatusLozenge status={value} compact />
        <ChevronDown size={12} color="var(--fg-4)" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 rounded-lg shadow-lg border z-50 bg-[var(--cp-float)]"
          style={{ borderColor: 'var(--divider)', minWidth: 160, padding: 4 }}
        >
          {(Object.keys(STATUS_CONFIG) as IssueStatus[]).map(s => {
            const sc = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left ${value === s ? 'bg-[var(--cp-bd-zone)]' : 'bg-transparent'}`}
                style={{
                  fontSize: 11, fontWeight: value === s ? 600 : 500,
                  color: 'var(--fg-2)',
                  border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => { if (value !== s) e.currentTarget.style.background = 'var(--bg-1)'; }}
                onMouseLeave={e => { if (value !== s) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: sc.color }} />
                {sc.label}
                {value === s && <span className="ml-auto" style={{ fontSize: 10, color: 'var(--cp-blue)' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
