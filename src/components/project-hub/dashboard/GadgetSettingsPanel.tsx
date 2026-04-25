// @ts-nocheck
/**
 * GadgetSettingsPanel — Layer 2 (per-gadget) filters.
 *
 * Five universal multi-selects (Status / Release / Assignee / Item Type /
 * Priority) + a gadget-specific tail (at-risk threshold, max rows, severity,
 * environment, group-by — depending on gadget).
 *
 * NO date field — date is page-level (FP-008). The panel header shows the
 * current page-level date label as read-only info.
 *
 * State:
 *   - Local draft state. "Apply" persists via useGadgetSettings (localStorage).
 *   - "Clear all" resets local draft to defaults.
 *   - "Cancel" discards draft, closes panel.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Info, ChevronDown, Check } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useDashboardFilter } from '@/contexts/DashboardFilterContext';
import {
  DEFAULT_GADGET_SETTINGS,
  resolvePreset,
  broadcastDateToAllGadgets,
  type DatePreset,
  type GadgetSettings,
  type GadgetType,
} from '@/hooks/useGadgetSettings';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const GADGET_DATE_FIELD: Record<GadgetType, string> = {
  demand:    'ph_initiatives.target_complete + release cascade',
  release:   'rh_releases.target_date',
  incidents: 'incidents.created_at',
  qa:        'tm_defects.created_at',
  items:     'ph_issues.jira_created_at',
  overdue:   'ph_issues.effective_due_date',
  onhold:    'ph_issues.jira_updated_at',
  workload:  'ph_issues.jira_created_at',
  activity:  'work_item_activity.occurred_at',
};

interface Props {
  gadgetType: GadgetType;
  projectKey: string;
  projectId: string;
  initialSettings: GadgetSettings;
  onClose: () => void;
  onApply: (s: GadgetSettings) => void;
  onClearAll: () => void;
}

// ─── Status groups ──────────────────────────────────────────────────────────

const STATUS_GROUPS = [
  {
    label: 'To do',
    dot: '#7A869A',
    statuses: ['BACKLOG', 'TO DO', 'IN REQUIREMENTS', 'IN DESIGN', 'READY FOR DEV', 'TECH VALIDATION', 'PORTFOLIO REVIEW'],
  },
  {
    label: 'In progress',
    dot: '#0052CC',
    statuses: ['IN DEVELOPMENT', 'IN PROGRESS', 'IN REVIEW', 'IN QA', 'IN ENTITY INT.', 'IN UAT', 'IN BETA', 'INTERNAL QA', 'END TO END'],
  },
  {
    label: 'Paused',
    dot: '#FFAB00',
    statuses: ['ON HOLD', 'BLOCKED', 'AWAITING INFO', 'HOLD'],
  },
  {
    label: 'Done',
    dot: '#36B37E',
    statuses: ['PRODUCTION READY', 'BETA READY', 'IN PRODUCTION', 'DONE', 'CLOSED'],
  },
];

const PRIORITY_OPTIONS = [
  { value: 'Highest', label: 'Highest', icon: '↑↑', color: '#DE350B' },
  { value: 'High', label: 'High', icon: '↑', color: '#FF8B00' },
  { value: 'Medium', label: 'Medium', icon: '—', color: '#FFAB00' },
  { value: 'Low', label: 'Low', icon: '↓', color: '#0065FF' },
  { value: 'Lowest', label: 'Lowest', icon: '↓↓', color: '#7A869A' },
];

const ITEM_TYPES = [
  { value: 'Epic', label: 'Epic' },
  { value: 'Story', label: 'Story' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Task', label: 'Task' },
  { value: 'Sub-task', label: 'Sub-task' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function GadgetSettingsPanel({
  gadgetType,
  projectKey,
  projectId,
  initialSettings,
  onClose,
  onApply,
  onClearAll,
}: Props) {
  const { filter } = useDashboardFilter();
  const [draft, setDraft] = useState<GadgetSettings>(initialSettings);
  const [applyToAll, setApplyToAll] = useState(false);
  const [openField, setOpenField] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenField(null);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpenField(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const toggleField = (name: string) =>
    setOpenField((f) => (f === name ? null : name));

  // Releases (portfolio-wide — no project filter, no status filter)
  const { data: releases = [] } = useQuery({
    queryKey: ['gadget-panel-releases'],
    queryFn: async () => {
      const res = await supabase
        .from('rh_releases' as any)
        .select('id, name, status')
        .or('target_date.gte.2026-01-01,target_date.is.null')
        .order('target_date', { ascending: true })
        .limit(50);
      console.log('[GadgetSettingsPanel] rh_releases response:', res);
      return (res.data ?? []) as any[];
    },
    staleTime: 60_000,
  });

  // Assignees from ph_issues for this project
  const { data: assignees = [] } = useQuery({
    queryKey: ['gadget-panel-assignees', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues' as any)
        .select('assignee_user_id, assignee_display_name')
        .eq('project_key', projectKey)
        .not('assignee_user_id', 'is', null)
        .limit(1000);
      const map = new Map<string, { id: string; name: string }>();
      (data ?? []).forEach((r: any) => {
        if (r.assignee_user_id && !map.has(r.assignee_user_id)) {
          map.set(r.assignee_user_id, {
            id: r.assignee_user_id,
            name: r.assignee_display_name ?? '—',
          });
        }
      });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });

  const setField = <K extends keyof GadgetSettings>(key: K, value: GadgetSettings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const setSpecific = (key: string, value: any) => {
    setDraft((d) => ({ ...d, gadgetSpecific: { ...d.gadgetSpecific, [key]: value } }));
  };

  return (
    <div ref={wrapperRef} style={{ fontSize: 13, color: '#172B4D' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px 8px',
          borderBottom: '1px solid #F1F2F4',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Gadget settings</div>
          <div style={{ fontSize: 11, color: '#6B778C', marginTop: 2 }}>
            Showing {filter.label}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: '#6B778C',
            padding: 4,
            borderRadius: 3,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* FIELDS */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto' }}>
        {/* ── DATE RANGE — first field ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6B778C',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
            Date range
            <span style={{ fontSize: 9, fontWeight: 700, background: '#DEEBFF',
                           color: '#0052CC', padding: '0 5px', borderRadius: 2 }}>
              NEW
            </span>
          </label>
          <button
            type="button"
            onClick={() => toggleField('date')}
            style={{
              display: 'flex', alignItems: 'center', minHeight: 36,
              border: openField === 'date' ? '2px solid #4C9AFF' : '2px solid #DFE1E6',
              boxShadow: openField === 'date' ? '0 0 0 2px rgba(76,154,255,.25)' : 'none',
              borderRadius: 3, background: openField === 'date' ? '#fff' : '#FAFBFC',
              padding: '0 8px', cursor: 'pointer', width: '100%', gap: 8,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="14" height="13" rx="2"
                stroke={openField === 'date' ? '#0052CC' : '#7A869A'} strokeWidth="1.5"/>
              <path d="M1 6h14M5 1v2M11 1v2"
                stroke={openField === 'date' ? '#0052CC' : '#7A869A'}
                strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 13,
                           color: draft.datePreset === 'all' ? '#7A869A' : '#172B4D',
                           fontWeight: draft.datePreset === 'all' ? 400 : 500 }}>
              {draft.dateLabel || 'Select period'}
            </span>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d={openField === 'date' ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'}
                stroke="#7A869A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {openField === 'date' && (
            <div style={{ background: '#fff', border: '1px solid #DFE1E6',
                          borderRadius: 3, boxShadow: '0 6px 16px rgba(9,30,66,.15)',
                          overflow: 'hidden' }}>
              {/* This period group */}
              <div style={{ borderBottom: '1px solid #EBECF0' }}>
                {(['thisQuarter', 'thisYear'] as DatePreset[]).map((p) => {
                  const r = resolvePreset(p);
                  const active = draft.datePreset === p;
                  return (
                    <button key={p} type="button" onClick={() => {
                      const resolved = resolvePreset(p);
                      setDraft((d) => ({ ...d, datePreset: p, ...resolved }));
                      toggleField('date');
                    }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                               padding: '8px 12px', width: '100%', border: 0, textAlign: 'left',
                               background: active ? '#EAF0FB' : 'transparent', cursor: 'pointer',
                               borderLeft: active ? '3px solid #0052CC' : '3px solid transparent' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: 13, color: active ? '#0052CC' : '#172B4D',
                                       fontWeight: active ? 500 : 400 }}>
                          {p === 'thisQuarter' ? 'This quarter' : 'This year'}
                        </span>
                        <span style={{ fontSize: 11, color: '#7A869A' }}>
                          {r.dateLabel.split('·')[1]?.trim()}
                        </span>
                      </div>
                      {active && <span style={{ color: '#0052CC', fontWeight: 700 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Quarters group */}
              <div style={{ borderBottom: '1px solid #EBECF0' }}>
                <div style={{ padding: '7px 12px 3px', fontSize: 10, fontWeight: 700,
                              color: '#7A869A', textTransform: 'uppercase', letterSpacing: '.05em',
                              display: 'flex', alignItems: 'center', gap: 6 }}>
                  Quarters
                  <span style={{ background: '#EAF0FB', color: '#0052CC', fontSize: 10,
                                 fontWeight: 600, padding: '0 6px', borderRadius: 10 }}>2026</span>
                </div>
                {(['Q1', 'Q2', 'Q3', 'Q4'] as DatePreset[]).map((q) => {
                  const r = resolvePreset(q);
                  const active = draft.datePreset === q;
                  const [, range] = r.dateLabel.split('·');
                  return (
                    <button key={q} type="button" onClick={() => {
                      setDraft((d) => ({ ...d, datePreset: q, ...resolvePreset(q) }));
                      toggleField('date');
                    }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                               padding: '7px 12px', width: '100%', border: 0, textAlign: 'left',
                               background: active ? '#EAF0FB' : 'transparent', cursor: 'pointer',
                               borderLeft: active ? '3px solid #0052CC' : '3px solid transparent' }}>
                      <span style={{ fontSize: 13, color: active ? '#0052CC' : '#172B4D',
                                     fontWeight: active ? 500 : 400 }}>{q} 2026</span>
                      <span style={{ fontSize: 11, color: active ? '#0052CC' : '#7A869A' }}>
                        {range?.trim()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* All active */}
              <div>
                <button type="button" onClick={() => {
                  setDraft((d) => ({ ...d, datePreset: 'all', ...resolvePreset('all') }));
                  toggleField('date');
                }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                           padding: '7px 12px', width: '100%', border: 0, textAlign: 'left',
                           background: draft.datePreset === 'all' ? '#EAF0FB' : 'transparent',
                           cursor: 'pointer',
                           borderLeft: draft.datePreset === 'all' ? '3px solid #0052CC' : '3px solid transparent' }}>
                  <span style={{ fontSize: 13, color: draft.datePreset === 'all' ? '#0052CC' : '#172B4D' }}>
                    All active
                  </span>
                  <span style={{ fontSize: 11, color: '#7A869A' }}>No date filter</span>
                </button>
              </div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
                          background: '#F4F5F7', borderRadius: 3, cursor: 'pointer' }}>
            <input type="checkbox" checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              style={{ width: 13, height: 13, accentColor: '#0052CC', cursor: 'pointer' }}/>
            <span style={{ fontSize: 11, color: '#42526E' }}>
              Apply this date to <strong style={{ color: '#172B4D' }}>all gadgets</strong> on this dashboard
            </span>
          </label>

          <span style={{ fontSize: 10, color: '#7A869A', fontFamily: 'monospace',
                         background: '#F4F5F7', padding: '2px 6px', borderRadius: 3 }}>
            filters on: {GADGET_DATE_FIELD[gadgetType]}
          </span>
        </div>

        <div style={{ height: '0.5px', background: '#EBECF0' }} />

        <Field label="Status">
          <MultiSelectStatus
            value={draft.statusFilter}
            onChange={(v) => setField('statusFilter', v)}
            isOpen={openField === 'status'}
            onToggle={() => toggleField('status')}
          />
        </Field>

        <Field label="Release">
          <MultiSelectGeneric
            placeholder="All releases"
            value={draft.releaseFilter}
            onChange={(v) => setField('releaseFilter', v)}
            options={releases.map((r: any) => ({ value: r.name, label: r.name }))}
            isOpen={openField === 'release'}
            onToggle={() => toggleField('release')}
          />
        </Field>

        <Field label="Assignee">
          <MultiSelectGeneric
            placeholder="All assignees"
            value={draft.assigneeFilter}
            onChange={(v) => setField('assigneeFilter', v)}
            options={assignees.map((a: any) => ({ value: a.id, label: a.name }))}
            isOpen={openField === 'assignee'}
            onToggle={() => toggleField('assignee')}
          />
        </Field>

        <Field label="Item type">
          <MultiSelectGeneric
            placeholder="All item types"
            value={draft.itemTypeFilter}
            onChange={(v) => setField('itemTypeFilter', v)}
            options={ITEM_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
              icon: <JiraIssueTypeIcon type={t.value.toLowerCase().replace(/-/g, '_')} size={12} />,
            }))}
            isOpen={openField === 'itemType'}
            onToggle={() => toggleField('itemType')}
          />
        </Field>

        <Field label="Priority">
          <MultiSelectGeneric
            placeholder="All priorities"
            value={draft.priorityFilter}
            onChange={(v) => setField('priorityFilter', v)}
            options={PRIORITY_OPTIONS.map((p) => ({
              value: p.value,
              label: p.label,
              icon: <span style={{ color: p.color, fontWeight: 700 }}>{p.icon}</span>,
            }))}
            isOpen={openField === 'priority'}
            onToggle={() => toggleField('priority')}
          />
        </Field>

        {/* Gadget-specific tail */}
        <GadgetSpecific
          gadgetType={gadgetType}
          settings={draft.gadgetSpecific}
          onChange={setSpecific}
        />
      </div>

      {/* FOOTER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: '1px solid #F1F2F4',
          background: '#FAFBFC',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_GADGET_SETTINGS);
            onClearAll();
          }}
          style={{
            background: 'transparent',
            border: 0,
            color: '#0052CC',
            cursor: 'pointer',
            fontSize: 12,
            padding: 4,
          }}
        >
          Clear all
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 28,
              padding: '0 10px',
              border: '1px solid #DFE1E6',
              borderRadius: 3,
              background: '#FFFFFF',
              fontSize: 12,
              cursor: 'pointer',
              color: '#42526E',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            style={{
              height: 28,
              padding: '0 12px',
              border: 0,
              borderRadius: 3,
              background: '#0052CC',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#7A869A',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

interface OptionT {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

function MultiSelectGeneric({
  value,
  onChange,
  options,
  placeholder,
  isOpen,
  onToggle,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: OptionT[];
  placeholder: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const open = isOpen;
  const selected = useMemo(() => new Set(value), [value]);
  const labelMap = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

  const toggle = (v: string) => {
    if (selected.has(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          minHeight: 32,
          width: '100%',
          padding: '4px 6px',
          border: open ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
          background: '#FAFBFC',
          borderRadius: 3,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        {value.length === 0 ? (
          <span style={{ color: '#7A869A', fontSize: 12 }}>{placeholder}</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              style={{
                background: '#EBECF0',
                color: '#42526E',
                fontSize: 11,
                padding: '0 6px',
                height: 20,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {labelMap.get(v) ?? v}
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((x) => x !== v));
                }}
                style={{ cursor: 'pointer', color: '#6B778C' }}
              >
                ×
              </span>
            </span>
          ))
        )}
        <ChevronDown size={12} style={{ marginLeft: 'auto', color: '#7A869A' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,.18)',
            maxHeight: 224,
            overflowY: 'auto',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: '#7A869A' }}>No options</div>
          )}
          {options.map((opt) => {
            const sel = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 10px',
                  background: sel ? '#EAF0FB' : 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                  color: '#172B4D',
                }}
                onMouseEnter={(e) => {
                  if (!sel) e.currentTarget.style.background = '#F4F5F7';
                }}
                onMouseLeave={(e) => {
                  if (!sel) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: '1px solid #B3BAC5',
                    background: sel ? '#0052CC' : '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {sel && <Check size={10} color="#FFFFFF" />}
                </span>
                {opt.icon}
                <span style={{ flex: 1 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MultiSelectStatus({
  value,
  onChange,
  isOpen,
  onToggle,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const open = isOpen;
  const selected = useMemo(() => new Set(value), [value]);

  const toggle = (s: string) => {
    if (selected.has(s)) onChange(value.filter((x) => x !== s));
    else onChange([...value, s]);
  };

  const selectGroup = (statuses: string[]) => {
    const all = new Set([...value, ...statuses]);
    onChange(Array.from(all));
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          minHeight: 32,
          width: '100%',
          padding: '4px 6px',
          border: open ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
          background: '#FAFBFC',
          borderRadius: 3,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        {value.length === 0 ? (
          <span style={{ color: '#7A869A', fontSize: 12 }}>All statuses</span>
        ) : (
          value.map((v) => {
            const grp = STATUS_GROUPS.find((g) => g.statuses.includes(v));
            const palette =
              grp?.label === 'Done'
                ? { bg: '#E3FCEF', fg: '#006644' }
                : grp?.label === 'In progress'
                ? { bg: '#DEEBFF', fg: '#0747A6' }
                : grp?.label === 'Paused'
                ? { bg: '#FFF0B3', fg: '#974F0C' }
                : { bg: '#DFE1E6', fg: '#42526E' };
            return (
              <span
                key={v}
                style={{
                  background: palette.bg,
                  color: palette.fg,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  padding: '0 6px',
                  height: 20,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {v}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((x) => x !== v));
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  ×
                </span>
              </span>
            );
          })
        )}
        <ChevronDown size={12} style={{ marginLeft: 'auto', color: '#7A869A' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,.18)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {STATUS_GROUPS.map((grp) => (
            <div key={grp.label}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#7A869A',
                  background: '#FAFBFC',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: grp.dot }} />
                  {grp.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectGroup(grp.statuses);
                  }}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: '#0052CC',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Select all
                </button>
              </div>
              {grp.statuses.map((s) => {
                const sel = selected.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '6px 10px',
                      background: sel ? '#EAF0FB' : 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      fontSize: 12,
                      textAlign: 'left',
                      color: '#172B4D',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: '1px solid #B3BAC5',
                        background: sel ? '#0052CC' : '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {sel && <Check size={10} color="#FFFFFF" />}
                    </span>
                    <span style={{ flex: 1 }}>{s}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gadget-specific tail ────────────────────────────────────────────────────

function GadgetSpecific({
  gadgetType,
  settings,
  onChange,
}: {
  gadgetType: GadgetType;
  settings: Record<string, any>;
  onChange: (k: string, v: any) => void;
}) {
  if (gadgetType === 'workload' || gadgetType === 'activity') return null;

  const wrapper: React.CSSProperties = {
    background: '#F4F5F7',
    borderRadius: 4,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };
  const lbl: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#7A869A',
    letterSpacing: '0.04em',
  };

  if (gadgetType === 'demand') {
    const v = settings.atRiskDays ?? 7;
    return (
      <div style={wrapper}>
        <span style={lbl}>At-risk threshold</span>
        <input
          type="range"
          min={1}
          max={14}
          step={1}
          value={v}
          onChange={(e) => onChange('atRiskDays', Number(e.currentTarget.value))}
        />
        <span style={{ fontSize: 11, color: '#5E6C84' }}>
          Flag items with {v} day{v === 1 ? '' : 's'} or fewer remaining
        </span>
      </div>
    );
  }

  if (gadgetType === 'release') {
    const v = settings.maxRows ?? 6;
    return (
      <div style={wrapper}>
        <span style={lbl}>Rows shown in gadget</span>
        <input
          type="range"
          min={3}
          max={10}
          step={1}
          value={v}
          onChange={(e) => onChange('maxRows', Number(e.currentTarget.value))}
        />
        <span style={{ fontSize: 11, color: '#5E6C84' }}>Show {v} releases</span>
      </div>
    );
  }

  if (gadgetType === 'incidents') {
    const opts = ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low'];
    const sel = new Set<string>(settings.severity ?? []);
    return (
      <div style={wrapper}>
        <span style={lbl}>Severity</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {opts.map((o) => {
            const on = sel.has(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const next = new Set(sel);
                  if (on) next.delete(o);
                  else next.add(o);
                  onChange('severity', Array.from(next));
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  borderRadius: 3,
                  border: '1px solid #DFE1E6',
                  background: on ? '#0052CC' : '#FFFFFF',
                  color: on ? '#FFFFFF' : '#42526E',
                  cursor: 'pointer',
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (gadgetType === 'qa') {
    const opts = ['Production', 'Staging', 'Development'];
    const sel = new Set<string>(settings.environment ?? []);
    return (
      <div style={wrapper}>
        <span style={lbl}>Environment</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {opts.map((o) => {
            const on = sel.has(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  const next = new Set(sel);
                  if (on) next.delete(o);
                  else next.add(o);
                  onChange('environment', Array.from(next));
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  borderRadius: 3,
                  border: '1px solid #DFE1E6',
                  background: on ? '#0052CC' : '#FFFFFF',
                  color: on ? '#FFFFFF' : '#42526E',
                  cursor: 'pointer',
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (gadgetType === 'items' || gadgetType === 'overdue' || gadgetType === 'onhold') {
    const v = settings.groupBy ?? 'None';
    const opts = ['None', 'Assignee', 'Status', 'Priority', 'Item type'];
    return (
      <div style={wrapper}>
        <span style={lbl}>Group by</span>
        <select
          value={v}
          onChange={(e) => onChange('groupBy', e.currentTarget.value)}
          style={{
            height: 28,
            border: '1px solid #DFE1E6',
            borderRadius: 3,
            padding: '0 8px',
            fontSize: 12,
            background: '#FFFFFF',
            color: '#172B4D',
          }}
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}
