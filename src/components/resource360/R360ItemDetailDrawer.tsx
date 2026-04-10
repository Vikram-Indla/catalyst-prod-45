/**
 * R360 Item Detail Drawer — Stage D (DB-wired)
 * Fetches full item detail from ph_issues via useItemDetail hook.
 * All CSS scoped under #r360-root .item-drawer
 */
import React, { useEffect, useRef } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { initials } from './r360-helpers';
import { useItemDetail } from '@/hooks/useItemDetail';
import { calcDaysSitting } from '@/lib/r360/fetchItemDetail';
import { deriveStatusCategory } from '@/lib/status-colors';

// ─── HELPERS ───

const getStatusColor = (status: string): 'grey' | 'blue' | 'green' => {
  const cat = deriveStatusCategory(status);
  return cat === 'done' ? 'green' : cat === 'in_progress' ? 'blue' : 'grey';
};

const getDaysFillClass = (days: number) =>
  days >= 29 ? 'red' : days >= 15 ? 'amber' : '';

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── COMPONENT ───

interface R360ItemDetailDrawerProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function R360ItemDetailDrawer({ itemId, isOpen, onClose }: R360ItemDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data: item, isLoading, isError, refetch } = useItemDetail(itemId);

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeRef.current?.focus(), 300);
    }
  }, [isOpen]);

  if (!itemId && !isOpen) return null;

  const ageDays = item ? calcDaysSitting(item.assignedAt, item.resolution) : 0;
  const statusDotClass = item ? getStatusColor(item.status) : 'grey';
  const daysFill = getDaysFillClass(ageDays);
  const daysPct = Math.min((ageDays / 42) * 100, 100);

  // Loading skeleton for drawer body
  const renderSkeleton = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: 16 }}>
        <div className="animate-pulse" style={{ height: 16, width: '60%', background: 'var(--divider)', borderRadius: 4, marginBottom: 10 }} />
        <div className="animate-pulse" style={{ height: 12, width: '80%', background: 'var(--bg-3)', borderRadius: 4, marginBottom: 8 }} />
        <div className="animate-pulse" style={{ height: 12, width: '45%', background: 'var(--bg-3)', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i}>
            <div className="animate-pulse" style={{ height: 8, width: '40%', background: 'var(--divider)', borderRadius: 4, marginBottom: 6 }} />
            <div className="animate-pulse" style={{ height: 14, width: '70%', background: 'var(--bg-3)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );

  // Error state
  const renderError = () => (
    <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--cp-danger, #DC2626)' }}>
      <p style={{ marginBottom: 8 }}>Could not load item detail.</p>
      <button
        onClick={() => refetch()}
        style={{
          fontSize: 12, fontWeight: 600, color: 'var(--cp-primary, #2563EB)',
          background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
        }}
      >Retry</button>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`item-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header — always visible */}
        <div className="drawer-hd">
          <span className="drawer-key">{item?.key ?? '…'}</span>
          <button ref={closeRef} className="drawer-close-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {isLoading && renderSkeleton()}
        {isError && renderError()}

        {item && !isLoading && !isError && (
          <>
            {/* Pill Row */}
            <div className="drawer-pills">
              <span className="pill-status">
                <span className={`pill-dot ${statusDotClass}`} />
                {item.status}
              </span>
              <span className="pill-sep" />
              <span className="pill-priority">{item.priority}</span>
              <span className="pill-sep" />
              <span className="pill-type">
                <JiraIssueTypeIcon type={item.type} />
                {item.type}
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
                <div className="meta-value">{item.projectName}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-label">Assignee</div>
                <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.assigneeName !== '—' ? (
                    <>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563EB, #0D9488)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 7, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{initials(item.assigneeName)}</div>
                      {item.assigneeName}
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
                    color: ageDays >= 29 ? 'var(--cp-danger, #DC2626)' :
                           ageDays >= 15 ? 'var(--cp-warning, #D97706)' :
                           'var(--cp-ink, #0F172A)'
                  }}>{ageDays}</span>
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
                  <div className="hier-row">
                    <div className="hier-icon epic">E</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span className="hier-key">{item.parentKey}</span>
                      <span className="hier-name">{item.parentName || '—'}</span>
                    </div>
                  </div>
                  <div className="hier-indent">
                    <div className="hier-indent-line" />
                    <div className="hier-row hier-self" style={{ flex: 1 }}>
                      <JiraIssueTypeIcon type={item.type} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span className="hier-key">{item.key}</span>
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
