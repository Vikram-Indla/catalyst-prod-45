// =====================================================
// DETAIL TAB — Details content with Inline Editing
// Uses shadcn Select for clean dropdowns (no rectangle-in-rectangle)
// Health Status removed per V9 spec
// =====================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { TimelineInitiative, InitiativeStatus } from '@/types/producthub/initiative';
import { STATUS_CONFIG, getPriorityFromScore } from '@/types/producthub/initiative';
import { format } from 'date-fns';
import { FolderKanban, Zap, Wrench, Map, Network, Check, Pencil, ChevronDown } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePromoteToRoadmap, useRemoveFromRoadmap } from '@/hooks/useRoadmapPromotion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface DetailTabDetailsProps {
  initiative: TimelineInitiative;
}

// ---- DB Status mapping (UI statuses → DB enum) ----
const UI_TO_DB_STATUS: Record<string, string> = {
  new: 'new_demand',
  portfolio_review: 'under_review',
  technical_validation: 'under_review',
  estimate: 'under_review',
  demand_approved: 'approved',
  analysis: 'approved',
  ready_for_development: 'approved',
  under_implementation: 'in_progress',
  on_hold: 'on_hold',
  implementation_review: 'in_progress',
  in_support: 'delivered',
  done: 'closed',
  cancelled: 'cancelled',
};

const EA_REVIEW_OPTIONS = [
  { key: 'not_required', label: 'Not Required' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'In Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const VALUE_OPTIONS = [
  { key: 'high', label: 'High', color: '#16A34A', bg: '#F0FDF4' },
  { key: 'medium', label: 'Medium', color: '#D97706', bg: '#FFFBEB' },
  { key: 'low', label: 'Low', color: '#64748B', bg: '#F1F5F9' },
];

const PRIORITY_OPTIONS = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const QUARTER_OPTIONS = (() => {
  const items: string[] = [];
  const year = new Date().getFullYear();
  for (let y = year - 1; y <= year + 2; y++) {
    for (let q = 1; q <= 4; q++) items.push(`Q${q} ${y}`);
  }
  return items;
})();

const TYPE_OPTIONS = [
  { key: 'project', label: 'Project', Icon: FolderKanban, color: '#2563EB' },
  { key: 'enhancement', label: 'Enhancement', Icon: Zap, color: '#0D9488' },
  { key: 'improvement', label: 'Improvement', Icon: Wrench, color: '#D97706' },
  { key: 'entity_integration', label: 'Entity Integration', Icon: Network, color: '#8B5CF6' },
] as const;

// ---- Inline Edit Wrappers ----

/** Click-to-edit text field */
function EditableText({ value, onSave, placeholder = '—' }: {
  value: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim() || null;
    if (trimmed !== (value ?? null)) onSave(trimmed);
  };

  if (!editing) {
    return (
      <span
        className="group inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors min-h-[20px]"
        onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground italic'}>{value || placeholder}</span>
        <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className="w-full text-[13px] px-1.5 py-0.5 rounded border border-primary/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
      style={{ fontFamily: 'inherit' }}
    />
  );
}

/** Click-to-edit date field */
function EditableDate({ value, onSave }: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const newVal = draft || null;
    if (newVal !== (value ?? null)) onSave(newVal);
  };

  const displayVal = value ? (() => { try { return format(new Date(value), 'MMM d, yyyy'); } catch { return '—'; } })() : '—';

  if (!editing) {
    return (
      <span
        className="group inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors min-h-[20px]"
        onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{displayVal}</span>
        <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      className="w-full text-[13px] px-1.5 py-0.5 rounded border border-primary/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
    />
  );
}

/** Click-to-edit textarea for description */
function EditableTextArea({ value, onSave }: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim() || null;
    if (trimmed !== (value ?? null)) onSave(trimmed);
  };

  if (!editing) {
    return (
      <div
        className="group cursor-pointer hover:bg-accent/30 rounded p-1 -m-1 transition-colors"
        onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      >
        <p className="text-[13px] leading-relaxed" style={{ color: value ? 'var(--foreground)' : undefined }}>
          {value ? (typeof value === 'string' ? value : JSON.stringify(value))
            : <span className="text-muted-foreground italic">No description provided for this initiative.</span>}
        </p>
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity mt-1 inline-flex items-center gap-1">
          <Pencil size={9} /> Click to edit
        </span>
      </div>
    );
  }

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); } }}
        className="w-full text-[13px] leading-relaxed px-2 py-1.5 rounded border border-primary/40 bg-background outline-none focus:ring-1 focus:ring-primary/30 resize-none min-h-[80px]"
        style={{ fontFamily: 'inherit' }}
      />
      <p className="text-[10px] text-muted-foreground mt-1">Press Escape to cancel • Click away to save</p>
    </div>
  );
}

/** Editable progress slider */
function EditableProgress({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const committed = useRef(false);

  // Sync draft when value changes externally
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (!editing) {
    return (
      <div
        className="group cursor-pointer"
        onClick={() => { setDraft(value); setEditing(true); committed.current = false; }}
      >
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, value)}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}%
          <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={draft}
        onChange={e => setDraft(Number(e.target.value))}
        onBlur={commit}
        onMouseUp={commit}
        className="w-full h-1.5 accent-primary cursor-pointer"
        autoFocus
      />
      <span className="text-[11px] font-medium text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{draft}%</span>
    </div>
  );
}

// ---- Shadcn Select wrapper for autosave fields ----
function AutoSaveSelect({ value, options, onSave, placeholder = 'Select...' }: {
  value: string | null;
  options: { key: string; label: string; color?: string; bg?: string }[];
  onSave: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onSave(v === '__none__' ? null : v)}
    >
      <SelectTrigger className="h-7 text-[13px] border-0 shadow-none px-0 bg-transparent hover:bg-accent/30 focus:ring-0 focus:ring-offset-0 w-auto min-w-[100px] gap-1">
        <SelectValue placeholder={placeholder}>
          {(() => {
            const opt = options.find(o => o.key === value);
            if (!opt) return <span className="text-muted-foreground">—</span>;
            return (
              <span className="inline-flex items-center gap-1.5">
                {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
                {opt.label}
              </span>
            );
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[400]">
        <SelectItem value="__none__" className="text-muted-foreground text-[12px]">— None —</SelectItem>
        {options.map(opt => (
          <SelectItem key={opt.key} value={opt.key} className="text-[12px]">
            <span className="inline-flex items-center gap-1.5">
              {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** People picker using shadcn Select — loads profiles */
function PeopleSelect({ value, onSave, placeholder }: {
  value: string | null;
  onSave: (id: string | null, name: string | null) => void;
  placeholder?: string;
}) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return (data || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Unnamed' }));
    },
    staleTime: 5 * 60_000,
  });

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => {
        if (v === '__none__') { onSave(null, null); return; }
        const profile = profiles.find(p => p.id === v);
        onSave(v, profile?.name ?? null);
      }}
    >
      <SelectTrigger className="h-7 text-[13px] border-0 shadow-none px-0 bg-transparent hover:bg-accent/30 focus:ring-0 focus:ring-offset-0 w-auto min-w-[100px] gap-1">
        <SelectValue placeholder={placeholder || '—'}>
          {(() => {
            const p = profiles.find(p => p.id === value);
            return p ? <span>{p.name}</span> : <span className="text-muted-foreground">—</span>;
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[400] max-h-[240px]">
        <SelectItem value="__none__" className="text-muted-foreground text-[12px]">— None —</SelectItem>
        {profiles.map(p => (
          <SelectItem key={p.id} value={p.id} className="text-[12px]">{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Department picker using shadcn Select */
function DepartmentSelect({ value, onSave }: {
  value: string | null;
  onSave: (id: string | null, name: string | null) => void;
}) {
  const { data: departments = [] } = useQuery({
    queryKey: ['ph-departments-list'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('ph_departments').select('id, name');
      return (data || []).map((d: any) => ({ id: d.id, name: d.name }));
    },
    staleTime: 5 * 60_000,
  });

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => {
        if (v === '__none__') { onSave(null, null); return; }
        const dept = departments.find((d: any) => d.id === v);
        onSave(v, dept?.name ?? null);
      }}
    >
      <SelectTrigger className="h-7 text-[13px] border-0 shadow-none px-0 bg-transparent hover:bg-accent/30 focus:ring-0 focus:ring-offset-0 w-auto min-w-[100px] gap-1">
        <SelectValue placeholder="—">
          {(() => {
            const d = departments.find((d: any) => d.id === value);
            return d ? <span>{d.name}</span> : <span className="text-muted-foreground">—</span>;
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="z-[400] max-h-[240px]">
        <SelectItem value="__none__" className="text-muted-foreground text-[12px]">— None —</SelectItem>
        {departments.map((d: any) => (
          <SelectItem key={d.id} value={d.id} className="text-[12px]">{d.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---- Field wrapper with border grid ----
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="py-2.5 px-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1" style={{ color: '#334155' }}>
      {label}
    </div>
    <div className="text-[13px] text-foreground">{children}</div>
  </div>
);

// ---- Main Component ----
export const DetailTabDetails: React.FC<DetailTabDetailsProps> = ({ initiative }) => {
  const statusCfg = STATUS_CONFIG[initiative.status];
  const queryClient = useQueryClient();
  const [updatingType, setUpdatingType] = useState(false);

  const promoteMutation = usePromoteToRoadmap();
  const removeMutation = useRemoveFromRoadmap();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
    queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
  }, [queryClient]);

  // ---- Autosave helper ----
  const autoSave = useCallback(async (field: string, value: any, label: string) => {
    try {
      // Convert empty strings to null for FK fields
      const fkFields = ['department_id', 'assignee_id', 'reporter_id', 'business_owner_id', 'product_id'];
      const sanitized = fkFields.includes(field) && value === '' ? null : value;

      const { data: rows, error } = await supabase
        .from('ph_initiatives')
        .update({ [field]: sanitized, updated_at: new Date().toISOString() } as any)
        .eq('id', initiative.id)
        .select();
      if (error) throw error;

      // Detect RLS silent rejection (0 rows affected)
      if (!rows || rows.length === 0) {
        console.warn('autoSave: update returned 0 rows — possible RLS rejection or wrong ID', { field, id: initiative.id });
        toast.error(`Failed to persist ${label.toLowerCase()} — no rows updated`);
        return;
      }

      toast.success(`${label} updated`, {
        duration: 2000,
        icon: <Check size={14} className="text-primary" />,
      });
      invalidateAll();
    } catch (err: any) {
      toast.error(`Failed to update ${label.toLowerCase()}`);
      console.error('Initiative update failed:', field, err);
    }
  }, [initiative.id, invalidateAll]);

  // ---- Status change ----
  const handleStatusChange = useCallback(async (uiStatus: string) => {
    const dbStatus = UI_TO_DB_STATUS[uiStatus] || uiStatus;
    await autoSave('status', dbStatus, 'Status');
  }, [autoSave]);

  // ---- Type change ----
  const handleTypeChange = useCallback(async (typeKey: string) => {
    if (typeKey === initiative.initiative_type_key) return;
    setUpdatingType(true);
    try {
      const { data: typeRow, error: lookupErr } = await (supabase as any)
        .from('initiative_types')
        .select('id')
        .eq('key', typeKey)
        .single();
      if (lookupErr || !typeRow) throw lookupErr || new Error('Type not found');

      const { data: rows, error } = await supabase
        .from('ph_initiatives')
        .update({ initiative_type_id: typeRow.id, updated_at: new Date().toISOString() } as any)
        .eq('id', initiative.id)
        .select();
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast.error('Failed to persist type — no rows updated');
        setUpdatingType(false);
        return;
      }

      toast.success(`Type → ${typeKey}`, {
        duration: 2000,
        icon: <Check size={14} className="text-primary" />,
      });
      invalidateAll();
    } catch {
      toast.error('Failed to update type');
    } finally {
      setUpdatingType(false);
    }
  }, [initiative.id, initiative.initiative_type_key, invalidateAll]);

  // ---- Roadmap toggle ----
  const handleRoadmapToggle = useCallback(async () => {
    if (initiative.on_roadmap) {
      await removeMutation.mutateAsync(initiative.id);
    } else {
      await promoteMutation.mutateAsync({
        initiative_id: initiative.id,
        initiative_type_key: initiative.initiative_type_key || 'project',
      });
    }
  }, [initiative.id, initiative.on_roadmap, initiative.initiative_type_key, promoteMutation, removeMutation]);

  // Build status options for dropdown
  const statusOptions = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    color: cfg.color,
  }));

  return (
    <div className="p-5 space-y-5">
      {/* Initiative Type — segmented control */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-2" style={{ color: '#334155' }}>
          Initiative Type
        </div>
        <div className="flex items-center gap-2">
          {TYPE_OPTIONS.map(opt => {
            const isActive = initiative.initiative_type_key === opt.key;
            return (
              <button
                key={opt.key}
                disabled={updatingType}
                onClick={() => handleTypeChange(opt.key)}
                className="flex flex-col items-center p-2 rounded-md cursor-pointer transition-all border-2"
                style={{
                  borderColor: isActive ? opt.color : 'transparent',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                  opacity: updatingType ? 0.6 : 1,
                }}
              >
                <opt.Icon className="w-4 h-4 mb-0.5" style={{ color: opt.color }} />
                <span className="text-[10px] font-semibold" style={{ color: isActive ? opt.color : '#64748B' }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
          {!initiative.initiative_type_key && (
            <span className="text-[11px] text-muted-foreground ml-1">Select a type</span>
          )}
        </div>
      </div>

      {/* Roadmap toggle */}
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: initiative.on_roadmap ? '#DBEAFE' : '#F1F5F9' }}>
              <Map className="w-4 h-4" style={{ color: initiative.on_roadmap ? '#2563EB' : '#94A3B8' }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">
                {initiative.on_roadmap ? 'On Roadmap' : 'Not on Roadmap'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {initiative.on_roadmap ? 'Visible on Product Roadmap timeline' : 'Click toggle to add to roadmap'}
              </div>
            </div>
          </div>
          <button
            onClick={handleRoadmapToggle}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: initiative.on_roadmap ? '#2563EB' : '#CBD5E1' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: initiative.on_roadmap ? 22 : 2 }}
            />
          </button>
        </div>
      </div>

      {/* 2-col bordered grid — all editable fields with shadcn Select */}
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Status">
            <AutoSaveSelect
              value={initiative.status}
              options={statusOptions}
              onSave={(v) => v && handleStatusChange(v)}
              placeholder="Select status"
            />
          </Field>
          <Field label="EA Review">
            <AutoSaveSelect
              value={(initiative as any).ea_review ?? null}
              options={EA_REVIEW_OPTIONS}
              onSave={(v) => autoSave('ea_review', v, 'EA Review')}
              placeholder="Select"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Business Value">
            <AutoSaveSelect
              value={(initiative as any).business_value ?? null}
              options={VALUE_OPTIONS}
              onSave={(v) => autoSave('business_value', v, 'Business Value')}
              placeholder="Select"
            />
          </Field>
          <Field label="Priority">
            <AutoSaveSelect
              value={(initiative as any).priority ?? null}
              options={PRIORITY_OPTIONS}
              onSave={(v) => autoSave('priority', v, 'Priority')}
              placeholder="Select"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Target Quarter">
            <AutoSaveSelect
              value={initiative.target_quarter}
              options={QUARTER_OPTIONS.map(q => ({ key: q, label: q }))}
              onSave={(v) => autoSave('target_quarter', v, 'Target Quarter')}
              placeholder="Select quarter"
            />
          </Field>
          <Field label="Reporter">
            <PeopleSelect
              value={initiative.reporter_id}
              onSave={(id) => autoSave('reporter_id', id, 'Reporter')}
              placeholder="Select reporter"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Assignee">
            <PeopleSelect
              value={initiative.assignee_id}
              onSave={(id) => autoSave('assignee_id', id, 'Assignee')}
              placeholder="Select assignee"
            />
          </Field>
          <Field label="Department">
            <DepartmentSelect
              value={initiative.department_id}
              onSave={(id) => autoSave('department_id', id, 'Department')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Business Owner">
            <PeopleSelect
              value={initiative.business_owner_id}
              onSave={(id) => autoSave('business_owner_id', id, 'Business Owner')}
              placeholder="Select owner"
            />
          </Field>
          <Field label="Business Ask Date">
            <EditableDate
              value={initiative.business_ask_date}
              onSave={(v) => autoSave('business_ask_date', v, 'Business Ask Date')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Kickoff Date">
            <EditableDate
              value={initiative.kickoff_date}
              onSave={(v) => autoSave('kickoff_date', v, 'Kickoff Date')}
            />
          </Field>
          <Field label="Target Complete">
            <EditableDate
              value={initiative.target_complete}
              onSave={(v) => autoSave('target_complete', v, 'Target Complete')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <Field label="Progress">
            <EditableProgress
              value={initiative.progress}
              onSave={(v) => autoSave('progress', v, 'Progress')}
            />
          </Field>
          <Field label="">
            <span />
          </Field>
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-border/50 pt-4">
        <h4 className="text-[13px] font-semibold text-foreground mb-2">Description</h4>
        <EditableTextArea
          value={initiative.description}
          onSave={(v) => autoSave('description', v, 'Description')}
        />
      </div>
    </div>
  );
};

export default DetailTabDetails;
