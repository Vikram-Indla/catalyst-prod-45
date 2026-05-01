/**
 * EpicDetailModal — StoryDetailModal-parity layout for Epics
 * Split-pane, resizable, Jira-grade detail view
 * Reads from `epics` table (not ph_issues)
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  X, ChevronDown, Plus, Share2, Trash2, Copy, Check, Loader2,
  MessageSquare, Clock, MoreHorizontal,
} from 'lucide-react';
import {
  IssueIcon, Skel,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  fmtDate, getInitials, getAvatarColor, getStatusCategory,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';
import { EpicStatusDropdown } from './drawer/EpicStatusDropdown';

/* ═══ Animations ═══ */
const ANIM_STYLE_ID = 'epic-modal-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes edm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes edm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes edm-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(s);
}

/* ═══ Types ═══ */
interface EpicDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string | null;
  onEpicChange?: (newEpicId: string) => void;
}

/* ═══ State mapping ═══ */
const EPIC_STATE_DISPLAY: Record<string, { label: string; bg: string; text: string }> = {
  not_started: { label: 'NOT STARTED', bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
  funnel: { label: 'FUNNEL', bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
  analyzing: { label: 'ANALYZING', bg: '#DEEBFF', text: '#0747A6' },
  backlog: { label: 'BACKLOG', bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
  implementing: { label: 'IMPLEMENTING', bg: '#DEEBFF', text: '#0747A6' },
  in_progress: { label: 'IN PROGRESS', bg: '#DEEBFF', text: '#0747A6' },
  validating: { label: 'VALIDATING', bg: '#DEEBFF', text: '#0747A6' },
  deploying: { label: 'DEPLOYING', bg: '#DEEBFF', text: '#0747A6' },
  done: { label: 'DONE', bg: '#E3FCEF', text: '#006644' },
  completed: { label: 'COMPLETED', bg: '#E3FCEF', text: '#006644' },
};

const HEALTH_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: 'On Track', color: '#006644', bg: '#E3FCEF' },
  at_risk: { label: 'At Risk', color: '#974F0C', bg: '#FFF4EC' },
  off_track: { label: 'Off Track', color: '#AE2A19', bg: '#FFECEC' },
};

const DL: React.CSSProperties = { width: 110, flexShrink: 0, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', paddingTop: 5 };
const DV: React.CSSProperties = { flex: 1, fontSize: 13, color: 'var(--ds-text, #172B4D)' };
const DR: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', marginBottom: 14, minHeight: 28 };

const menuItemStyle: React.CSSProperties = {
  width: '100%', padding: '8px 16px', border: 'none', background: 'transparent',
  fontSize: 14, color: 'var(--ds-text, #172B4D)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
};

export function EpicDetailModal({ isOpen, onClose, epicId, onEpicChange }: EpicDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /* ── QUERIES ── */
  const { data: epic, isLoading } = useQuery({
    queryKey: ['epic-detail-modal', epicId], enabled: !!epicId && isOpen,
    queryFn: async () => {
      const { data, error } = await supabase.from('epics').select('*').eq('id', epicId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: ownerProfile } = useQuery({
    queryKey: ['profile', epic?.owner_id], enabled: !!epic?.owner_id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', epic!.owner_id).single();
      return data;
    },
  });

  const { data: program } = useQuery({
    queryKey: ['program-name', epic?.primary_program_id], enabled: !!epic?.primary_program_id,
    queryFn: async () => {
      const { data } = await (supabase as any).from('programs').select('id, name').eq('id', epic!.primary_program_id).single();
      return data;
    },
  });

  const { data: theme } = useQuery({
    queryKey: ['theme-name', epic?.theme_id], enabled: !!epic?.theme_id,
    queryFn: async () => {
      const { data } = await (supabase as any).from('themes').select('id, name').eq('id', epic!.theme_id).single();
      return data;
    },
  });

  /* ── LOCAL STATE ── */
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [titleFocused, setTitleFocused] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const dotsMenuRef = useRef<HTMLDivElement>(null);

  // Resizable splitter
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const el = document.querySelector('[data-edm-scope]') as HTMLElement;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setRightPanelWidth(Math.max(220, Math.min(480, rect.right - e.clientX)));
    };
    const onMouseUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) setShowDotsMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showDotsMenu && !showConfirmDelete) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, showDotsMenu, showConfirmDelete, onClose]);

  /* ── MUTATIONS ── */
  const updateMutation = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!epicId) throw new Error('No epic ID');
      const { error } = await supabase.from('epics').update(patch).eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-detail-modal', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['program-epics'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
    },
    onError: () => toast.error('Failed to save epic'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('epics').update({ deleted_at: new Date().toISOString() }).eq('id', epicId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic deleted');
      onClose();
    },
    onError: () => toast.error('Failed to delete epic'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!epic) throw new Error('No epic');
      const { data, error } = await supabase.from('epics').insert([{
        name: `${epic.name} (Copy)`,
        description: epic.description || null,
        primary_program_id: epic.primary_program_id || null,
        theme_id: epic.theme_id || null,
        health: epic.health || null,
        owner_id: epic.owner_id || null,
        mvp: false,
        state: 'not_started',
      }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newEpic) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Epic duplicated');
      onEpicChange?.(newEpic.id);
    },
    onError: () => toast.error('Failed to duplicate'),
  });

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/program/${epic?.primary_program_id}/epic-backlog?epicId=${epicId}`;
    navigator.clipboard.writeText(url);
    toast('Link copied to clipboard');
  }, [epic?.primary_program_id, epicId]);

  if (!isOpen) return null;

  const stateKey = (epic?.state ?? epic?.status ?? 'not_started') as string;
  const stateDisplay = EPIC_STATE_DISPLAY[stateKey] ?? { label: stateKey?.toUpperCase() ?? '—', bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' };
  const healthDisplay = HEALTH_DISPLAY[(epic?.health ?? '') as string];

  return (
    <>
      {/* OVERLAY */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          background: 'rgba(9, 30, 66, 0.54)',
          padding: '40px 16px', overflowY: 'auto',
          animation: 'edm-overlay-in 200ms ease-out',
        }}
        onClick={onClose}
      >
        <div
          data-edm-scope
          style={{
            width: 1100, maxWidth: '95vw', minHeight: 600, maxHeight: 'calc(100vh - 80px)',
            background: 'var(--ds-surface, #FFFFFF)', borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
            overflow: 'hidden', animation: 'edm-card-in 250ms ease-out',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── A. TOP BAR ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', minHeight: 44, flexShrink: 0,
            borderBottom: '1px solid #EBECF0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#42526E' }}>
              <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 14, fontWeight: 500, color: '#42526E' }}>
                {program?.name ?? 'Program'}
              </span>
              <span style={{ color: '#C1C7D0' }}>/</span>
              <IssueIcon type="Epic" size={16} />
              <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 14, fontWeight: 600, color: '#0052CC' }}>
                {epic?.epic_key ?? '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={handleShare} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
                borderRadius: 4, color: '#42526E', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s', fontFamily: 'var(--cp-font-body)',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              ><Share2 size={16} /> <span>Share</span></button>
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={{
                  background: showDotsMenu ? 'var(--ds-surface-sunken, #F4F5F7)' : 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                  borderRadius: 4, color: '#42526E', display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
                  onMouseLeave={e => { if (!showDotsMenu) e.currentTarget.style.background = 'none'; }}
                ><MoreHorizontal size={18} /></button>
                {showDotsMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 36, background: 'var(--ds-surface, #FFF)', border: '1px solid #DFE1E6', borderRadius: 6, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '6px 0', zIndex: 50, minWidth: 200, animation: 'edm-slide-down 0.15s ease-out' }}>
                    <button onClick={() => { setShowDotsMenu(false); duplicateMutation.mutate(); }} style={menuItemStyle}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><Copy size={14} style={{ marginRight: 8, display: 'inline' }} /> Duplicate epic</button>
                    <div style={{ height: 1, background: '#EBECF0', margin: '6px 0' }} />
                    <button onClick={() => { setShowDotsMenu(false); setShowConfirmDelete(true); }} style={{ ...menuItemStyle, color: '#DE350B' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FFEBE6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><Trash2 size={14} style={{ marginRight: 8, display: 'inline' }} /> Delete epic</button>
                  </div>
                )}
              </div>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                borderRadius: 4, color: '#42526E', display: 'flex', alignItems: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#42526E'; }}
              ><X size={18} /></button>
            </div>
          </div>

          {/* ── B. BODY — two-column ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* LEFT PANEL */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px 32px 24px',
              borderRight: '1px solid #EBECF0', minWidth: 0,
            }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} /><div style={{ height: 20 }} /><Skel w="100%" h={200} />
                </div>
              ) : (
                <>
                  {/* TITLE */}
                  <h1
                    contentEditable suppressContentEditableWarning
                    onFocus={() => setTitleFocused(true)}
                    onBlur={e => {
                      setTitleFocused(false);
                      const newTitle = e.currentTarget.textContent?.trim() ?? '';
                      if (newTitle && newTitle !== epic?.name) updateMutation.mutate({ name: newTitle });
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                      if (e.key === 'Escape') { e.currentTarget.textContent = epic?.name ?? ''; e.currentTarget.blur(); }
                    }}
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontSize: 22, fontWeight: 700, color: 'var(--ds-text, #172B4D)', lineHeight: 1.3,
                      margin: '0 0 12px', outline: 'none', cursor: 'text', borderRadius: 3,
                      padding: '4px 6px', wordBreak: 'break-word', transition: 'background 0.15s, box-shadow 0.15s',
                      background: titleFocused ? 'var(--ds-surface, #FFFFFF)' : 'transparent',
                      boxShadow: titleFocused ? '0 0 0 2px #4C9AFF' : 'none',
                    }}
                    onMouseEnter={e => { if (!titleFocused) e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                    onMouseLeave={e => { if (!titleFocused) e.currentTarget.style.background = 'transparent'; }}
                  >{epic?.name ?? '—'}</h1>

                  {/* KEY DETAILS — collapsible */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text, #172B4D)' }}>Key details</span>
                    </div>
                    <div>
                      <div style={DR}>
                        <span style={DL}>Status</span>
                        <div style={DV}>
                          <EpicStatusDropdown
                            currentStatus={epic?.status}
                            onChange={(status) => updateMutation.mutate({ status })}
                          />
                        </div>
                      </div>
                      <div style={DR}>
                        <span style={DL}>State</span>
                        <div style={DV}>
                          <span style={{
                            display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                            borderRadius: 3, padding: '0 6px', background: stateDisplay.bg, color: stateDisplay.text,
                          }}>{stateDisplay.label}</span>
                        </div>
                      </div>
                      {epic?.health && healthDisplay && (
                        <div style={DR}>
                          <span style={DL}>Health</span>
                          <div style={DV}>
                            <span style={{
                              display: 'inline-block', fontSize: 12, fontWeight: 600,
                              padding: '2px 8px', borderRadius: 3,
                              background: healthDisplay.bg, color: healthDisplay.color,
                            }}>{healthDisplay.label}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text, #172B4D)', marginBottom: 10 }}>Description</div>
                    <div
                      contentEditable suppressContentEditableWarning
                      onBlur={e => {
                        const newDesc = e.currentTarget.innerText?.trim() ?? '';
                        if (newDesc !== (epic?.description ?? '')) updateMutation.mutate({ description: newDesc || null });
                      }}
                      style={{
                        minHeight: 120, padding: '12px 14px', border: '1px solid #DFE1E6',
                        borderRadius: 4, fontSize: 14, color: 'var(--ds-text, #172B4D)', lineHeight: 1.7,
                        outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; e.currentTarget.style.boxShadow = '0 0 0 1px #4C9AFF'; }}
                      onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--ds-border, #DFE1E6)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {epic?.description || ''}
                    </div>
                  </div>

                  {/* ACTIVITY SECTION */}
                  <div style={{ borderTop: '1px solid #EBECF0', paddingTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text, #172B4D)' }}>Activity</span>
                      <div style={{ display: 'flex', background: 'var(--ds-surface-sunken, #F4F5F7)', borderRadius: 4, overflow: 'hidden' }}>
                        {(['details', 'comments', 'history'] as const).map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '5px 14px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
                            color: activeTab === tab ? 'var(--ds-text, #172B4D)' : '#5E6C84', border: 'none', cursor: 'pointer',
                            background: activeTab === tab ? 'var(--ds-surface, #FFFFFF)' : 'transparent',
                            borderRadius: activeTab === tab ? 4 : 0,
                            boxShadow: activeTab === tab ? '0 1px 3px rgba(9,30,66,0.1)' : 'none',
                            fontFamily: 'inherit', transition: 'all 0.15s',
                          }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
                        ))}
                      </div>
                    </div>

                    {activeTab === 'details' && (
                      <div style={{ fontSize: 14, color: '#42526E', lineHeight: 1.6 }}>
                        <div style={DR}>
                          <span style={DL}>MVP</span>
                          <span style={DV}>{epic?.mvp ? 'Yes' : 'No'}</span>
                        </div>
                        <div style={DR}>
                          <span style={DL}>Points Est.</span>
                          <span style={DV}>{epic?.points_estimate ?? '—'}</span>
                        </div>
                        <div style={DR}>
                          <span style={DL}>Start Date</span>
                          <span style={DV}>{fmtDate(epic?.start_date)}</span>
                        </div>
                        <div style={DR}>
                          <span style={DL}>End Date</span>
                          <span style={DV}>{fmtDate(epic?.end_date)}</span>
                        </div>
                        <div style={DR}>
                          <span style={DL}>Target Complete</span>
                          <span style={DV}>{fmtDate(epic?.target_completion_date)}</span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'comments' && (
                      <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>
                        Comments coming soon
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>
                        History coming soon
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* RESIZABLE SPLITTER */}
            <div
              onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
              style={{
                width: 6, minWidth: 6, cursor: 'col-resize', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
              onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 1.5, height: 32, borderRadius: 1, background: 'var(--ds-border, #DFE1E6)' }} />
            </div>

            {/* RIGHT PANEL — Key Details sidebar */}
            <div style={{
              width: rightPanelWidth, minWidth: 220, maxWidth: 480,
              background: 'var(--ds-surface, #FFFFFF)', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            }}>
              {/* Status pill */}
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  display: 'inline-block', padding: '6px 12px', borderRadius: 4,
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  background: stateDisplay.bg, color: stateDisplay.text,
                }}>{stateDisplay.label}</span>
              </div>

              {/* Detail rows */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Details
              </div>

              {/* Owner/Assignee */}
              <div style={DR}>
                <span style={DL}>Owner</span>
                <div style={{ ...DV, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ownerProfile ? (
                    <>
                      {ownerProfile.avatar_url ? (
                        <img src={ownerProfile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(ownerProfile.id), color: 'var(--ds-surface, #FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(ownerProfile.full_name)}
                        </div>
                      )}
                      <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>{ownerProfile.full_name}</span>
                    </>
                  ) : (
                    <span style={{ color: '#97A0AF' }}>Unassigned</span>
                  )}
                </div>
              </div>

              {/* Health */}
              {healthDisplay && (
                <div style={DR}>
                  <span style={DL}>Health</span>
                  <div style={DV}>
                    <span style={{
                      display: 'inline-block', fontSize: 12, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 3,
                      background: healthDisplay.bg, color: healthDisplay.color,
                    }}>{healthDisplay.label}</span>
                  </div>
                </div>
              )}

              {/* Program */}
              <div style={DR}>
                <span style={DL}>Program</span>
                <span style={DV}>{program?.name ?? '—'}</span>
              </div>

              {/* Theme */}
              <div style={DR}>
                <span style={DL}>Theme</span>
                <span style={DV}>{theme?.name ?? '—'}</span>
              </div>

              {/* MVP */}
              <div style={DR}>
                <span style={DL}>MVP</span>
                <span style={DV}>{epic?.mvp ? 'Yes' : 'No'}</span>
              </div>

              {/* Points */}
              <div style={DR}>
                <span style={DL}>Story Points</span>
                <span style={{ ...DV, fontFamily: 'var(--cp-font-mono)', fontSize: 13 }}>
                  {epic?.points_estimate ?? '—'}
                </span>
              </div>

              {/* Dates */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8 }}>
                Dates
              </div>

              <div style={DR}>
                <span style={DL}>Start Date</span>
                <span style={{ ...DV, fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: '#42526E' }}>{fmtDate(epic?.start_date)}</span>
              </div>
              <div style={DR}>
                <span style={DL}>End Date</span>
                <span style={{ ...DV, fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: '#42526E' }}>{fmtDate(epic?.end_date)}</span>
              </div>
              <div style={DR}>
                <span style={DL}>Target</span>
                <span style={{ ...DV, fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: '#42526E' }}>{fmtDate(epic?.target_completion_date)}</span>
              </div>

              {/* Timestamps */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8 }}>
                Metadata
              </div>
              <div style={DR}>
                <span style={DL}>Created</span>
                <span style={{ ...DV, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>{fmtDate(epic?.created_at)}</span>
              </div>
              <div style={DR}>
                <span style={DL}>Updated</span>
                <span style={{ ...DV, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>{fmtDate(epic?.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(9, 30, 66, 0.4)',
        }} onClick={() => setShowConfirmDelete(false)}>
          <div style={{
            width: 480, background: 'var(--ds-surface, #FFFFFF)', borderRadius: 8, padding: 24,
            boxShadow: '0 8px 32px rgba(9,30,66,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text, #172B4D)', marginBottom: 8, fontFamily: 'var(--cp-font-heading)' }}>Delete epic?</h3>
            <p style={{ fontSize: 14, color: '#42526E', marginBottom: 20, lineHeight: 1.5 }}>
              This will soft-delete <strong>{epic?.epic_key}</strong> — "{epic?.name}". This action can be undone by an administrator.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfirmDelete(false)} style={{
                padding: '8px 16px', borderRadius: 4, border: '1px solid #DFE1E6',
                background: 'var(--ds-surface, #FFFFFF)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#42526E',
              }}>Cancel</button>
              <button onClick={() => { deleteMutation.mutate(); setShowConfirmDelete(false); }} style={{
                padding: '8px 16px', borderRadius: 4, border: 'none',
                background: '#DE350B', color: 'var(--ds-surface, #FFFFFF)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}