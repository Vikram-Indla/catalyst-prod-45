/**
 * BoardIssueDetailDrawer — InitiativeDetailPanel-style slide-out drawer
 * for Kanban board cards (ph_issues). Reuses idp-* CSS classes.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X, ExternalLink, Copy, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { toast } from 'sonner';
import '@/styles/initiative-detail-panel.css';

/* ── Status color map ── */
const STATUS_PILL: Record<string, { text: string; bg: string; bdr: string }> = {
  todo:        { text: 'rgba(237,237,237,0.40)', bg: '#1A1A1A', bdr: 'rgba(100,116,139,0.2)' },
  backlog:     { text: 'rgba(237,237,237,0.40)', bg: '#1A1A1A', bdr: 'rgba(100,116,139,0.2)' },
  new:         { text: 'rgba(237,237,237,0.40)', bg: '#1A1A1A', bdr: 'rgba(100,116,139,0.2)' },
  'in progress': { text: '#2563EB', bg: 'rgba(59,130,246,0.06)', bdr: 'rgba(37,99,235,0.2)' },
  inprogress:  { text: '#2563EB', bg: 'rgba(59,130,246,0.06)', bdr: 'rgba(37,99,235,0.2)' },
  'in review':   { text: '#7C3AED', bg: '#F5F3FF', bdr: 'rgba(124,58,237,0.2)' },
  done:        { text: '#0D7331', bg: 'rgba(74,222,128,0.06)', bdr: 'rgba(22,163,74,0.2)' },
  closed:      { text: '#0D7331', bg: 'rgba(74,222,128,0.06)', bdr: 'rgba(22,163,74,0.2)' },
  blocked:     { text: '#DC2626', bg: 'rgba(248,113,113,0.06)', bdr: 'rgba(220,38,38,0.2)' },
};

const PRIORITY_LEVELS: Record<string, number> = { critical: 4, highest: 4, high: 3, medium: 2, low: 1, lowest: 1 };

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Details' },
  { key: 'activity', label: 'Activity' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface BoardIssueDetailDrawerProps {
  issueId: string | null;
  onClose: () => void;
}

export function BoardIssueDetailDrawer({ issueId, onClose }: BoardIssueDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isVisible, setIsVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data: issue, isLoading } = useQuery({
    queryKey: ['board-issue-detail', issueId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('*')
        .eq('id', issueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!issueId,
  });

  useEffect(() => {
    if (issueId) {
      setIsVisible(false);
      setClosing(false);
      setActiveTab('overview');
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, [issueId]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    if (!issueId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [issueId, handleClose]);

  if (!issueId) return null;

  const statusKey = (issue?.status ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  const pillColors = STATUS_PILL[statusKey] || STATUS_PILL[issue?.status_category] || STATUS_PILL.todo;
  const priorityName = (issue?.priority ?? '').toLowerCase();
  const priorityBars = PRIORITY_LEVELS[priorityName] || 2;
  const source = issue?.issue_key?.startsWith('CAT-') ? 'CAT' : 'JIRA';

  const handleCopyKey = () => {
    if (issue?.issue_key) {
      navigator.clipboard.writeText(issue.issue_key);
      toast.success(`Copied ${issue.issue_key}`);
    }
  };

  const portalContent = (
    <div data-module="initiative-detail-panel">
      {/* Backdrop */}
      <div
        className={`idp-backdrop ${closing ? 'idp-backdrop-exit' : isVisible ? 'idp-backdrop-enter' : ''}`}
        style={{ opacity: isVisible && !closing ? undefined : 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`idp-panel ${closing ? 'idp-panel-exit' : isVisible ? 'idp-panel-enter' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${issue?.issue_key ?? 'issue'}`}
      >
        {/* Top Bar */}
        <div className="idp-topbar">
          <button className="idp-back-btn" onClick={handleClose}>
            <ArrowLeft size={14} /> Back to board
          </button>
          <div className="idp-action-group">
            <button className="idp-action-btn" onClick={handleCopyKey} title="Copy key">
              <Copy size={13} style={{ marginRight: 4 }} /> Copy Key
            </button>
            {issue?.original_url && (
              <a
                href={issue.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="idp-action-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              >
                <ExternalLink size={13} /> Open in Jira
              </a>
            )}
            <div className="idp-divider" />
            <button className="idp-close-btn" onClick={handleClose}><X size={16} /></button>
          </div>
        </div>

        {isLoading || !issue ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--cp-blue)' }} />
          </div>
        ) : (
          <>
            {/* Identity Block */}
            <div className="idp-identity">
              <div className="idp-key-title-row">
                <span className="idp-key-pill">{issue.issue_key}</span>
                <div className="idp-title-editable" style={{ cursor: 'default' }}>
                  {issue.summary || 'Untitled'}
                </div>
              </div>
              <div className="idp-meta-row">
                {/* Status pill */}
                <div className="idp-status-pill" style={{ background: pillColors.bg, border: `1px solid ${pillColors.bdr}` }}>
                  <div className="idp-status-dot" style={{ background: pillColors.text }} />
                  <span style={{ color: pillColors.text }}>{issue.status || 'Unknown'}</span>
                </div>
                {/* Type badge */}
                <div className="idp-type-badge" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <JiraIssueTypeIcon type={issue.issue_type?.toLowerCase() || 'task'} size={16} />
                  <span className="idp-type-label" style={{ color: 'var(--fg-2)' }}>
                    {issue.issue_type || 'Task'}
                  </span>
                </div>
                {/* Source badge */}
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                  background: source === 'JIRA' ? '#E3F0FF' : 'var(--cp-bd-zone)',
                  color: source === 'JIRA' ? '#0052CC' : 'var(--fg-3)',
                }}>
                  {source}
                </span>
                {/* Priority bars */}
                {issue.priority && (
                  <div className="idp-priority-bars">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`idp-priority-bar ${i <= priorityBars ? 'idp-priority-bar--filled' : 'idp-priority-bar--empty'}`} />
                    ))}
                    <span className="idp-priority-label" style={{ textTransform: 'capitalize' }}>{issue.priority}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Bar */}
            <div className="idp-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`idp-tab${activeTab === tab.key ? ' idp-tab--active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="idp-content">
              {activeTab === 'overview' && <OverviewTab issue={issue} />}
              {activeTab === 'details' && <DetailsTab issue={issue} />}
              {activeTab === 'activity' && <ActivityTab issue={issue} />}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}

/* ── Overview Tab ── */
function OverviewTab({ issue }: { issue: any }) {
  const fields = [
    { label: 'Status', value: issue.status },
    { label: 'Priority', value: issue.priority },
    { label: 'Issue Type', value: issue.issue_type },
    { label: 'Assignee', value: issue.assignee_display_name },
    { label: 'Reporter', value: issue.reporter_display_name },
    { label: 'Sprint', value: issue.sprint_name },
    { label: 'Epic / Parent', value: issue.parent_key },
    { label: 'Story Points', value: issue.story_points },
    { label: 'Due Date', value: issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-GB') : null },
    { label: 'Created', value: issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-GB') : null },
  ];

  return (
    <div className="idp-overview">
      {/* Field Grid */}
      <div className="idp-field-grid">
        {fields.map((f, idx) => {
          const isOdd = idx % 2 === 0;
          const isLastRow = idx >= fields.length - 2;
          return (
            <div key={f.label} className={`idp-field-cell ${isOdd ? 'idp-field-cell--odd' : ''} ${isLastRow ? 'idp-field-cell--last' : ''}`}>
              <div className="idp-field-label">{f.label}</div>
              <div className="idp-field-value">
                {f.label === 'Assignee' && f.value ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--cp-blue)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {f.value.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{f.value}</span>
                  </div>
                ) : f.label === 'Reporter' && f.value ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--sem-warning)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {f.value.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{f.value}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 500, color: f.value ? 'var(--fg-1)' : 'var(--fg-4)' }}>
                    {f.value || '—'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Description */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 8, fontFamily: "'Sora', sans-serif" }}>
          Description
        </h3>
        <div style={{
          borderTop: '1px solid var(--divider)', paddingTop: 12,
          fontSize: 13, lineHeight: 1.65, color: issue.description ? 'var(--fg-2)' : 'var(--fg-4)',
          fontStyle: issue.description ? 'normal' : 'italic',
        }}>
          {issue.description || 'Click to add description...'}
        </div>
      </div>

      {/* Comments placeholder */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 8, fontFamily: "'Sora', sans-serif" }}>
          Comments <span style={{ fontWeight: 400, color: 'var(--fg-4)' }}>(0)</span>
        </h3>
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--fg-4)', fontStyle: 'italic', marginBottom: 12 }}>No comments yet.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Add a comment..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6,
                border: '1px solid var(--divider)', fontSize: 13, outline: 'none',
                fontFamily: "'Inter', sans-serif",
              }}
              disabled
            />
            <button style={{
              padding: '8px 16px', borderRadius: 6, border: 'none',
              background: 'rgba(237,237,237,0.53)', color: '#FFFFFF', fontSize: 13, fontWeight: 600,
              cursor: 'not-allowed',
            }}>
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Details Tab ── */
function DetailsTab({ issue }: { issue: any }) {
  const details = [
    { label: 'Issue Key', value: issue.issue_key },
    { label: 'Project Key', value: issue.project_key },
    { label: 'Status Category', value: issue.status_category },
    { label: 'Resolution', value: issue.resolution },
    { label: 'Labels', value: issue.labels ? (Array.isArray(issue.labels) ? issue.labels.join(', ') : issue.labels) : null },
    { label: 'Fix Versions', value: issue.fix_versions ? (typeof issue.fix_versions === 'string' ? issue.fix_versions : JSON.stringify(issue.fix_versions)) : null },
    { label: 'Components', value: issue.components },
    { label: 'Environment', value: issue.environment },
    { label: 'Updated', value: issue.updated_at ? new Date(issue.updated_at).toLocaleString('en-GB') : null },
    { label: 'Jira Updated', value: issue.jira_updated ? new Date(issue.jira_updated).toLocaleString('en-GB') : null },
  ];

  return (
    <div className="idp-overview">
      <div className="idp-field-grid">
        {details.map((f, idx) => {
          const isOdd = idx % 2 === 0;
          const isLastRow = idx >= details.length - 2;
          return (
            <div key={f.label} className={`idp-field-cell ${isOdd ? 'idp-field-cell--odd' : ''} ${isLastRow ? 'idp-field-cell--last' : ''}`}>
              <div className="idp-field-label">{f.label}</div>
              <div className="idp-field-value">
                <span style={{ fontSize: 13, fontWeight: 500, color: f.value ? 'var(--fg-1)' : 'var(--fg-4)', fontFamily: f.label.includes('Key') ? "'JetBrains Mono', monospace" : 'inherit' }}>
                  {f.value || '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Activity Tab ── */
function ActivityTab({ issue }: { issue: any }) {
  return (
    <div className="idp-overview">
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-4)' }}>
        <p style={{ fontSize: 13, fontStyle: 'italic' }}>Activity feed coming soon</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>
          Last synced: {issue.jira_updated ? new Date(issue.jira_updated).toLocaleString('en-GB') : 'Unknown'}
        </p>
      </div>
    </div>
  );
}

export default BoardIssueDetailDrawer;
