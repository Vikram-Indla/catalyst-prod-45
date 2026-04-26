/**
 * Product Roadmap — Detail Panel (matches backlog InitiativeDetailPanel design)
 * Same visual layout as backlog panel with roadmap-specific save wiring.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  X, Pencil, Copy, Star, Trash2, Map,
} from 'lucide-react';
import type { RoadmapInitiative } from './types/roadmap.types';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';

// ── Constants ──

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'score', label: 'Score' },
  { key: 'budget', label: 'Budget' },
  { key: 'risks', label: 'Risks' },
  { key: 'audit', label: 'Audit' },
] as const;

type TabKey = typeof TABS[number]['key'];

const ACTIONS = [
  { icon: Pencil, label: 'Edit', variant: 'default' },
  { icon: Copy, label: 'Clone', variant: 'default' },
  { icon: Star, label: 'Score', variant: 'default' },
  { icon: Trash2, label: 'Delete', variant: 'danger' },
] as const;


const STATUS_OPTIONS = [
  { value: 'new_demand', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'delivered', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: 'On Track', color: '#16A34A', bg: '#F0FDF4' },
  at_risk: { label: 'At Risk', color: '#D97706', bg: '#FFFBEB' },
  off_track: { label: 'Off Track', color: '#EF4444', bg: '#FEF2F2' },
};

const STATUS_PILL: Record<string, { color: string; bg: string }> = {
  Planned: { color: '#1D4ED8', bg: '#DBEAFE' },
  Active: { color: '#0F766E', bg: '#F0FDFA' },
  Completed: { color: '#16A34A', bg: '#F0FDF4' },
  Cancelled: { color: '#DC2626', bg: '#FEF2F2' },
  'On Hold': { color: '#D97706', bg: '#FFFBEB' },
  'Under Review': { color: '#7C3AED', bg: '#F5F3FF' },
  Approved: { color: '#0D9488', bg: '#F0FDFA' },
  New: { color: '#2563EB', bg: '#EFF6FF' },
};

// ── Field component (matches backlog) ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1" style={{ color: '#334155' }}>
        {label}
      </div>
      <div className="text-[13px] text-foreground">{children}</div>
    </div>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return '—'; }
}

// ── Avatar helper ──
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
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: approvedProfiles } = useApprovedProfiles();

  // Animate in
  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen, item?.id]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const saveField = useCallback(async (updates: Record<string, any>, fieldName: string) => {
    if (!item) return;
    try {
      const { error } = await typedQuery('ph_initiatives')
        .update(updates)
        .eq('id', item.rawDbId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-stats'] });
      toast.success(`${fieldName} updated`);
    } catch (err: any) {
      toast.error(`Failed to update ${fieldName}: ${err.message}`);
    }
  }, [item, queryClient]);


  const handleRoadmapToggle = useCallback(async () => {
    if (!item) return;
    await saveField({ on_roadmap: false }, 'Roadmap');
  }, [item, saveField]);

  if (!item) return null;

  const statusInfo = STATUS_PILL[item.status] || { color: '#334155', bg: '#F1F5F9' };
  const ownerProfile = approvedProfiles?.find(p => p.id === item.rawAssigneeId);

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[200] transition-opacity duration-250',
          isVisible ? 'bg-black/15' : 'bg-transparent pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 h-full w-[480px] max-w-[90vw] z-[201] bg-card border-l border-border shadow-xl',
          'flex flex-col transition-transform duration-250 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${item.initiativeKey}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border space-y-2 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  style={{ fontFamily: 'var(--cp-font-mono)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {item.initiativeKey}
                </span>
              </div>
              <h2 className="text-[16px] font-semibold text-foreground leading-tight truncate">
                {item.titleEn}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status pill */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusInfo.color }} />
            <span
              className="text-[12px] font-medium px-2 py-0.5 rounded-xl"
              style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}
            >
              {item.status}
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-border shrink-0">
          {ACTIONS.map(action => (
            <button
              key={action.label}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md transition-colors',
                action.variant === 'danger'
                  ? 'text-destructive hover:bg-destructive/10 ml-auto'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <action.icon className="w-3.5 h-3.5" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 px-5 border-b border-border shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'details' && (
            <div className="p-5 space-y-5">
              {/* Description */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1" style={{ color: '#94A3B8' }}>
                  Description
                </div>
                <p className="text-[13px] text-muted-foreground italic leading-relaxed">
                  {item.titleAr && item.titleAr !== item.titleEn ? item.titleAr : 'No description provided'}
                </p>
              </div>

              {/* Roadmap toggle */}
              <div className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center"
                      style={{ background: '#DBEAFE' }}>
                      <Map className="w-4 h-4" style={{ color: '#2563EB' }} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">On Roadmap</div>
                      <div className="text-[11px] text-muted-foreground">Visible on Product Roadmap timeline</div>
                    </div>
                  </div>
                  <button
                    onClick={handleRoadmapToggle}
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ background: '#2563EB' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      style={{ left: 22 }}
                    />
                  </button>
                </div>
              </div>

              {/* 2-col metadata grid */}
              <div className="grid grid-cols-2 gap-4 gap-x-6">
                <Field label="Status">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusInfo.color }} />
                    <span>{item.status}</span>
                  </div>
                </Field>
                <Field label="Health Status">
                  <span className="text-muted-foreground">—</span>
                </Field>

                <Field label="Department">
                  <span className="text-muted-foreground">—</span>
                </Field>
                <Field label="Business Value">
                  <span className="text-muted-foreground">—</span>
                </Field>

                <Field label="Created">
                  {formatDate(item.startDate)}
                </Field>
                <Field label="Target Quarter">
                  <span className="text-muted-foreground">—</span>
                </Field>

                <Field label="Assignee">
                  <div className="flex items-center gap-1.5">
                    {item.ownerName !== 'Unassigned' && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                        style={{ background: '#D97706' }}
                      >
                        {getInitials(item.ownerName)}
                      </div>
                    )}
                    <span>{item.ownerName === 'Unassigned' ? <span className="text-muted-foreground">—</span> : item.ownerName}</span>
                  </div>
                </Field>
                <Field label="Business Owner">
                  <span className="text-muted-foreground">—</span>
                </Field>

                <Field label="Reporter">
                  <span className="text-muted-foreground">—</span>
                </Field>
                <Field label="Progress">
                  <div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, item.progress)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {item.progress}%
                    </span>
                  </div>
                </Field>

                <Field label="Business Ask Date">
                  <span className="text-muted-foreground">—</span>
                </Field>
                <Field label="Kickoff Date">
                  <RoadmapDateField
                    value={item.startDate}
                    onSave={date => saveField({ roadmap_start_date: date }, 'Kickoff Date')}
                  />
                </Field>

                <Field label="Target Complete">
                  <RoadmapDateField
                    value={item.hasRealEndDate ? item.endDate : null}
                    onSave={date => saveField({ roadmap_end_date: date }, 'Target Complete')}
                  />
                </Field>
              </div>

              {/* Comments placeholder */}
              <div className="border-t border-border/50 pt-4">
                <h4 className="text-[13px] font-semibold text-foreground mb-2">Comments (0)</h4>
                <p className="text-[12px] text-muted-foreground">No comments yet.</p>
              </div>
            </div>
          )}

          {activeTab !== 'details' && (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <div className="text-[14px] font-semibold text-foreground mb-1">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
              <div className="text-[12px] text-muted-foreground">Coming soon</div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Inline date field with popover calendar ──
function RoadmapDateField({ value, onSave }: { value: string | null; onSave: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onSave(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-[13px] text-foreground hover:text-primary transition-colors text-left">
          {value ? formatDate(value) : <span className="text-muted-foreground">—</span>}
        </button>
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
