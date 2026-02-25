/**
 * Product Roadmap — Catalyst V11 Detail Panel (460px)
 * High-contrast rebuild with Sora/Inter/JetBrains Mono tokens.
 * All database wiring preserved: dates, progress, priority, status, type, owner.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO, differenceInMonths, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RoadmapInitiative } from './types/roadmap.types';
import { TYPE_COLORS } from './constants/roadmap.constants';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';

// ═══════════════════════════════════════════════════════════
// Catalyst V11 — Design Tokens
// ═══════════════════════════════════════════════════════════
const CP = {
  primary60: '#2563EB', primary70: '#1D4ED8', primary80: '#1E3A8A',
  primary10: '#DBEAFE', primary5: '#EFF6FF',
  teal60: '#0D9488', teal70: '#0F766E', teal5: '#F0FDFA',
  warning60: '#D97706', warning70: '#B45309', warning5: '#FFFBEB',
  danger60: '#DC2626', danger5: '#FEF2F2',
  success60: '#16A34A',
  purple60: '#7C3AED', purple5: '#F5F3FF',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textTertiary: '#475569',
  textMuted: '#64748B',
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',
  borderSubtle: '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderStrong: '#94A3B8',
  shadowSm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
  shadowMd: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  radiusSm: 4, radiusMd: 6, radiusLg: 8, radiusXl: 12, radiusFull: 9999,
  fontHeading: "'Sora', -apple-system, 'Segoe UI', system-ui, sans-serif",
  fontBody: "'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
  sp1: 4, sp2: 8, sp3: 12, sp4: 16, sp5: 20, sp6: 24, sp8: 32,
};

// ═══════════════════════════════════════════════════════════
// SVG Icons (inline, no deps)
// ═══════════════════════════════════════════════════════════
const Ico = {
  close: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>,
  attach: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  clone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  starFill: <svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  chev: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  warn: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
};

const ACTIONS_DEF = [
  { icon: 'edit', label: 'Edit' },
  { icon: 'attach', label: 'Attach' },
  { icon: 'clone', label: 'Clone' },
  { icon: 'link', label: 'Link' },
  { icon: 'star', label: 'Star' },
  { icon: 'trash', label: 'Delete' },
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

const TYPE_FALLBACK_OPTIONS = [
  { value: 'fdb2fd4a-23dc-48bb-b4a0-e8741a572aee', label: 'Project' },
  { value: '00242328-979a-4ecb-8f02-5d3b982966d1', label: 'Enhancement' },
  { value: '90806dac-3ed5-4f99-a11e-290dc0efd376', label: 'Improvement' },
  { value: '8ee93370-21e5-4464-92d1-3e51839067cd', label: 'Entity Integration' },
  
];

const STATUS_PILL: Record<string, { color: string; bg: string }> = {
  Planned: { color: CP.primary70, bg: CP.primary10 },
  Active: { color: CP.teal70, bg: CP.teal5 },
  Completed: { color: CP.success60, bg: '#F0FDF4' },
  Cancelled: { color: CP.danger60, bg: CP.danger5 },
  'On Hold': { color: CP.warning60, bg: CP.warning5 },
  'Under Review': { color: CP.purple60, bg: CP.purple5 },
  Approved: { color: CP.teal60, bg: CP.teal5 },
};

const PRIORITY_PILL: Record<string, string> = {
  P0: CP.danger60, P1: CP.warning60, P2: CP.primary60,
};

// Avatar helpers
const AVATAR_COLORS = ['#475569', '#334155', '#2563EB', '#0D9488', '#D97706', '#0891B2', '#16A34A', '#334155'];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

interface RoadmapDetailPanelProps {
  item: RoadmapInitiative | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoadmapDetailPanel({ item, isOpen, onClose }: RoadmapDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('Details');
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [starred, setStarred] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: approvedProfiles } = useApprovedProfiles();
  const { data: initiativeTypeOptions = [] } = useQuery({
    queryKey: ['initiative-type-options'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('initiative_types')
        .select('id, key, label')
        .order('label', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({ value: row.id as string, label: row.label as string }));
    },
    staleTime: 5 * 60 * 1000,
  });

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
      setStarred(item?.starred || false);
      setTimeout(() => setMounted(true), 20);
    } else {
      setMounted(false);
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

  const typeColor = item ? TYPE_COLORS[item.type]?.solid || CP.borderStrong : CP.borderStrong;
  const typeLabel = item ? TYPE_COLORS[item.type]?.label || item.type : '';
  const statusInfo = STATUS_PILL[item?.status || ''] || { color: CP.textSecondary, bg: CP.bgTertiary };
  const priorityColor = PRIORITY_PILL[item?.priority || ''] || CP.textSecondary;

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
          width: 460, maxWidth: '90vw',
          display: 'flex', flexDirection: 'column',
          background: CP.bgPrimary, borderLeft: `1px solid ${CP.borderDefault}`,
          fontFamily: CP.fontBody, color: CP.textPrimary,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
          WebkitFontSmoothing: 'antialiased',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
        }}
      >
        {item && (
          <>
            {/* Accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${typeColor}, ${typeColor}55, transparent 70%)`,
              zIndex: 1,
            }} />

            {/* ═══ HEADER ═══ */}
            <div style={{ padding: `${CP.sp5}px ${CP.sp6}px 0`, flexShrink: 0 }}>
              {/* Badge + Close */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: CP.sp3 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: typeColor,
                  background: TYPE_COLORS[item.type]?.light || CP.primary5,
                  border: `1.5px solid ${typeColor}44`,
                  borderRadius: CP.radiusMd, fontFamily: CP.fontBody,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: typeColor }} />
                  {typeLabel}
                </span>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${CP.borderDefault}`, borderRadius: CP.radiusMd,
                    background: CP.bgPrimary, cursor: 'pointer', color: CP.textSecondary,
                  }}
                >{Ico.close}</button>
              </div>

              {/* Title — Sora, near-black */}
              <h2 style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.3, margin: 0, marginBottom: CP.sp2,
                fontFamily: CP.fontHeading, color: CP.textPrimary, letterSpacing: '-0.02em',
              }}>{item.titleEn}</h2>

              {/* Arabic subtitle */}
              {item.titleAr && item.titleAr !== item.titleEn && (
                <p dir="rtl" style={{ fontSize: 14, color: CP.textMuted, margin: 0, marginBottom: CP.sp2 }}>
                  {item.titleAr}
                </p>
              )}

              {/* ID */}
              <div style={{ marginBottom: CP.sp4 }}>
                <code style={{
                  fontSize: 12, fontWeight: 600, color: CP.textSecondary,
                  background: CP.bgTertiary, padding: '4px 10px', borderRadius: CP.radiusSm,
                  fontFamily: CP.fontMono, letterSpacing: '0.03em',
                  border: `1px solid ${CP.borderDefault}`,
                }}>{item.initiativeKey}</code>
              </div>

              {/* Action toolbar */}
              <div style={{
                display: 'flex', gap: 2, padding: CP.sp1,
                background: CP.bgSecondary, border: `1px solid ${CP.borderDefault}`,
                borderRadius: CP.radiusLg, marginBottom: CP.sp4,
              }}>
                {ACTIONS_DEF.map(a => (
                  <V11ActionBtn
                    key={a.label}
                    icon={a.icon}
                    label={a.label}
                    danger={a.label === 'Delete'}
                    active={a.label === 'Star' && starred}
                    onClick={() => {
                      if (a.label === 'Star') setStarred(!starred);
                    }}
                  />
                ))}
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex', borderBottom: `2px solid ${CP.borderSubtle}`,
                marginLeft: -CP.sp6, marginRight: -CP.sp6,
                paddingLeft: CP.sp6, paddingRight: CP.sp6, overflowX: 'auto',
              }}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: `${CP.sp3}px ${CP.sp4}px`, fontSize: 13,
                    fontWeight: activeTab === t ? 700 : 500, fontFamily: CP.fontBody,
                    color: activeTab === t ? CP.primary60 : CP.textSecondary,
                    background: 'transparent', border: 'none',
                    borderBottom: activeTab === t ? `2.5px solid ${CP.primary60}` : '2.5px solid transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -2,
                  }}>{t}</button>
                ))}
              </div>
            </div>

            {/* ═══ SCROLLABLE BODY ═══ */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: `${CP.sp5}px ${CP.sp6}px ${CP.sp8}px`,
              opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(6px)',
              transition: 'all 350ms cubic-bezier(0.4,0,0.2,1)',
            }}>
              {activeTab === 'Details' && (
                <div>
                  {/* ROW 1: Priority + Status */}
                  <div style={{ display: 'flex', gap: CP.sp2, marginBottom: CP.sp3 }}>
                    <V11FieldCard label="Priority" onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}>
                      <span style={{ color: priorityColor, fontWeight: 800, fontSize: 15 }}>{item.priority}</span>
                      <span style={{ color: CP.textTertiary, fontSize: 11, fontWeight: 500 }}>{Ico.chev}</span>
                      {showPriorityDropdown && (
                        <V11Dropdown
                          options={PRIORITY_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
                          onSelect={val => {
                            setShowPriorityDropdown(false);
                            saveField({ roadmap_priority: Number(val) }, 'Priority');
                          }}
                          onClose={() => setShowPriorityDropdown(false)}
                        />
                      )}
                    </V11FieldCard>

                    <V11FieldCard label="Status" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: statusInfo.color,
                        boxShadow: `0 0 0 3px ${statusInfo.color}25`, flexShrink: 0,
                      }} />
                      <span style={{ color: statusInfo.color, fontWeight: 700, fontSize: 15 }}>{item.status}</span>
                      <span style={{ color: CP.textTertiary, fontSize: 11 }}>{Ico.chev}</span>
                      {showStatusDropdown && (
                        <V11Dropdown
                          options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                          onSelect={val => {
                            setShowStatusDropdown(false);
                            saveField({ status: val }, 'Status');
                          }}
                          onClose={() => setShowStatusDropdown(false)}
                        />
                      )}
                    </V11FieldCard>
                  </div>

                  {/* ROW 2: Progress + Type */}
                  <div style={{ display: 'flex', gap: CP.sp2, marginBottom: CP.sp5 }}>
                    <V11FieldCard label="Progress" onClick={() => setEditingProgress(true)}>
                      {editingProgress ? (
                        <input
                          type="number"
                          min={0} max={100}
                          value={progressValue}
                          onChange={e => setProgressValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                          onBlur={() => {
                            setEditingProgress(false);
                            if (progressValue !== item.progress) saveField({ progress: progressValue }, 'Progress');
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              setEditingProgress(false);
                              if (progressValue !== item.progress) saveField({ progress: progressValue }, 'Progress');
                            }
                          }}
                          autoFocus
                          style={{
                            width: 48, fontSize: 15, fontWeight: 800, color: CP.primary60,
                            border: `1px solid ${CP.borderDefault}`, borderRadius: CP.radiusSm,
                            padding: '1px 4px', textAlign: 'right', outline: 'none',
                            fontFamily: CP.fontMono,
                          }}
                        />
                      ) : (
                        <span style={{
                          color: CP.primary60, fontWeight: 800, fontSize: 15,
                          fontFamily: CP.fontMono, fontVariantNumeric: 'tabular-nums',
                        }}>{item.progress}%</span>
                      )}
                    </V11FieldCard>

                    <V11FieldCard label="Type" onClick={() => setShowTypeDropdown(!showTypeDropdown)}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: typeColor, flexShrink: 0 }} />
                      <span style={{ color: CP.textPrimary, fontWeight: 700, fontSize: 15 }}>{typeLabel}</span>
                      <span style={{ color: CP.textTertiary, fontSize: 11 }}>{Ico.chev}</span>
                      {showTypeDropdown && (
                        <V11Dropdown
                          options={initiativeTypeOptions.length > 0 ? initiativeTypeOptions : TYPE_FALLBACK_OPTIONS}
                          onSelect={val => {
                            setShowTypeDropdown(false);
                            saveField({ initiative_type_id: val }, 'Type');
                          }}
                          onClose={() => setShowTypeDropdown(false)}
                        />
                      )}
                    </V11FieldCard>
                  </div>

                  {/* PROGRESS BAR */}
                  <div style={{
                    padding: CP.sp4, background: CP.bgSecondary,
                    border: `1px solid ${CP.borderDefault}`, borderRadius: CP.radiusLg,
                    marginBottom: CP.sp5,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: CP.sp2,
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: CP.textPrimary, fontFamily: CP.fontBody,
                      }}>Progress</span>
                      <span style={{
                        fontSize: 14, fontWeight: 800, color: CP.primary60,
                        fontFamily: CP.fontMono, fontVariantNumeric: 'tabular-nums',
                      }}>{editingProgress ? progressValue : item.progress}%</span>
                    </div>
                    <div style={{
                      height: 8, background: CP.borderSubtle, borderRadius: CP.radiusFull, overflow: 'hidden',
                      border: `1px solid ${CP.borderDefault}`,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(1.5, editingProgress ? progressValue : item.progress)}%`,
                        background: `linear-gradient(90deg, ${CP.primary60}, ${CP.teal60})`,
                        borderRadius: CP.radiusFull,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* DIVIDER */}
                  <div style={{ height: 1, background: CP.borderDefault, marginBottom: CP.sp5 }} />

                  {/* OWNER */}
                  <div
                    onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: CP.sp3,
                      padding: CP.sp3, background: CP.bgSecondary,
                      border: `1px solid ${CP.borderDefault}`, borderRadius: CP.radiusLg,
                      marginBottom: CP.sp5, cursor: 'pointer', position: 'relative',
                    }}
                  >
                    {(() => {
                      const ownerProfile = teamMembers.find(m => m.value === item.rawAssigneeId);
                      const avatarUrl = ownerProfile?.avatarUrl;
                      const ownerColor = ownerProfile?.color || hashColor(item.ownerName);
                      const ownerInit = ownerProfile?.initials || getInitials(item.ownerName);

                      if (avatarUrl) {
                        return (
                          <img
                            src={avatarUrl}
                            alt={item.ownerName}
                            style={{
                              width: 42, height: 42, borderRadius: CP.radiusFull,
                              objectFit: 'cover', flexShrink: 0,
                              boxShadow: `0 2px 8px ${ownerColor}40`,
                            }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        );
                      }
                      return (
                        <div style={{
                          width: 42, height: 42, borderRadius: CP.radiusFull,
                          background: item.ownerName === 'Unassigned'
                            ? CP.borderStrong
                            : `linear-gradient(135deg, ${ownerColor}, ${ownerColor}cc)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: CP.fontHeading,
                          boxShadow: `0 2px 8px ${ownerColor}40`, flexShrink: 0,
                        }}>
                          {ownerInit}
                        </div>
                      );
                    })()}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: CP.textPrimary, fontFamily: CP.fontBody,
                      }}>
                        {item.ownerName === 'Unassigned' ? (
                          <span style={{ color: CP.primary60 }}>Assign owner</span>
                        ) : item.ownerName}
                      </div>
                      <div style={{ fontSize: 12, color: CP.textTertiary, fontWeight: 600 }}>Owner</div>
                    </div>
                    <span style={{ color: CP.textSecondary }}>{Ico.chev}</span>
                    {showOwnerDropdown && (
                      <V11OwnerDropdown
                        options={teamMembers}
                        onSelect={val => {
                          setShowOwnerDropdown(false);
                          saveField({ assignee_id: val }, 'Owner');
                        }}
                        onClose={() => setShowOwnerDropdown(false)}
                      />
                    )}
                  </div>

                  {/* TIMELINE */}
                  <div style={{ marginBottom: CP.sp5 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: CP.textPrimary,
                      marginBottom: CP.sp3, fontFamily: CP.fontBody,
                    }}>Timeline</div>

                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center', gap: CP.sp3, padding: CP.sp4,
                      background: CP.bgSecondary, border: `1px solid ${CP.borderDefault}`,
                      borderRadius: CP.radiusLg,
                    }}>
                      {/* Start Date */}
                      <V11DateField
                        label="Start Date"
                        value={item.startDate}
                        onSave={date => saveField({ roadmap_start_date: date }, 'Start Date')}
                        align="left"
                      />

                      {/* Arrow */}
                      <div style={{
                        width: 28, height: 28, borderRadius: CP.radiusFull,
                        background: CP.bgTertiary, border: `1.5px solid ${CP.borderDefault}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: CP.textSecondary,
                      }}>{Ico.arrow}</div>

                      {/* End Date */}
                      <V11DateField
                        label="End Date"
                        value={item.hasRealEndDate ? item.endDate : null}
                        onSave={date => saveField({ roadmap_end_date: date }, 'End Date')}
                        align="right"
                        warning={!item.hasRealEndDate}
                      />
                    </div>

                    {/* Duration pill */}
                    {getDuration() && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: CP.sp2 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: CP.teal70,
                          background: CP.teal5, border: `1.5px solid ${CP.teal60}33`,
                          padding: '4px 14px', borderRadius: CP.radiusFull,
                        }}>{getDuration()}</span>
                      </div>
                    )}
                  </div>

                  {/* MILESTONES */}
                  {item.milestones.length > 0 && (
                    <div style={{
                      borderTop: `1px solid ${CP.borderDefault}`, paddingTop: CP.sp4, marginBottom: CP.sp5,
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: CP.textPrimary,
                        marginBottom: CP.sp3, fontFamily: CP.fontBody,
                      }}>Milestones</div>
                      {item.milestones.map(m => (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: CP.sp2,
                          padding: `${CP.sp1}px 0`,
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: 1, transform: 'rotate(45deg)',
                            background: m.completed ? CP.success60 : typeColor, flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 13, fontWeight: 600, color: CP.textPrimary, flex: 1,
                            textDecoration: m.completed ? 'line-through' : 'none',
                          }}>{m.title}</span>
                          <span style={{
                            fontSize: 11, color: CP.textTertiary, fontFamily: CP.fontMono,
                          }}>{fmtDate(m.targetDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Arabic Title */}
                  {item.titleAr && item.titleAr !== item.titleEn && (
                    <div style={{
                      borderTop: `1px solid ${CP.borderDefault}`, paddingTop: CP.sp4,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: CP.textTertiary,
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
                      }}>Arabic Title</div>
                      <div dir="rtl" style={{ fontSize: 14, color: CP.textSecondary, lineHeight: 1.6 }}>
                        {item.titleAr}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab !== 'Details' && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '40px 20px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: CP.textPrimary, marginBottom: 4 }}>
                    {activeTab}
                  </div>
                  <div style={{ fontSize: 12, color: CP.textMuted }}>Coming soon</div>
                </div>
              )}
            </div>

            {/* Saving toast */}
            {saving && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: CP.textPrimary, color: '#FFF', padding: '6px 16px', borderRadius: CP.radiusLg,
                fontSize: 12, fontWeight: 600, zIndex: 10, fontFamily: CP.fontBody,
                boxShadow: CP.shadowMd,
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

// ═══════════════════════════════════════════════════════════
// V11 Sub-components
// ═══════════════════════════════════════════════════════════

function V11ActionBtn({ icon, label, danger, active, onClick }: {
  icon: string; label: string; danger?: boolean; active?: boolean; onClick?: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2, padding: '7px 0', fontFamily: CP.fontBody,
        fontSize: 11, fontWeight: 500,
        color: active ? CP.warning60 : danger && h ? CP.danger60 : h ? CP.textPrimary : CP.textSecondary,
        background: h ? (danger ? CP.danger5 : CP.bgTertiary) : 'transparent',
        border: 'none', borderRadius: CP.radiusMd, cursor: 'pointer',
        transition: 'all 120ms ease',
      }}
    >
      {active && icon === 'star' ? Ico.starFill : (Ico as any)[icon]}
      <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

function V11FieldCard({ label, children, onClick }: {
  label: string; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, padding: CP.sp3,
        background: CP.bgSecondary,
        border: `1px solid ${CP.borderDefault}`,
        borderRadius: CP.radiusLg,
        minWidth: 0, cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 600, color: CP.textTertiary,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 14, fontWeight: 700, color: CP.textPrimary,
      }}>{children}</div>
    </div>
  );
}

function V11Dropdown({ options, onSelect, onClose }: {
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
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
        background: CP.bgPrimary, border: `1px solid ${CP.borderDefault}`, borderRadius: CP.radiusLg,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
      }}
    >
      {options.map(o => (
        <div
          key={o.value}
          onClick={e => { e.stopPropagation(); onSelect(o.value); }}
          style={{
            padding: '8px 12px', fontSize: 13, fontWeight: 500, color: CP.textPrimary,
            cursor: 'pointer', borderBottom: `1px solid ${CP.borderSubtle}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = CP.bgSecondary)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = CP.bgPrimary)}
        >
          {o.label}
        </div>
      ))}
    </div>
  );
}

interface OwnerOption {
  value: string;
  label: string;
  avatarUrl: string | null;
  initials: string;
  color: string;
}

function V11OwnerDropdown({ options, onSelect, onClose }: {
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
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
        background: CP.bgPrimary, border: `1px solid ${CP.borderDefault}`, borderRadius: CP.radiusLg,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', maxHeight: 280, overflowY: 'auto',
      }}
    >
      {options.map(o => (
        <div
          key={o.value}
          onClick={e => { e.stopPropagation(); onSelect(o.value); }}
          style={{
            display: 'flex', alignItems: 'center', gap: CP.sp3,
            padding: '8px 12px', fontSize: 13, fontWeight: 500, color: CP.textPrimary,
            cursor: 'pointer', borderBottom: `1px solid ${CP.borderSubtle}`,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = CP.bgSecondary)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = CP.bgPrimary)}
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
          <span style={{ fontWeight: 600 }}>{o.label}</span>
        </div>
      ))}
    </div>
  );
}

function V11DateField({ label, value, onSave, align = 'left', warning }: {
  label: string;
  value: string | null;
  onSave: (date: string) => void;
  align?: 'left' | 'right';
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
        <div style={{ textAlign: align, cursor: 'pointer' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: CP.textTertiary,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
          }}>{label}</div>
          {value ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: CP.textPrimary,
              justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
            }}>
              {align === 'left' && <span style={{ color: CP.primary60 }}>{Ico.cal}</span>}
              <span style={{ fontFamily: CP.fontMono, fontVariantNumeric: 'tabular-nums' }}>
                {format(parseISO(value), 'MMM d, yyyy')}
              </span>
              {align === 'right' && <span style={{ color: CP.teal60 }}>{Ico.cal}</span>}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
            }}>
              <span style={{ color: CP.warning60 }}>{Ico.warn}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: CP.primary60 }}>
                Set {label.toLowerCase()}
              </span>
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
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
