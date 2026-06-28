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
import { X, Info, ChevronDown, Check } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import { Lozenge } from '@/components/ads';

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
import { getColumnsForGadget, getDefaultColumns, type GadgetColumnDef } from './gadgetColumns';
import { GripVertical, Trash2 } from '@/lib/atlaskit-icons';

const GADGET_DATE_FIELD: Record<GadgetType, string> = {
  demand:    'ph_requests.target_complete + release cascade',
  release:   'rh_releases.target_date',
  incidents: 'incidents.created_at',
  qa:        'tm_defects.created_at',
  items:     'ph_issues.jira_created_at',
  overdue:   'ph_issues.effective_due_date',
  onhold:    'ph_issues.jira_updated_at',
  workload:  'ph_issues.jira_created_at',
  activity:  'work_item_activity.occurred_at',
  scope:     'ph_versions.start_date (target_date − 14d fallback)',
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
    dot: 'var(--ds-text-subtlest)',
    statuses: ['BACKLOG', 'TO DO', 'IN REQUIREMENTS', 'IN DESIGN', 'READY FOR DEV', 'TECH VALIDATION', 'PORTFOLIO REVIEW'],
  },
  {
    label: 'In progress',
    dot: token('color.background.brand.bold', 'var(--ds-link)'),
    statuses: ['IN DEVELOPMENT', 'IN PROGRESS', 'IN REVIEW', 'IN QA', 'IN ENTITY INT.', 'IN UAT', 'IN BETA', 'INTERNAL QA', 'END TO END'],
  },
  {
    label: 'Paused',
    dot: 'var(--ds-text-warning)',
    statuses: ['ON HOLD', 'BLOCKED', 'AWAITING INFO', 'HOLD'],
  },
  {
    label: 'Done',
    dot: 'var(--ds-text-success)',
    statuses: ['PRODUCTION READY', 'BETA READY', 'IN PRODUCTION', 'DONE', 'CLOSED'],
  },
];

const PRIORITY_OPTIONS = [
  { value: 'Highest', label: 'Highest', icon: '↑↑', color: 'var(--ds-text-danger)' },
  { value: 'High', label: 'High', icon: '↑', color: 'var(--ds-text-warning)' },
  { value: 'Medium', label: 'Medium', icon: '—', color: 'var(--ds-text-warning)' },
  { value: 'Low', label: 'Low', icon: '↓', color: 'var(--ds-link)' },
  { value: 'Lowest', label: 'Lowest', icon: '↓↓', color: 'var(--ds-text-subtlest)' },
];

// ITEM_TYPES are fetched dynamically from ph_issues per project (see useQuery
// in component body). Keeps filter values aligned with actual DB values and
// scoped to the current project to prevent cross-project bleed-through.

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

  // Distinct issue types from ph_issues for THIS project (scoped — avoids
  // bleed-through from other projects in multi-project Jira setups).
  const { data: itemTypes = [] } = useQuery({
    queryKey: ['gadget-panel-item-types', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues' as any)
        .select('issue_type')
        .eq('project_key', projectKey)
        .not('issue_type', 'is', null)
        .limit(1000);
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const t = (r.issue_type ?? '').trim();
        if (!t) return;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      });
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value]) => ({ value, label: value }));
    },
    enabled: !!projectKey,
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
    <div ref={wrapperRef} style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px 8px',
          borderBottom: '1px solid var(--ds-background-neutral)',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 653, color: 'var(--ds-text)' }}>Gadget settings</div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4 }}>
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
            color: 'var(--ds-text-subtlest)',
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
          <label style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
            Date range
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, background: token('color.background.selected', 'var(--ds-background-selected)'),
                           color: token('color.text.selected', 'var(--ds-link)'), padding: '0 4px', borderRadius: 2 }}>
              NEW
            </span>
          </label>
          <button
            type="button"
            onClick={() => toggleField('date')}
            style={{
              display: 'flex', alignItems: 'center', minHeight: 36,
              border: openField === 'date' ? '2px solid var(--ds-border-focused)' : '2px solid var(--ds-border)',
              boxShadow: openField === 'date' ? '0 0 0 2px rgba(76,154,255,.25)' : 'none', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
              borderRadius: 3, background: openField === 'date' ? 'var(--ds-surface)' : 'var(--ds-surface-sunken)',
              padding: '0 8px', cursor: 'pointer', width: '100%', gap: 8,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="14" height="13" rx="2"
                stroke={openField === 'date' ? 'var(--ds-link)' : 'var(--ds-text-subtlest)'} strokeWidth="1.5"/>
              <path d="M1 6h14M5 1v2M11 1v2"
                stroke={openField === 'date' ? 'var(--ds-link)' : 'var(--ds-text-subtlest)'}
                strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 'var(--ds-font-size-400)',
                           color: draft.datePreset === 'all' ? 'var(--ds-text-subtlest)' : 'var(--ds-text)',
                           fontWeight: draft.datePreset === 'all' ? 400 : 500 }}>
              {draft.dateLabel || 'Select period'}
            </span>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d={openField === 'date' ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'}
                stroke="var(--ds-text-subtlest)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {openField === 'date' && (
            <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)',
                          borderRadius: 3, boxShadow: '0 6px 16px var(--ds-shadow-raised, rgba(9,30,66,.15))',
                          overflow: 'hidden' }}>
              {/* This period group */}
              <div style={{ borderBottom: '1px solid var(--ds-border)' }}>
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
                               background: active ? 'var(--ds-background-selected)' : 'transparent', cursor: 'pointer',
                               borderLeft: active ? '3px solid var(--ds-link)' : '3px solid transparent' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: 'var(--ds-font-size-400)', color: active ? 'var(--ds-link)' : 'var(--ds-text)',
                                       fontWeight: active ? 500 : 400 }}>
                          {p === 'thisQuarter' ? 'This quarter' : 'This year'}
                        </span>
                        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                          {r.dateLabel.split('·')[1]?.trim()}
                        </span>
                      </div>
                      {active && <span style={{ color: 'var(--ds-link)', fontWeight: 653 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Quarters group */}
              <div style={{ borderBottom: '1px solid var(--ds-border)' }}>
                <div style={{ padding: '7px 12px 3px', fontSize: 'var(--ds-font-size-50)', fontWeight: 653,
                              color: 'var(--ds-text-subtlest)', textTransform: 'none', letterSpacing: '.05em',
                              display: 'flex', alignItems: 'center', gap: 6 }}>
                  Quarters
                  <span style={{ background: 'var(--ds-background-selected)', color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-50)',
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
                               background: active ? 'var(--ds-background-selected)' : 'transparent', cursor: 'pointer',
                               borderLeft: active ? '3px solid var(--ds-link)' : '3px solid transparent' }}>
                      <span style={{ fontSize: 'var(--ds-font-size-400)', color: active ? 'var(--ds-link)' : 'var(--ds-text)',
                                     fontWeight: active ? 500 : 400 }}>{q} 2026</span>
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: active ? 'var(--ds-link)' : 'var(--ds-text-subtlest)' }}>
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
                           background: draft.datePreset === 'all' ? 'var(--ds-background-selected)' : 'transparent',
                           cursor: 'pointer',
                           borderLeft: draft.datePreset === 'all' ? '3px solid var(--ds-link)' : '3px solid transparent' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-400)', color: draft.datePreset === 'all' ? 'var(--ds-link)' : 'var(--ds-text)' }}>
                    All active
                  </span>
                  <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>No date filter</span>
                </button>
              </div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
                          background: 'var(--ds-surface-sunken)', borderRadius: 3, cursor: 'pointer' }}>
            <input type="checkbox" checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              style={{ width: 13, height: 13, accentColor: 'var(--ds-link)', cursor: 'pointer' }}/>
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
              Apply this date to <strong style={{ color: 'var(--ds-text)' }}>all gadgets</strong> on this dashboard
            </span>
          </label>

          <span style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtlest)', fontFamily: 'monospace',
                         background: 'var(--ds-surface-sunken)', padding: '4px 8px', borderRadius: 3 }}>
            filters on: {GADGET_DATE_FIELD[gadgetType]}
          </span>
        </div>

        <div style={{ height: '0.5px', background: 'var(--ds-border)' }} />

        <Field label="Status">
          {gadgetType === 'items' ? (
            <div
              title="Not applicable — this gadget displays all statuses by design"
              style={{
                display: 'flex', alignItems: 'center', minHeight: 36,
                border: '2px solid var(--ds-border)', borderRadius: 3,
                background: 'var(--ds-surface-sunken)', padding: '0 8px',
                cursor: 'not-allowed', opacity: 0.6,
                fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)', fontStyle: 'italic',
              }}
            >
              All statuses (by design)
            </div>
          ) : (
            <MultiSelectStatus
              value={draft.statusFilter}
              onChange={(v) => setField('statusFilter', v)}
              isOpen={openField === 'status'}
              onToggle={() => toggleField('status')}
            />
          )}
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
            options={itemTypes.map((t: any) => ({
              value: t.value,
              label: t.label,
              icon: <JiraIssueTypeIcon type={t.value.toLowerCase().replace(/[\s-]+/g, '_')} size={12} />,
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
              icon: <span style={{ color: p.color, fontWeight: 653 }}>{p.icon}</span>,
            }))}
            isOpen={openField === 'priority'}
            onToggle={() => toggleField('priority')}
          />
        </Field>

        {/* Items-by-status: chart type + blocked statuses */}
        {gadgetType === 'items' && (
          <div
            style={{
              borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`,
              paddingTop: 14, marginTop: 14,
            }}
          >
            <div
              style={{
                fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'none',
                letterSpacing: '.5px',
                color: token('color.text.subtle', 'var(--ds-text-subtlest)'),
                marginBottom: 8,
              }}
            >
              Chart type
            </div>
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                marginBottom: 16,
              }}
            >
              {(['stacked', 'hbar', 'vbar', 'donut'] as const).map((t) => {
                const labels = {
                  stacked: 'Stacked bar', hbar: 'Horizontal bars',
                  vbar: 'Vertical bars',  donut: 'Donut',
                };
                const active = (draft.gadgetSpecific?.chartType ?? 'stacked') === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        gadgetSpecific: { ...d.gadgetSpecific, chartType: t },
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      fontSize: 'var(--ds-font-size-200)',
                      borderRadius: 3,
                      cursor: 'pointer',
                      border: active ? '1px solid var(--ds-link)' : '1px solid var(--ds-border)',
                      background: active ? 'var(--ds-background-selected)' : 'var(--ds-surface-sunken)',
                      color: active ? 'var(--ds-link)' : 'var(--ds-text-subtle)',
                      fontWeight: active ? 500 : 400,
                      textAlign: 'left',
                    }}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'none',
                letterSpacing: '.5px',
                color: token('color.text.subtle', 'var(--ds-text-subtlest)'),
                marginBottom: 6,
              }}
            >
              Blocked statuses
            </div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtlest)'),
                marginBottom: 8, lineHeight: 1.5,
              }}
            >
              Items matching these Jira statuses are counted in the Blocked bucket.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {['On Hold', 'Awaiting Info', 'Blocked', 'Impediment'].map((s) => (
                <Lozenge key={s} appearance="moved">{s}</Lozenge>
              ))}
            </div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest', '#97A0AF'),
                fontStyle: 'italic',
              }}
            >
              Customisation coming in a future release.
            </div>
          </div>
        )}

        {/* ── NUMBER OF RESULTS ── */}
        <Field label="Number of results">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={1}
              max={50}
              value={draft.numResults ?? 10}
              onChange={(e) => setField('numResults', Math.max(1, Math.min(50, Number(e.currentTarget.value) || 10)))}
              style={{
                width: 64,
                height: 32,
                border: '1px solid var(--ds-border)',
                borderRadius: 3,
                padding: '0 8px',
                fontSize: 'var(--ds-font-size-400)',
                background: 'var(--ds-surface-sunken)',
                color: 'var(--ds-text)',
              }}
            />
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>max 50</span>
          </div>
        </Field>

        {/* ── COLUMNS TO DISPLAY ── */}
        <ColumnsSection
          gadgetType={gadgetType}
          projectKey={projectKey}
          columns={draft.columns}
          onChange={(cols) => setField('columns', cols)}
        />

        <div style={{ height: '0.5px', background: 'var(--ds-border)' }} />

        {/* ── AUTO REFRESH ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={draft.autoRefresh ?? false}
              onChange={(e) => setField('autoRefresh', e.currentTarget.checked)}
              style={{ width: 14, height: 14, accentColor: 'var(--ds-link)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>
              Auto refresh
            </span>
          </label>
          {draft.autoRefresh && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 22 }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>Update every</span>
              <select
                value={draft.autoRefreshMinutes ?? 15}
                onChange={(e) => setField('autoRefreshMinutes', Number(e.currentTarget.value))}
                style={{
                  height: 28,
                  border: '1px solid var(--ds-border)',
                  borderRadius: 3,
                  padding: '0 8px',
                  fontSize: 'var(--ds-font-size-200)',
                  background: 'var(--ds-surface)',
                  color: 'var(--ds-text)',
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          )}
        </div>

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
          borderTop: '1px solid var(--ds-background-neutral)',
          background: 'var(--ds-surface-sunken)',
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
            color: 'var(--ds-link)',
            cursor: 'pointer',
            fontSize: 'var(--ds-font-size-200)',
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
              padding: '0 8px',
              border: '1px solid var(--ds-border)',
              borderRadius: 3,
              background: 'var(--ds-surface)',
              fontSize: 'var(--ds-font-size-200)',
              cursor: 'pointer',
              color: 'var(--ds-text-subtle)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              if (applyToAll) {
                broadcastDateToAllGadgets(
                  projectKey,
                  draft.datePreset,
                  draft.dateFrom,
                  draft.dateTo,
                  draft.dateLabel,
                );
              }
              onClose();
            }}
            style={{
              height: 28,
              padding: '0 12px',
              border: 0,
              borderRadius: 3,
              background: 'var(--ds-link)',
              color: 'var(--ds-surface)',
              fontSize: 'var(--ds-font-size-200)',
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
          fontSize: 'var(--ds-font-size-50)',
          fontWeight: 653,
          textTransform: 'none',
          color: 'var(--ds-text-subtlest)',
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
          border: open ? '2px solid var(--ds-border-focused)' : '1px solid var(--ds-border)',
          background: 'var(--ds-surface-sunken)',
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
          <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>{placeholder}</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              style={{
                background: 'var(--ds-border)',
                color: 'var(--ds-text-subtle)',
                fontSize: 'var(--ds-font-size-100)',
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
                style={{ cursor: 'pointer', color: 'var(--ds-text-subtlest)' }}
              >
                ×
              </span>
            </span>
          ))
        )}
        <ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--ds-text-subtlest)' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 4,
            boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,.18))',
            maxHeight: 224,
            overflowY: 'auto',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: 10, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>No options</div>
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
                  background: sel ? 'var(--ds-background-selected)' : 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-200)',
                  textAlign: 'left',
                  color: 'var(--ds-text)',
                }}
                onMouseEnter={(e) => {
                  if (!sel) e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle))';
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
                    border: '1px solid var(--ds-border)',
                    background: sel ? 'var(--ds-link)' : 'var(--ds-surface)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {sel && <Check size={10} color="var(--ds-surface)" />}
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
          border: open ? '2px solid var(--ds-border-focused)' : '1px solid var(--ds-border)',
          background: 'var(--ds-surface-sunken)',
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
          <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>All statuses</span>
        ) : (
          value.map((v) => {
            const grp = STATUS_GROUPS.find((g) => g.statuses.includes(v));
            const palette =
              grp?.label === 'Done'
                ? { bg: 'var(--ds-background-success)', fg: 'var(--ds-text-success)' }
                : grp?.label === 'In progress'
                ? { bg: 'var(--ds-background-selected)', fg: 'var(--ds-background-information-bold)' }
                : grp?.label === 'Paused'
                ? { bg: 'var(--ds-background-warning)', fg: 'var(--ds-text-warning)' }
                : { bg: 'var(--ds-border, var(--ds-border))', fg: 'var(--ds-text-subtle)' };
            return (
              <span
                key={v}
                style={{
                  background: palette.bg,
                  color: palette.fg,
                  fontSize: 'var(--ds-font-size-50)',
                  fontWeight: 653,
                  textTransform: 'none',
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
        <ChevronDown size={12} style={{ marginLeft: 'auto', color: 'var(--ds-text-subtlest)' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            borderRadius: 4,
            boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,.18))',
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
                  fontSize: 'var(--ds-font-size-50)',
                  fontWeight: 653,
                  textTransform: 'none',
                  letterSpacing: '0.04em',
                  color: 'var(--ds-text-subtlest)',
                  background: 'var(--ds-surface-sunken)',
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
                    color: 'var(--ds-link)',
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-50)',
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
                      background: sel ? 'var(--ds-background-selected)' : 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      fontSize: 'var(--ds-font-size-200)',
                      textAlign: 'left',
                      color: 'var(--ds-text)',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: '1px solid var(--ds-border)',
                        background: sel ? 'var(--ds-link)' : 'var(--ds-surface)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {sel && <Check size={10} color="var(--ds-surface)" />}
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
    background: 'var(--ds-surface-sunken)',
    borderRadius: 4,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };
  const lbl: React.CSSProperties = {
    fontSize: 'var(--ds-font-size-50)',
    fontWeight: 653,
    textTransform: 'none',
    color: 'var(--ds-text-subtlest)',
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
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
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
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>Show {v} releases</span>
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
                  fontSize: 'var(--ds-font-size-100)',
                  borderRadius: 3,
                  border: '1px solid var(--ds-border)',
                  background: on ? 'var(--ds-link)' : 'var(--ds-surface)',
                  color: on ? 'var(--ds-surface)' : 'var(--ds-text-subtle)',
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
                  fontSize: 'var(--ds-font-size-100)',
                  borderRadius: 3,
                  border: '1px solid var(--ds-border)',
                  background: on ? 'var(--ds-link)' : 'var(--ds-surface)',
                  color: on ? 'var(--ds-surface)' : 'var(--ds-text-subtle)',
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
            border: '1px solid var(--ds-border)',
            borderRadius: 3,
            padding: '0 8px',
            fontSize: 'var(--ds-font-size-200)',
            background: 'var(--ds-surface)',
            color: 'var(--ds-text)',
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

  if (gadgetType === 'scope') {
    const maxReleases     = settings.maxReleases     ?? 8;
    const thresholdHigh   = settings.thresholdHigh   ?? 80;
    const thresholdMod    = settings.thresholdModerate ?? 30;
    const showOnlyActive  = settings.showOnlyActive  ?? true;

    const numInput: React.CSSProperties = {
      height: 28, width: '100%', border: '1px solid var(--ds-border)', borderRadius: 3,
      padding: '0 8px', fontSize: 'var(--ds-font-size-200)', background: 'var(--ds-surface)', color: 'var(--ds-text)',
    };

    return (
      <div style={{ ...wrapper, gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={lbl}>Max releases to show</span>
          <input
            type="number" min={1} max={20} value={maxReleases} style={numInput}
            onChange={(e) => onChange('maxReleases',
              Math.max(1, Math.min(20, Number(e.currentTarget.value) || 1)))}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={lbl}>High creep threshold (%)</span>
          <input
            type="number" min={1} max={100} value={thresholdHigh} style={numInput}
            onChange={(e) => onChange('thresholdHigh',
              Math.max(1, Math.min(100, Number(e.currentTarget.value) || 1)))}
          />
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
            Above {thresholdHigh}% added → "High creep"
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={lbl}>Moderate creep threshold (%)</span>
          <input
            type="number" min={0} max={100} value={thresholdMod} style={numInput}
            onChange={(e) => onChange('thresholdModerate',
              Math.max(0, Math.min(100, Number(e.currentTarget.value) || 0)))}
          />
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
            Above {thresholdMod}% added → "Moderate creep"
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox" checked={showOnlyActive}
            onChange={(e) => onChange('showOnlyActive', e.currentTarget.checked)}
            style={{ width: 13, height: 13, accentColor: 'var(--ds-link)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>Active releases only</span>
        </label>
      </div>
    );
  }

  return null;
}

// ─── Columns to display ───────────────────────────────────────────────────

function ColumnsSection({
  gadgetType,
  projectKey,
  columns,
  onChange,
}: {
  gadgetType: GadgetType;
  projectKey: string;
  columns: string[] | null;
  onChange: (cols: string[] | null) => void;
}) {
  const allDefs = getColumnsForGadget(gadgetType);
  if (!allDefs) return null;

  const defaults = getDefaultColumns(gadgetType);
  const active = columns ?? defaults;
  const defMap = new Map(allDefs.map((d) => [d.id, d]));
  const available = allDefs.filter((d) => !active.includes(d.id));

  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Saved column-set presets (P1-C). Stored at
  //   catalyst_gadget_presets_${projectKey}_${gadget} → Record<name, string[]>
  const presetKey = `catalyst_gadget_presets_${projectKey}_${gadgetType}`;
  const [presets, setPresets] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(presetKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const persistPresets = (next: Record<string, string[]>) => {
    setPresets(next);
    try { localStorage.setItem(presetKey, JSON.stringify(next)); } catch { /* quota */ }
  };
  const savePresetPrompt = () => {
    const name = (typeof window !== 'undefined' ? window.prompt('Preset name:', 'My defaults') : null)?.trim();
    if (!name) return;
    persistPresets({ ...presets, [name]: [...active] });
  };
  const loadPreset = (name: string) => {
    const cols = presets[name];
    if (!cols) return;
    onChange(cols.every((c, i) => c === defaults[i]) && cols.length === defaults.length ? null : cols);
  };
  const deletePreset = (name: string) => {
    const next = { ...presets };
    delete next[name];
    persistPresets(next);
  };

  const remove = (id: string) => {
    const next = active.filter((c) => c !== id);
    onChange(next.length === defaults.length && next.every((c, i) => c === defaults[i]) ? null : next);
  };

  const add = (id: string) => {
    onChange([...active, id]);
    setAddOpen(false);
  };

  const reorder = (from: number, to: number) => {
    const next = [...active];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.every((c, i) => c === defaults[i]) ? null : next);
  };

  const resetToDefault = () => onChange(null);

  const presetNames = Object.keys(presets);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 653, textTransform: 'none', color: 'var(--ds-text-subtlest)', letterSpacing: '0.04em' }}>
          Columns to display
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={savePresetPrompt}
            style={{ background: 'transparent', border: 0, color: 'var(--ds-link)', cursor: 'pointer', fontSize: 'var(--ds-font-size-50)', fontWeight: 600 }}>
            Save as preset
          </button>
          {columns != null && (
            <button type="button" onClick={resetToDefault}
              style={{ background: 'transparent', border: 0, color: 'var(--ds-link)', cursor: 'pointer', fontSize: 'var(--ds-font-size-50)', fontWeight: 600 }}>
              Default columns
            </button>
          )}
        </div>
      </div>

      {presetNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {presetNames.map((name) => (
            <span key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                background: 'var(--ds-background-neutral)',
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                fontSize: 'var(--ds-font-size-100)',
                color: 'var(--ds-text)',
              }}>
              <button type="button" onClick={() => loadPreset(name)}
                style={{ background: 'transparent', border: 0, padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 'var(--ds-font-size-100)' }}>
                {name}
              </button>
              <button type="button" onClick={() => deletePreset(name)} aria-label={`Delete preset ${name}`}
                style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--ds-text-subtlest)', cursor: 'pointer', fontSize: 'var(--ds-font-size-100)', lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ border: '1px solid var(--ds-border)', borderRadius: 4, background: 'var(--ds-surface)', overflow: 'hidden' }}>
        {active.map((colId, idx) => {
          const def = defMap.get(colId);
          if (!def) return null;
          return (
            <div
              key={colId}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIdx != null && dragIdx !== idx && dragOverIdx !== idx) setDragOverIdx(idx);
              }}
              onDragLeave={() => { if (dragOverIdx === idx) setDragOverIdx(null); }}
              onDrop={() => {
                if (dragIdx != null && dragIdx !== idx) reorder(dragIdx, idx);
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderBottom: idx < active.length - 1 ? '1px solid var(--ds-border)' : 'none',
                background: dragIdx === idx
                  ? 'var(--ds-background-selected)'
                  : 'transparent',
                boxShadow: dragIdx != null && dragOverIdx === idx && dragIdx !== idx
                  ? 'inset 0 2px 0 0 var(--ds-border-selected)'
                  : 'none',
                cursor: 'grab',
                fontSize: 'var(--ds-font-size-300)',
                color: 'var(--ds-text)',
              }}
            >
              <GripVertical size={12} style={{ color: 'var(--ds-text-subtlest)', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{def.label}</span>
              {active.length > 1 && (
                <button type="button" onClick={() => remove(colId)}
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 2, color: 'var(--ds-text-subtlest)', display: 'inline-flex' }}
                  aria-label={`Remove ${def.label} column`}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <span style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>
        Drag-drop to reorder the fields.
      </span>

      {available.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => { setAddOpen((o) => !o); setAddQuery(''); }}
            style={{
              width: '100%',
              height: 32,
              border: '1px dashed var(--ds-border)',
              borderRadius: 3,
              background: 'var(--ds-surface-sunken)',
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--ds-link)',
              cursor: 'pointer',
              fontWeight: 500,
            }}>
            + Add column
          </button>
          {addOpen && (() => {
            const showSearch = available.length > 8;
            const q = addQuery.trim().toLowerCase();
            const filtered = q
              ? available.filter((c) => c.label.toLowerCase().includes(q))
              : available;
            return (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 50,
                background: 'var(--ds-surface)',
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,.18))',
                maxHeight: 220,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {showSearch && (
                  <input
                    type="text"
                    autoFocus
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    placeholder="Search columns…"
                    style={{
                      margin: 6,
                      padding: '4px 8px',
                      height: 28,
                      fontSize: 'var(--ds-font-size-200)',
                      border: '1px solid var(--ds-border)',
                      borderRadius: 3,
                      background: 'var(--ds-surface)',
                      color: 'var(--ds-text)',
                      outline: 'none',
                    }}
                  />
                )}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '8px 10px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
                      No matches
                    </div>
                  ) : filtered.map((col) => (
                    <button key={col.id} type="button"
                      onClick={() => { add(col.id); setAddQuery(''); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '6px 10px',
                        border: 0,
                        background: 'transparent',
                        textAlign: 'left',
                        fontSize: 'var(--ds-font-size-200)',
                        color: 'var(--ds-text)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
