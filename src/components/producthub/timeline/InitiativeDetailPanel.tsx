import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Paperclip, Copy, Link2, Star, Trash2, DollarSign, AlertTriangle, Flag, Link as LinkIcon, ClipboardList, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { STATUS_CONFIG } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { DetailTabDetails } from './DetailTabDetails';
import { DetailTabScore } from './DetailTabScore';
import { DetailTabPlaceholder } from './DetailTabPlaceholder';
import { InitiativeRisksTab } from '@/components/initiatives/tabs/InitiativeRisksTab';
import { InitiativeBudgetTab } from '@/components/initiatives/tabs/InitiativeBudgetTab';
import { InitiativeAuditTab } from '@/components/initiatives/tabs/InitiativeAuditTab';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAvatarColor, getInitials } from '@/types/initiative';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'score', label: 'Score' },
  { key: 'budget', label: 'Budget' },
  { key: 'risks', label: 'Risks' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'links', label: 'Links' },
  { key: 'audit', label: 'Audit' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface InitiativeDetailPanelProps {
  initiative: TimelineInitiative;
  initiatives: TimelineInitiative[];
  onClose: () => void;
}

/* ---- Comments Section ---- */
function CommentsSection({ initiativeId }: { initiativeId: string }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['pk-comments', initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('ph_comments')
        .select('id, body, author_id, created_at, updated_at')
        .eq('work_item_id', initiativeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const authorIds: string[] = (data || []).map((c: any) => c.author_id).filter(Boolean);
      const uniqueAuthorIds = Array.from(new Set(authorIds));
      let authorMap: Record<string, string> = {};
      if (uniqueAuthorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uniqueAuthorIds);
        if (profiles) profiles.forEach((p: any) => { authorMap[p.id] = p.full_name; });
      }
      return (data || []).map((c: any) => ({ ...c, author_name: authorMap[c.author_id] || 'Unknown' }));
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from('ph_comments').insert({
        work_item_id: initiativeId,
        work_item_type: 'initiative',
        body: newComment.trim(),
        author_id: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['pk-comments', initiativeId] });
      setNewComment('');
      toast.success('Comment added');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('ph_comments').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['pk-comments', initiativeId] });
    toast.success('Comment deleted');
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--pk-border, #E4E4E7)' }}>
      <h3 className="pk-section-heading">Comments</h3>
      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--pk-ink-muted)' }}>Loading…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--pk-ink-muted)', fontStyle: 'italic' }}>No comments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {comments.map((c: any) => (
            <div key={c.id} className="pk-comment">
              <div className="pk-card-avatar" style={{ backgroundColor: getAvatarColor(c.author_name), width: 28, height: 28, fontSize: 10 }}>
                {getInitials(c.author_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="pk-comment-author">{c.author_name}</span>
                  <span className="pk-comment-time">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <div className="pk-comment-body">{c.body}</div>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--pk-ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5 }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Write a comment…"
          className="pk-comment-input"
          disabled={submitting}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          className="pk-comment-send"
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export const InitiativeDetailPanel: React.FC<InitiativeDetailPanelProps> = ({
  initiative,
  initiatives,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isVisible, setIsVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [budgetAllocated, setBudgetAllocated] = useState(0);
  const handleBudgetChange = useCallback((value: string) => {
    setBudgetAllocated(Number(value) || 0);
  }, []);
  const panelRef = useRef<HTMLDivElement>(null);
  const { openDetail } = useTimelineState();
  const queryClient = useQueryClient();

  const statusCfg = STATUS_CONFIG[initiative.status];

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClose]);

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

  useEffect(() => {
    if (panelRef.current) {
      const firstFocusable = panelRef.current.querySelector<HTMLElement>('button, [tabindex]');
      firstFocusable?.focus();
    }
  }, []);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('ph_initiatives')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', initiative.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      toast.success('Initiative deleted');
      handleClose();
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Clone mutation
  const handleClone = async () => {
    try {
      const { data: existing } = await (supabase as any).from('ph_initiatives')
        .select('initiative_key').order('created_at', { ascending: false }).limit(1);
      let nextNum = 19;
      if (existing?.[0]) {
        const match = existing[0].initiative_key?.match(/MIM-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const { error } = await (supabase as any).from('ph_initiatives').insert({
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
      toast.success('Initiative cloned');
    } catch { toast.error('Clone failed'); }
  };

  const portalContent = (
    <div data-module="product-kanban">
      {/* Backdrop */}
      <div
        className="pk-panel-backdrop"
        style={{
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="pk-panel"
        style={{
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease-out',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${initiative.initiative_key}`}
      >
        {/* Top bar */}
        <div className="pk-panel-top">
          <button className="pk-panel-back" onClick={handleClose}>
            <ChevronLeft size={14} /> Back to board
          </button>
          <button className="pk-panel-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={12} /> Delete
          </button>
          <button className="pk-panel-close" onClick={handleClose}>
            <X size={14} />
          </button>
        </div>

        {/* Identity */}
        <div className="pk-panel-identity">
          <span className="pk-panel-key">{initiative.initiative_key}</span>
          <h2 className="pk-panel-title">{initiative.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="pk-status"
              style={{
                color: statusCfg.color,
                backgroundColor: statusCfg.bg,
                border: `1px solid ${statusCfg.color}33`,
              }}
            >
              <span className="pk-status-dot" style={{ backgroundColor: statusCfg.color }} />
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pk-panel-actions">
          <button className="pk-panel-action-btn" onClick={() => setActiveTab('details')}>
            <Pencil size={14} /> Edit
          </button>
          <button className="pk-panel-action-btn" onClick={() => toast.info('Attach coming soon')}>
            <Paperclip size={14} /> Attach
          </button>
          <button className="pk-panel-action-btn" onClick={handleClone}>
            <Copy size={14} /> Clone
          </button>
          <button className="pk-panel-action-btn" onClick={() => toast.info('Link coming soon')}>
            <Link2 size={14} /> Link
          </button>
          <button className="pk-panel-action-btn" onClick={() => setActiveTab('score')}>
            <Star size={14} /> Score
          </button>
        </div>

        {/* Tabs */}
        <div className="pk-panel-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pk-panel-tab${activeTab === tab.key ? ' pk-panel-tab--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="pk-panel-body">
          {activeTab === 'details' && (
            <>
              <DetailTabDetails initiative={initiative} />
              <CommentsSection initiativeId={initiative.id} />
            </>
          )}
          {activeTab === 'score' && <DetailTabScore initiative={initiative} />}
          {activeTab === 'budget' && <InitiativeBudgetTab initiativeId={initiative.id} budgetAllocated={budgetAllocated} onBudgetAllocatedChange={setBudgetAllocated} />}
          {activeTab === 'risks' && <InitiativeRisksTab initiativeId={initiative.id} />}
          {activeTab === 'milestones' && <DetailTabPlaceholder icon={Flag} label="Milestones" />}
          {activeTab === 'links' && <DetailTabPlaceholder icon={LinkIcon} label="Links" />}
          {activeTab === 'audit' && <InitiativeAuditTab initiativeId={initiative.id} />}
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
            <AlertDialogAction onClick={() => deleteMutation.mutate()} style={{ backgroundColor: 'var(--pk-danger, #DC2626)' }}>
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
