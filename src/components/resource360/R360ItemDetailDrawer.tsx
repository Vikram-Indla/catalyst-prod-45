/**
 * R360 Item Detail Drawer — Stage C
 * Side-sliding drawer showing full item metadata.
 * Uses in-memory data already loaded in ring/board/chrono views.
 * All CSS scoped under #r360-root .item-drawer
 */
import React, { useEffect, useRef } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { initials } from './r360-helpers';

// ─── HELPERS ───

const getStatusColor = (status: string): 'grey' | 'blue' | 'green' => {
  const s = status.toUpperCase();
  const GREEN = ['DONE','APPROVED','COMPLETED','CLOSED','RESOLVED','RELEASED','VERIFIED','ACCEPTED'];
  const BLUE  = ['IN PROGRESS','IN REVIEW','ACTIVE','UNDER REVIEW','IN DEVELOPMENT',
                 'UNDER IMPLEMENTATION','IN TESTING','IN QA','DEPLOYED','IN DEPLOYMENT',
                 'UNDER ANALYSIS','PENDING REVIEW','OPEN','RE-OPEN','REOPENED'];
  if (GREEN.includes(s)) return 'green';
  if (BLUE.includes(s))  return 'blue';
  return 'grey';
};

const getDaysFillClass = (days: number) =>
  days >= 29 ? 'red' : days >= 15 ? 'amber' : '';

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── TYPES ───

export interface R360DrawerItem {
  id: string;
  itemKey: string;
  title: string;
  status: string;
  statusCategory: string;
  priority: string;
  itemType: string;
  projectName: string | null;
  projectKey: string | null;
  assignerName: string | null;
  assignedAt: string;
  ageDays: number;
  releaseName: string | null;
  dueDate: string | null;
  parentKey: string | null;
  parentTitle: string | null;
  parentType: string | null;
}

/** Map a Resource360Item to the drawer's expected shape */
export function mapToDrawerItem(item: Resource360Item): R360DrawerItem {
  return {
    id: item.work_item_id,
    itemKey: item.item_key,
    title: item.title,
    status: item.status,
    statusCategory: item.status_category,
    priority: item.priority,
    itemType: item.item_type,
    projectName: item.project_name,
    projectKey: item.project_key,
    assignerName: item.assigner_name,
    assignedAt: item.assigned_at,
    ageDays: item.age_days,
    releaseName: item.release_name,
    dueDate: item.release_end_date,
    parentKey: item.parent_key,
    parentTitle: item.parent_title,
    parentType: item.parent_type,
  };
}

// ─── COMPONENT ───

interface R360ItemDetailDrawerProps {
  item: R360DrawerItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function R360ItemDetailDrawer({ item, isOpen, onClose }: R360ItemDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeRef.current?.focus(), 300);
    }
  }, [isOpen]);

  if (!item && !isOpen) return null;

  const statusDotClass = item ? getStatusColor(item.status) : 'grey';
  const daysFill = item ? getDaysFillClass(item.ageDays) : '';
  const daysPct = item ? Math.min((item.ageDays / 42) * 100, 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`item-drawer ${isOpen ? 'open' : ''}`}>
        {item && (
          <>
            {/* Header */}
            <div className="drawer-hd">
              <span className="drawer-key">{item.itemKey}</span>
              <button ref={closeRef} className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
                ✕
              </button>
            </div>

            {/* Pill Row */}
            <div className="drawer-pills">
              <span className="pill-status">
                <span className={`pill-dot ${statusDotClass}`} />
                {item.status}
              </span>
              <span className="pill-sep" />
              <span className="pill-priority">{item.priority || '—'}</span>
              <span className="pill-sep" />
              <span className="pill-type">
                <JiraIssueTypeIcon type={item.itemType} />
                {item.itemType}
              </span>
              {item.projectKey && (
                <>
                  <span className="pill-sep" />
                  <span className="pill-project">{item.projectKey}</span>
                </>
              )}
            </div>

            {/* Title */}
            <div className="drawer-title">{item.title}</div>

            {/* Meta Grid */}
            <div className="drawer-meta">
              <div className="meta-cell">
                <div className="meta-label">Project</div>
                <div className="meta-value">{item.projectName || '—'}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-label">Assigner</div>
                <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.assignerName ? (
                    <>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563EB, #0D9488)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 7, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{initials(item.assignerName)}</div>
                      {item.assignerName}
                    </>
                  ) : '—'}
                </div>
              </div>
              <div className="meta-cell">
                <div className="meta-label">Assigned</div>
                <div className="meta-value">{formatDate(item.assignedAt)}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-label">Days Sitting</div>
                <div className="days-wrap">
                  <span className="days-num" style={{
                    color: item.ageDays >= 29 ? 'var(--cp-danger, #DC2626)' :
                           item.ageDays >= 15 ? 'var(--cp-warning, #D97706)' :
                           'var(--cp-ink, #0F172A)'
                  }}>{item.ageDays}</span>
                  <div className="days-track">
                    <div className={`days-fill ${daysFill}`} style={{ width: `${daysPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="meta-cell">
                <div className="meta-label">Release</div>
                <div className={`meta-value ${!item.releaseName ? 'muted' : ''}`}>
                  {item.releaseName || '—'}
                </div>
              </div>
              <div className="meta-cell">
                <div className="meta-label">Due</div>
                <div className={`meta-value ${!item.dueDate ? 'muted' : ''}`}>
                  {formatDate(item.dueDate)}
                </div>
              </div>
            </div>

            {/* Hierarchy */}
            <div className="drawer-hier">
              <div className="hier-label">Hierarchy</div>
              {item.parentKey ? (
                <>
                  {/* Parent epic row */}
                  <div className="hier-row">
                    <div className="hier-icon epic">E</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span className="hier-key">{item.parentKey}</span>
                      <span className="hier-name">{item.parentTitle || '—'}</span>
                    </div>
                  </div>
                  {/* Indent + self */}
                  <div className="hier-indent">
                    <div className="hier-indent-line" />
                    <div className="hier-row hier-self" style={{ flex: 1 }}>
                      <JiraIssueTypeIcon type={item.itemType} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span className="hier-key">{item.itemKey}</span>
                        <span className="hier-name">{item.title}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--cp-ink-muted, #64748B)' }}>— No parent</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
