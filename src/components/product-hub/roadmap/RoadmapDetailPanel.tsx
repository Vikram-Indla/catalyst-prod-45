/**
 * Product Roadmap — Redesigned Detail Panel (420px)
 * Editable: dates, progress, priority, status, type, owner
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Paperclip, Copy, Link2, Star, Trash2, Calendar, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInMonths, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RoadmapInitiative } from './types/roadmap.types';
import { TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS, INK, SURFACE, FONT, DETAIL_PANEL_WIDTH } from './constants/roadmap.constants';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { User } from 'lucide-react';

interface RoadmapDetailPanelProps {
  item: RoadmapInitiative | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACTIONS = [
  { icon: Pencil, label: 'Edit' },
  { icon: Paperclip, label: 'Attach' },
  { icon: Copy, label: 'Clone' },
  { icon: Link2, label: 'Link' },
  { icon: Star, label: 'Star' },
  { icon: Trash2, label: 'Delete', danger: true },
];

const TABS = ['Details', 'Score', 'Budget', 'Risks', 'Milestones', 'Links'];

const STATUS_OPTIONS = [
  { value: 'new_demand', label: 'Planned' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'delivered', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P0 — Critical', uiLabel: 'P0' },
  { value: 2, label: 'P1 — High', uiLabel: 'P1' },
  { value: 3, label: 'P2 — Medium', uiLabel: 'P2' },
];

const TYPE_OPTIONS = [
  { key: 'project', label: 'Project', typeId: 'fdb2fd4a-23dc-48bb-b4a0-e8741a572aee' },
  { key: 'enhancement', label: 'Enhancement', typeId: '00242328-979a-4ecb-8f02-5d3b982966d1' },
  { key: 'improvement', label: 'Improvement', typeId: '90806dac-3ed5-4f99-a11e-290dc0efd376' },
];

// Avatar color — deterministic from name (enterprise-approved palette)
const AVATAR_COLORS = ['#475569', '#334155', '#2563EB', '#0D9488', '#D97706', '#0891B2', '#16A34A', '#334155'];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

export function RoadmapDetailPanel({ item, isOpen, onClose }: RoadmapDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('Details');
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: approvedProfiles } = useApprovedProfiles();

  const teamMembers = useMemo(() => {
    return (approvedProfiles || []).map(p => ({
      value: p.id,
      label: p.name,
      avatarUrl: p.avatarUrl || null,
      initials: p.initials,
      color: hashColor(p.name),
    }));
  }, [approvedProfiles]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('Details');
      setEditingProgress(false);
      setShowStatusDropdown(false);
      setShowPriorityDropdown(false);
      setShowTypeDropdown(false);
      setShowOwnerDropdown(false);
    }
  }, [item?.id, isOpen]);

  useEffect(() => {
    if (item) setProgressValue(item.progress);
  }, [item?.id, item?.progress]);

  const saveField = useCallback(async (updates: Record<string, any>, fieldName: string) => {
    if (!item) return;
    setSaving(fieldName);
    try {
      const { error } = await (supabase as any)
        .from('ph_initiatives')
        .update(updates)
        .eq('id', item.rawDbId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-stats'] });
      toast.success(`${fieldName} updated`);
    } catch (err: any) {
      toast.error(`Failed to update ${fieldName}: ${err.message}`);
    } finally {
      setSaving(null);
    }
  }, [item, queryClient]);

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const getDuration = () => {
    if (!item) return '';
    try {
      const s = parseISO(item.startDate);
      const e = parseISO(item.endDate);
      const months = differenceInMonths(e, s);
      if (months > 0) return `${months} month${months > 1 ? 's' : ''} duration`;
      const days = differenceInDays(e, s);
      return `${days} day${days !== 1 ? 's' : ''} duration`;
    } catch { return ''; }
  };

  const typeColor = item ? TYPE_COLORS[item.type]?.solid || '#94A3B8' : '#94A3B8';
  const typeLight = item ? TYPE_COLORS[item.type]?.light || '#F8FAFC' : '#F8FAFC';
  const typeLabel = item ? TYPE_COLORS[item.type]?.label || item.type : '';

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.12)', zIndex: 999,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease-out',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: DETAIL_PANEL_WIDTH, maxWidth: '90vw',
          backgroundColor: '#FFFFFF', borderLeft: `1px solid ${SURFACE.border}`,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.1)', zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.2s ease-out',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: FONT.body,
        }}
      >
        {item && (
          <>
            {/* ═══ HEADER ═══ */}
            <div style={{ padding: '24px 24px 0' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Type badge */}
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: typeLight, color: typeColor,
                  }}>
                    {typeLabel}
                  </span>
                  {/* Title */}
                  <h2 style={{
                    fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em',
                    lineHeight: 1.3, marginTop: 10, marginBottom: 0,
                  }}>
                    {item.titleEn}
                  </h2>
                  {/* Arabic subtitle */}
                  {item.titleAr && item.titleAr !== item.titleEn && (
                    <p dir="rtl" style={{ fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
                      {item.titleAr}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${SURFACE.border}`, background: SURFACE.page, color: INK[3],
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {/* Initiative key */}
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 11, fontFamily: FONT.mono, color: '#94A3B8',
                  background: '#F8FAFC', padding: '2px 8px', borderRadius: 3,
                }}>
                  {item.initiativeKey}
                </span>
              </div>
            </div>

            {/* ═══ ACTION BAR ═══ */}
            <div className="flex items-center gap-0.5" style={{ padding: '10px 24px', borderBottom: `1px solid ${SURFACE.borderLight}` }}>
              {ACTIONS.map(a => (
                <button
                  key={a.label}
                  className="flex items-center gap-1"
                  style={{
                    padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent',
                    color: INK[3], fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = (a as any).danger ? '#FEF2F2' : SURFACE.page;
                    e.currentTarget.style.color = (a as any).danger ? '#EF4444' : INK[2];
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = INK[3];
                  }}
                >
                  <a.icon size={14} />
                  {a.label}
                </button>
              ))}
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex" style={{ padding: '0 24px', borderBottom: `1px solid ${SURFACE.border}` }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 14px', fontSize: 13,
                    fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? '#2563EB' : INK[3],
                    background: 'none', border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                    cursor: 'pointer', marginBottom: -1,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ═══ CONTENT ═══ */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
              {activeTab === 'Details' && (
                <div>
                  {/* KEY METRICS — 2×2 grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                    {/* Priority */}
                    <MetricCard label="Priority" onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: PRIORITY_COLORS[item.priority]?.color || INK[2] }}>
                        {item.priority}
                      </span>
                      <ChevronDown size={12} style={{ color: INK[4], marginLeft: 4 }} />
                      {showPriorityDropdown && (
                        <Dropdown
                          options={PRIORITY_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
                          onSelect={val => {
                            setShowPriorityDropdown(false);
                            saveField({ roadmap_priority: Number(val) }, 'Priority');
                          }}
                          onClose={() => setShowPriorityDropdown(false)}
                        />
                      )}
                    </MetricCard>

                    {/* Status */}
                    <MetricCard label="Status" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                      <span className="flex items-center gap-1.5">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[item.status]?.color || INK[3] }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: STATUS_COLORS[item.status]?.color || INK[2] }}>
                          {item.status}
                        </span>
                      </span>
                      <ChevronDown size={12} style={{ color: INK[4], marginLeft: 4 }} />
                      {showStatusDropdown && (
                        <Dropdown
                          options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                          onSelect={val => {
                            setShowStatusDropdown(false);
                            saveField({ status: val }, 'Status');
                          }}
                          onClose={() => setShowStatusDropdown(false)}
                        />
                      )}
                    </MetricCard>

                    {/* Progress */}
                    <MetricCard label="Progress" onClick={() => setEditingProgress(true)}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: typeColor }}>
                        {item.progress}%
                      </span>
                    </MetricCard>

                    {/* Type */}
                    <MetricCard label="Type" onClick={() => setShowTypeDropdown(!showTypeDropdown)}>
                      <span className="flex items-center gap-1.5">
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: typeColor }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: typeColor }}>{typeLabel}</span>
                      </span>
                      <ChevronDown size={12} style={{ color: INK[4], marginLeft: 4 }} />
                      {showTypeDropdown && (
                        <Dropdown
                          options={TYPE_OPTIONS.map(o => ({ value: o.typeId, label: o.label }))}
                          onSelect={val => {
                            setShowTypeDropdown(false);
                            saveField({ initiative_type_id: val }, 'Type');
                          }}
                          onClose={() => setShowTypeDropdown(false)}
                        />
                      )}
                    </MetricCard>
                  </div>

                  {/* PROGRESS BAR */}
                  <div style={{ marginBottom: 24 }}>
                    <div className="flex justify-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: INK[2] }}>Progress</span>
                      {editingProgress ? (
                        <input
                          type="number"
                          min={0} max={100}
                          value={progressValue}
                          onChange={e => setProgressValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                          onBlur={() => {
                            setEditingProgress(false);
                            if (progressValue !== item.progress) {
                              saveField({ progress: progressValue }, 'Progress');
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              setEditingProgress(false);
                              if (progressValue !== item.progress) {
                                saveField({ progress: progressValue }, 'Progress');
                              }
                            }
                          }}
                          autoFocus
                          style={{
                            width: 48, fontSize: 12, fontWeight: 700, color: typeColor,
                            border: `1px solid ${SURFACE.border}`, borderRadius: 4, padding: '1px 4px',
                            textAlign: 'right', outline: 'none',
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => setEditingProgress(true)}
                          style={{ fontSize: 12, fontWeight: 700, color: typeColor, cursor: 'pointer' }}
                        >
                          {item.progress}%
                        </span>
                      )}
                    </div>
                    <div style={{ height: 6, background: SURFACE.borderLight, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${editingProgress ? progressValue : item.progress}%`,
                        background: `linear-gradient(90deg, ${typeColor}, ${typeColor}cc)`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* OWNER */}
                  <div style={{ borderTop: `1px solid ${SURFACE.borderLight}`, padding: '14px 0', position: 'relative' }}>
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                    >
                      {(() => {
                        const ownerProfile = teamMembers.find(m => m.value === item.rawAssigneeId);
                        const avatarUrl = ownerProfile?.avatarUrl;
                        const ownerColor = ownerProfile?.color || item.ownerColor;
                        const ownerInit = ownerProfile?.initials || item.ownerInitials;
                        if (avatarUrl) {
                          return (
                            <img
                              src={avatarUrl}
                              alt={item.ownerName}
                              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          );
                        }
                        return (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: item.ownerName === 'Unassigned' ? '#94A3B8' : ownerColor,
                            color: '#FFF', fontSize: 12, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {ownerInit}
                          </div>
                        );
                      })()}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                          {item.ownerName === 'Unassigned' ? (
                            <span style={{ color: '#2563EB' }}>Assign owner</span>
                          ) : item.ownerName}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Owner</div>
                      </div>
                      <ChevronDown size={14} style={{ color: INK[4], marginLeft: 'auto' }} />
                    </div>
                    {showOwnerDropdown && (
                      <OwnerDropdown
                        options={teamMembers}
                        onSelect={val => {
                          setShowOwnerDropdown(false);
                          saveField({ assignee_id: val }, 'Owner');
                        }}
                        onClose={() => setShowOwnerDropdown(false)}
                      />
                    )}
                  </div>

                  {/* TIMELINE — Start & End dates */}
                  <div style={{ borderTop: `1px solid ${SURFACE.borderLight}`, padding: '14px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: INK[2], marginBottom: 10 }}>Timeline</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* Start Date */}
                      <DateField
                        label="Start Date"
                        value={item.startDate}
                        onSave={date => saveField({ roadmap_start_date: date }, 'Start Date')}
                      />
                      {/* End Date */}
                      <DateField
                        label="End Date"
                        value={item.hasRealEndDate ? item.endDate : null}
                        onSave={date => saveField({ roadmap_end_date: date }, 'End Date')}
                        warning={!item.hasRealEndDate}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{getDuration()}</div>
                  </div>

                  {/* MILESTONES */}
                  {item.milestones.length > 0 && (
                    <div style={{ borderTop: `1px solid ${SURFACE.borderLight}`, padding: '14px 0' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: INK[2], marginBottom: 8 }}>Milestones</div>
                      {item.milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-2 py-1">
                          <span style={{
                            width: 8, height: 8, borderRadius: 1, transform: 'rotate(45deg)',
                            background: m.completed ? '#16A34A' : typeColor, flexShrink: 0,
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: INK[2], flex: 1 }}>{m.title}</span>
                          <span style={{ fontSize: 11, color: INK[4] }}>{fmtDate(m.targetDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Arabic Title */}
                  {item.titleAr && item.titleAr !== item.titleEn && (
                    <div style={{ borderTop: `1px solid ${SURFACE.borderLight}`, padding: '14px 0' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: INK[4], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Arabic Title</div>
                      <div dir="rtl" style={{ fontSize: 14, color: INK[2], lineHeight: 1.6 }}>{item.titleAr}</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab !== 'Details' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK[2], marginBottom: 4 }}>{activeTab}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Coming soon</div>
                </div>
              )}
            </div>

            {/* Saving indicator */}
            {saving && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: '#0F172A', color: '#FFF', padding: '6px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 500, zIndex: 10,
              }}>
                Saving {saving}…
              </div>
            )}
          </>
        )}
      </div>
    </>,
    document.body
  );
}

/* ═══ MetricCard ═══ */
function MetricCard({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#F8FAFC', borderRadius: 8, padding: '12px 14px',
        border: `1px solid ${SURFACE.borderLight}`, cursor: onClick ? 'pointer' : 'default',
        position: 'relative', transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = SURFACE.border; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = SURFACE.borderLight; }}
    >
      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

/* ═══ Dropdown ═══ */
function Dropdown({ options, onSelect, onClose }: {
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
        background: '#FFFFFF', border: `1px solid ${SURFACE.border}`, borderRadius: 8,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
      }}
    >
      {options.map(o => (
        <div
          key={o.value}
          onClick={e => { e.stopPropagation(); onSelect(o.value); }}
          style={{
            padding: '8px 12px', fontSize: 13, color: INK[1], cursor: 'pointer',
            borderBottom: `1px solid ${SURFACE.borderLight}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          {o.label}
        </div>
      ))}
    </div>
  );
}

/* ═══ OwnerDropdown — with avatars ═══ */
interface OwnerOption {
  value: string;
  label: string;
  avatarUrl: string | null;
  initials: string;
  color: string;
}

function OwnerDropdown({ options, onSelect, onClose }: {
  options: OwnerOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
        background: '#FFFFFF', border: `1px solid ${SURFACE.border}`, borderRadius: 8,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', maxHeight: 280, overflowY: 'auto',
      }}
    >
      {options.map(o => (
        <div
          key={o.value}
          onClick={e => { e.stopPropagation(); onSelect(o.value); }}
          className="flex items-center gap-3"
          style={{
            padding: '8px 12px', fontSize: 13, color: INK[1], cursor: 'pointer',
            borderBottom: `1px solid ${SURFACE.borderLight}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          {o.avatarUrl ? (
            <img
              src={o.avatarUrl}
              alt={o.label}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: o.color, color: '#FFF', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {o.initials}
            </div>
          )}
          <span style={{ fontWeight: 500 }}>{o.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ DateField ═══ */
function DateField({ label, value, onSave, warning }: {
  label: string;
  value: string | null;
  onSave: (date: string) => void;
  warning?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const formatted = format(date, 'yyyy-MM-dd');
    onSave(formatted);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          style={{
            padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
            border: warning ? '1.5px solid #D97706' : `1px solid ${SURFACE.borderLight}`,
            background: warning ? '#FFFBEB' : 'transparent',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={e => { if (!warning) e.currentTarget.style.borderColor = SURFACE.border; }}
          onMouseLeave={e => { if (!warning) e.currentTarget.style.borderColor = SURFACE.borderLight; }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
            {label}
          </div>
          {value ? (
            <div className="flex items-center gap-1">
              <Calendar size={12} style={{ color: INK[3] }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: INK[1] }}>{format(parseISO(value), 'MMM d, yyyy')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <AlertTriangle size={12} style={{ color: '#D97706' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>Set {label.toLowerCase()}</span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 1100 }}>
        <CalendarPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
