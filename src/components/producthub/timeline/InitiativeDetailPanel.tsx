/**
 * Initiative Detail Panel — V3.1 MARAM + Catalyst V11 Carbon Precision
 * 62% width slide-out drawer with 7 tabs
 * Uses idp- namespaced CSS from initiative-detail-panel.css
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, X, Archive, Copy, Trash2,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { DetailTabDetails } from './DetailTabDetails';
import { DetailTabScore } from './DetailTabScore';
import { DetailTabBudget } from './DetailTabBudget';
import { DetailTabRisks } from './DetailTabRisks';
import { DetailTabMilestones } from './DetailTabMilestones';
import { DetailTabAttachments } from './DetailTabAttachments';
import { DetailTabActivity } from './DetailTabActivity';
import { InitiativeLinkedItemsTab } from '@/components/producthub/InitiativeLinkedItemsTab';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import '@/styles/initiative-detail-panel.css';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ── Status color map (MARAM V3.1 Dual Token) — light + dark ── */
const STATUS_PILL_COLORS: Record<string, { text: [string, string]; bg: [string, string]; bdr: [string, string] }> = {
  new_demand:    { text: ['#2563EB', '#7DB8FC'], bg: ['#EFF6FF', 'rgba(37,99,235,0.10)'],  bdr: ['rgba(37,99,235,0.2)', 'rgba(37,99,235,0.25)'] },
  under_review:  { text: ['#9A5402', '#FDE68A'], bg: ['#FFFBEB', 'rgba(251,191,36,0.10)'], bdr: ['rgba(217,119,6,0.2)', 'rgba(251,191,36,0.25)'] },
  approved:      { text: ['#0D7331', '#4ADE80'], bg: ['#F0FDF4', 'rgba(74,222,128,0.10)'], bdr: ['rgba(22,163,74,0.2)', 'rgba(74,222,128,0.25)'] },
  in_progress:   { text: ['#08736B', '#5EEAD4'], bg: ['#F0FDFA', 'rgba(13,148,136,0.10)'], bdr: ['rgba(13,148,136,0.2)', 'rgba(13,148,136,0.25)'] },
  on_hold:       { text: ['#6F6F78', '#A1A1A1'], bg: ['#F1F5F9', '#2E2E2E'],               bdr: ['rgba(113,113,122,0.2)', '#454545'] },
  delivered:     { text: ['#7C3AED', '#C4B5FD'], bg: ['#F5F3FF', 'rgba(124,58,237,0.10)'], bdr: ['rgba(124,58,237,0.2)', 'rgba(124,58,237,0.25)'] },
  closed:        { text: ['#0D7331', '#4ADE80'], bg: ['#F0FDF4', 'rgba(74,222,128,0.10)'], bdr: ['rgba(22,163,74,0.2)', 'rgba(74,222,128,0.25)'] },
  cancelled:     { text: ['#D92525', '#FCA5A5'], bg: ['#FEF2F2', 'rgba(239,68,68,0.10)'],  bdr: ['rgba(220,38,38,0.2)', 'rgba(239,68,68,0.25)'] },
};

/* UI status to DB status mapping */
const UI_TO_DB: Record<string, string> = {
  new: 'new_demand', portfolio_review: 'under_review', technical_validation: 'under_review',
  estimate: 'under_review', demand_approved: 'approved', analysis: 'approved',
  ready_for_development: 'approved', under_implementation: 'in_progress', on_hold: 'on_hold',
  implementation_review: 'in_progress', in_support: 'delivered', done: 'closed', cancelled: 'cancelled',
};

const STATUS_LABELS: Record<string, string> = {
  new_demand: 'New', under_review: 'Under Review', approved: 'Approved',
  in_progress: 'In Progress', on_hold: 'On Hold', delivered: 'Delivered',
  closed: 'Done', cancelled: 'Cancelled',
};

// Type concept removed — every Product Hub item is a Business Request.


const PRIORITY_LEVELS: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'score', label: 'Score' },
  { key: 'budget', label: 'Budget' },
  { key: 'risks', label: 'Risks' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'linked_items', label: 'Linked Items' },
  { key: 'activity', label: 'Activity' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface InitiativeDetailPanelProps {
  initiative: TimelineInitiative;
  initiatives: TimelineInitiative[];
  onClose: () => void;
}

export const InitiativeDetailPanel: React.FC<InitiativeDetailPanelProps> = ({
  initiative,
  initiatives,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isVisible, setIsVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initiative.title);
  const titleRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { openDetail } = useTimelineState();
  const queryClient = useQueryClient();

  // Get DB status for the initiative
  const dbStatus = UI_TO_DB[initiative.status] || initiative.status;
  const rawPill = STATUS_PILL_COLORS[dbStatus] || STATUS_PILL_COLORS.new_demand;
  const di = isDark ? 1 : 0;
  const pillColors = { text: rawPill.text[di], bg: rawPill.bg[di], bdr: rawPill.bdr[di] };
  const statusLabel = STATUS_LABELS[dbStatus] || initiative.status;
  const priority = (initiative as any).priority || 'medium';
  const priorityBars = PRIORITY_LEVELS[priority.toLowerCase()] || 2;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => { setTitleDraft(initiative.title); }, [initiative.title]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClose]);

  // Arrow key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const idx = initiatives.findIndex(i => i.id === initiative.id);
      if (idx === -1) return;
      const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < initiatives.length) {
        openDetail(initiatives[nextIdx].id);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [initiative.id, initiatives, openDetail]);

  // Title save
  const saveTitle = useCallback(async () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === initiative.title) return;
    try {
      const { error } = await typedQuery('ph_initiatives')
        .update({ title: trimmed, updated_at: new Date().toISOString() })
        .eq('id', initiative.id);
      if (error) throw error;
      // Silent auto-save
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
    } catch { toast.error('Failed to save title'); }
  }, [titleDraft, initiative.title, initiative.id, queryClient]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await typedQuery('ph_initiatives')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', initiative.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      toast.success('Initiative deleted', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
      handleClose();
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Clone
  const handleClone = async () => {
    try {
      const { data: existing } = await typedQuery('ph_initiatives')
        .select('initiative_key').order('created_at', { ascending: false }).limit(1);
      let nextNum = 19;
      if (existing?.[0]) {
        const match = existing[0].initiative_key?.match(/MIM-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const { error } = await typedQuery('ph_initiatives').insert({
        title: `${initiative.title} (Copy)`,
        description: initiative.description,
        status: 'new_demand',
        assignee_id: initiative.assignee_id,
        department_id: initiative.department_id,
        target_quarter: initiative.target_quarter,
        initiative_key: `MIM-${String(nextNum).padStart(3, '0')}`,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      toast.success('Initiative cloned', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    } catch { toast.error('Clone failed'); }
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
        ref={panelRef}
        className={`idp-panel ${closing ? 'idp-panel-exit' : isVisible ? 'idp-panel-enter' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${initiative.initiative_key}`}
      >
        {/* Top Bar */}
        <div className="idp-topbar">
          <button className="idp-back-btn" onClick={handleClose}>
            <ArrowLeft size={14} /> Back to list
          </button>
          <div className="idp-action-group">
            <button className="idp-action-btn" onClick={handleClone}>Clone</button>
            <button className="idp-action-btn idp-action-btn--archive" onClick={() => {
              (async () => {
                try {
                  const { error } = await typedQuery('ph_initiatives')
                    .update({ is_archived: !initiative.is_archived, updated_at: new Date().toISOString() })
                    .eq('id', initiative.id);
                  if (error) throw error;
                  queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
                  queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
                  toast.success(initiative.is_archived ? 'Restored' : 'Archived', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
                } catch { toast.error('Failed to archive'); }
              })();
            }}>{initiative.is_archived ? 'Restore' : 'Archive'}</button>
            <button className="idp-action-btn idp-action-btn--delete" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            <div className="idp-divider" />
            <button className="idp-close-btn" onClick={handleClose}><X size={16} /></button>
          </div>
        </div>

        {/* Identity Block */}
        <div className="idp-identity">
          {initiative.is_archived && (
            <div className="idp-archived-banner">
              <Archive size={14} />
              <span>This initiative has been archived</span>
            </div>
          )}
          {/* Key + Title on same line */}
          <div className="idp-key-title-row">
            <span className="idp-key-pill">{initiative.initiative_key}</span>
            {editingTitle ? (
              <input
                ref={titleRef}
                className="idp-title-editable"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
              />
            ) : (
              <div
                className="idp-title-editable"
                onClick={() => { setTitleDraft(initiative.title); setEditingTitle(true); }}
                role="button"
                tabIndex={0}
              >
                {initiative.title}
              </div>
            )}
          </div>
          {/* Meta row: status pill + type badge + priority bars */}
          <div className="idp-meta-row">
            <div
              className="idp-status-pill"
              style={{ background: pillColors.bg, border: `1px solid ${pillColors.bdr}` }}
            >
              <div className="idp-status-dot" style={{ background: pillColors.text }} />
              <span style={{ color: pillColors.text }}>{statusLabel}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <JiraIssueTypeIcon issueType="Feature" size={16} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#36B37E' }}>Business Request</span>
            </div>
            <div className="idp-priority-bars">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`idp-priority-bar ${i <= priorityBars ? 'idp-priority-bar--filled' : 'idp-priority-bar--empty'}`}
                />
              ))}
              <span className="idp-priority-label" style={{ textTransform: 'capitalize' }}>{priority}</span>
            </div>
            {/* Subtle origin tag */}
            {(initiative as any).source === 'catalyst' && (
              <span style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                color: 'var(--fg-3)', background: '#F1F5F9', border: '1px solid var(--divider)',
                borderRadius: 4, padding: '2px 6px', marginLeft: 8, userSelect: 'none',
              }}>
                ✦ Catalyst
              </span>
            )}
            {(initiative as any).source === 'jira' && (
              <span style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                color: 'var(--cp-blue)', background: 'var(--cp-blue-wash)', border: '1px solid #DBEAFE',
                borderRadius: 4, padding: '2px 6px', marginLeft: 8, userSelect: 'none',
              }}>
                ⚡ Jira
              </span>
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
          {activeTab === 'overview' && <DetailTabDetails initiative={initiative} />}
          {activeTab === 'score' && <DetailTabScore initiative={initiative} />}
          {activeTab === 'budget' && <DetailTabBudget initiativeId={initiative.id} />}
          {activeTab === 'risks' && <DetailTabRisks initiativeId={initiative.id} />}
          {activeTab === 'milestones' && <DetailTabMilestones initiativeId={initiative.id} />}
          {activeTab === 'attachments' && <DetailTabAttachments initiativeId={initiative.id} />}
          {activeTab === 'linked_items' && <InitiativeLinkedItemsTab initiative={{ id: initiative.id, initiative_key: initiative.initiative_key }} />}
          {activeTab === 'activity' && <DetailTabActivity initiativeId={initiative.id} />}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Initiative</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{initiative.initiative_key}</strong>? This action uses soft-delete and can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} style={{ backgroundColor: 'var(--sem-danger)' }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return createPortal(portalContent, document.body);
};

export default InitiativeDetailPanel;
