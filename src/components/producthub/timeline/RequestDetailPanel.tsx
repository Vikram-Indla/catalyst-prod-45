/**
 * Request Detail Panel — V3.1 MARAM + Catalyst V11 Carbon Precision
 * 62% width slide-out drawer with 7 tabs.
 *
 * Atlaskit migration (Apr 2026): internal primitives swapped to ADS where
 * direct equivalents exist. Drawer shell + slide animations remain on the
 * `idp-*` CSS namespace because no Atlaskit primitive provides a 62%-width
 * right-side slide-out. Migrated:
 *   - Tab bar         → @atlaskit/tabs
 *   - Status pill     → @ads StatusLozenge
 *   - Title editor    → @ads InlineEdit + @ads Textfield
 *   - Delete confirm  → @ads Modal (replaces shadcn AlertDialog)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X, Archive, Link2, Share2, Eye } from 'lucide-react';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  StatusLozenge,
  InlineEdit,
  Textfield,
  toStatusCategory,
} from '@/components/ads';
import { BusinessRequestBadge } from '@/components/producthub/shared/BusinessRequestBadge';
import type { TimelineRequest } from '@/types/producthub/request';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { DetailTabDetails } from './DetailTabDetails';
import { DetailTabScore } from './DetailTabScore';
import { DetailTabBudget } from './DetailTabBudget';
import { DetailTabRisks } from './DetailTabRisks';
import { DetailTabMilestones } from './DetailTabMilestones';
import { DetailTabAttachments } from './DetailTabAttachments';
import { DetailTabActivity } from './DetailTabActivity';
import { RequestLinkedItemsTab } from '@/components/producthub/RequestLinkedItemsTab';
import { typedQuery, supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import '@/styles/request-detail-panel.css';

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

interface RequestDetailPanelProps {
  request: TimelineRequest;
  requests: TimelineRequest[];
  onClose: () => void;
}

export const RequestDetailPanel: React.FC<RequestDetailPanelProps> = ({
  request,
  requests,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isVisible, setIsVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const { openDetail } = useTimelineState();
  const queryClient = useQueryClient();

  // Status → StatusLozenge category
  const dbStatus = UI_TO_DB[request.status] || request.status;
  const statusLabel = STATUS_LABELS[dbStatus] || request.status;
  const statusCategory = toStatusCategory(dbStatus);

  const priority = (request as any).priority || 'medium';
  const priorityBars = PRIORITY_LEVELS[priority.toLowerCase()] || 2;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

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
      const idx = requests.findIndex(i => i.id === request.id);
      if (idx === -1) return;
      const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < requests.length) {
        openDetail(requests[nextIdx].id);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [request.id, requests, openDetail]);

  // Title save (commit from InlineEdit)
  const saveTitle = useCallback(async (next: string) => {
    const trimmed = (next ?? '').trim();
    if (!trimmed || trimmed === request.title) return;
    try {
      const { error } = await typedQuery('ph_requests')
        .update({ title: trimmed, updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      // Silent auto-save
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['ph-requests'] });
    } catch { toast.error('Failed to save title'); }
  }, [request.title, request.id, queryClient]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await typedQuery('ph_requests')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      toast.success('Business Request deleted', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
      setShowDeleteConfirm(false);
      handleClose();
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Clone
  const handleClone = async () => {
    try {
      const { data: existing } = await typedQuery('ph_requests')
        .select('initiative_key').order('created_at', { ascending: false }).limit(1);
      let nextNum = 19;
      if (existing?.[0]) {
        const match = existing[0].initiative_key?.match(/MIM-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const { error } = await typedQuery('ph_requests').insert({
        title: `${request.title} (Copy)`,
        description: request.description,
        status: 'new_demand',
        assignee_id: request.assignee_id,
        department_id: request.department_id,
        target_quarter: request.target_quarter,
        initiative_key: `MIM-${String(nextNum).padStart(3, '0')}`,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      toast.success('Business Request cloned', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    } catch { toast.error('Clone failed'); }
  };

  /* ── Watchers — Catalyst-canonical, on `ph_request_watchers` ── */
  const { data: watcherInfo } = useQuery({
    queryKey: ['ph-request-watchers', request.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      const { data: rows } = await typedQuery('ph_request_watchers')
        .select('user_id')
        .eq('request_id', request.id);
      const list = (rows ?? []) as Array<{ user_id: string }>;
      return {
        count: list.length,
        watching: !!userId && list.some(r => r.user_id === userId),
        userId,
      };
    },
    staleTime: 30_000,
  });

  const watcherToggle = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('Sign in required to watch');
      if (watcherInfo?.watching) {
        const { error } = await typedQuery('ph_request_watchers')
          .delete()
          .eq('request_id', request.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await typedQuery('ph_request_watchers')
          .insert({ request_id: request.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-request-watchers', request.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not update watch state');
    },
  });

  /**
   * Permalink — Jira-parity affordance. Copies the current URL with
   * `?selectedInitiative=<key>` to the clipboard. Surface owns its own
   * URL routing today; this button reflects whatever route the user
   * arrived at.
   */
  const handleCopyPermalink = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('selectedInitiative', request.initiative_key);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success('Permalink copied', {
        duration: 1800,
        style: { background: '#18181B', color: '#fff' },
        position: 'bottom-center',
      });
    } catch {
      toast.error('Could not copy permalink');
    }
  }, [request.initiative_key]);

  /**
   * Share — opens the native OS share sheet on supporting devices,
   * otherwise falls back to copying the permalink. Mirrors the share
   * affordance on Jira's detail panel right cluster.
   */
  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('selectedInitiative', request.initiative_key);
    const shareData = {
      title: request.title,
      text: `${request.initiative_key} — ${request.title}`,
      url: url.toString(),
    };
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: typeof shareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: typeof shareData) => Promise<void> }).share(shareData);
        return;
      } catch {
        // user cancelled OR not allowed in this browser context — fall through to clipboard
      }
    }
    handleCopyPermalink();
  }, [request.initiative_key, request.title, handleCopyPermalink]);

  const handleArchiveToggle = async () => {
    try {
      const { error } = await typedQuery('ph_requests')
        .update({ is_archived: !request.is_archived, updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['ph-requests'] });
      toast.success(request.is_archived ? 'Restored' : 'Archived', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    } catch { toast.error('Failed to archive'); }
  };

  // Tab index sync (Atlaskit Tabs uses index, we keep TabKey for content switch)
  const activeTabIndex = TABS.findIndex(t => t.key === activeTab);

  const portalContent = (
    <div data-module="request-detail-panel">
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
        aria-label={`Details for ${request.initiative_key}`}
      >
        {/* Top Bar */}
        <div className="idp-topbar">
          <button className="idp-back-btn" onClick={handleClose} aria-label="Back to list">
            <ArrowLeft size={14} />
          </button>
          {/*
            Breadcrumb — Jira-parity navigation context. Static today
            (every request lives under Product Hub > Backlog), but
            structured so the segments can become real <Link>s when the
            ProductHub IA gets richer (department or quarter sub-pages).
          */}
          <nav
            className="idp-breadcrumbs"
            aria-label="Breadcrumb"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--cp-text-secondary, #6B6E76)',
              fontFamily: 'var(--cp-font-body)', minWidth: 0, flex: 1,
              marginLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontWeight: 500 }}>Product Hub</span>
            <span aria-hidden="true">/</span>
            <span style={{ fontWeight: 500 }}>Backlog</span>
            <span aria-hidden="true">/</span>
            <span style={{ fontWeight: 600, color: 'var(--cp-text-primary, #292A2E)' }}>
              {request.initiative_key}
            </span>
          </nav>
          <div className="idp-action-group">
            {/* Watchers — wired to ph_request_watchers. Eye icon
                fills when current user is watching; click toggles. */}
            <button
              className="idp-action-btn"
              onClick={() => watcherToggle.mutate()}
              disabled={watcherToggle.isPending}
              aria-pressed={!!watcherInfo?.watching}
              aria-label={watcherInfo?.watching ? 'Stop watching' : 'Start watching'}
              title={watcherInfo?.watching ? 'Stop watching' : 'Watch this request'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: watcherInfo?.watching ? '#0C66E4' : undefined,
              }}
            >
              <Eye
                size={14}
                fill={watcherInfo?.watching ? '#0C66E4' : 'none'}
              />
              <span style={{ fontSize: 12 }}>{watcherInfo?.count ?? 0}</span>
            </button>
            {/* Share — native share sheet; falls back to clipboard */}
            <button
              className="idp-action-btn"
              onClick={handleShare}
              aria-label="Share"
              title="Share"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Share2 size={14} />
            </button>
            {/* Permalink — copy current URL with selectedInitiative param */}
            <button
              className="idp-action-btn"
              onClick={handleCopyPermalink}
              aria-label="Copy permalink"
              title="Copy permalink"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Link2 size={14} />
            </button>
            <div className="idp-divider" />
            <button className="idp-action-btn" onClick={handleClone}>Clone</button>
            <button className="idp-action-btn idp-action-btn--archive" onClick={handleArchiveToggle}>
              {request.is_archived ? 'Restore' : 'Archive'}
            </button>
            <button className="idp-action-btn idp-action-btn--delete" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            <div className="idp-divider" />
            <button className="idp-close-btn" onClick={handleClose}><X size={16} /></button>
          </div>
        </div>

        {/* Identity Block */}
        <div className="idp-identity">
          {request.is_archived && (
            <div className="idp-archived-banner">
              <Archive size={14} />
              <span>This business request has been archived</span>
            </div>
          )}
          {/* Key + Title — Title uses Atlaskit InlineEdit */}
          <div className="idp-key-title-row">
            <span className="idp-key-pill">{request.initiative_key}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <InlineEdit<string>
                label="Title"
                value={request.title}
                defaultValue=""
                hideActionButtons
                readView={() => (
                  <div className="idp-title-editable">
                    {request.title}
                  </div>
                )}
                editView={({ value, onChange, onBlur, ...rest }) => (
                  <Textfield
                    autoFocus
                    value={value ?? ''}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                    onBlur={onBlur}
                    aria-label={rest['aria-label']}
                  />
                )}
                onConfirm={(next) => saveTitle(next)}
              />
            </div>
          </div>
          {/* Meta row: status lozenge + business request badge + priority bars */}
          <div className="idp-meta-row">
            <StatusLozenge status={statusCategory}>{statusLabel}</StatusLozenge>
            <BusinessRequestBadge iconSize={16} fontSize={12} />
            <div className="idp-priority-bars">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`idp-priority-bar ${i <= priorityBars ? 'idp-priority-bar--filled' : 'idp-priority-bar--empty'}`}
                />
              ))}
              <span className="idp-priority-label" style={{ textTransform: 'capitalize' }}>{priority}</span>
            </div>
            {/*
              Source-of-record chips ("✦ Catalyst" / "⚡ Jira") removed —
              every request is Catalyst-canonical now per the
              "no Jira data inflow" decision. Provenance no longer drives
              the panel chrome; the field stays on the row for legacy
              callers but the surface treats every request uniformly.
            */}
          </div>
        </div>

        {/* Tabs — Atlaskit @atlaskit/tabs */}
        <div className="idp-tabs">
          <Tabs
            id="request-detail-tabs"
            selected={activeTabIndex < 0 ? 0 : activeTabIndex}
            onChange={(idx) => setActiveTab(TABS[idx].key)}
          >
            <TabList>
              {TABS.map(tab => (
                <Tab key={tab.key}>{tab.label}</Tab>
              ))}
            </TabList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="idp-content">
          {activeTab === 'overview' && <DetailTabDetails request={request} />}
          {activeTab === 'score' && <DetailTabScore request={request} />}
          {activeTab === 'budget' && <DetailTabBudget requestId={request.id} />}
          {activeTab === 'risks' && <DetailTabRisks requestId={request.id} />}
          {activeTab === 'milestones' && <DetailTabMilestones requestId={request.id} />}
          {activeTab === 'attachments' && <DetailTabAttachments requestId={request.id} />}
          {activeTab === 'linked_items' && <RequestLinkedItemsTab request={{ id: request.id, initiative_key: request.initiative_key }} />}
          {activeTab === 'activity' && <DetailTabActivity requestId={request.id} />}
        </div>
      </div>

      {/* Delete confirmation — Atlaskit Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        width="small"
      >
        <ModalHeader>
          <ModalTitle>Delete Business Request</ModalTitle>
        </ModalHeader>
        <ModalBody>
          Are you sure you want to delete <strong>{request.initiative_key}</strong>? This action uses soft-delete and can be reversed.
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button appearance="danger" onClick={() => deleteMutation.mutate()} isDisabled={deleteMutation.isPending}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );

  return createPortal(portalContent, document.body);
};

export default RequestDetailPanel;
