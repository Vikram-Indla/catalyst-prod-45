/**
 * JiraFilterAtlaskit — Jira-reference filter drawer (strategic rewrite, 2026-04).
 *
 * Structure matches Jira's real list-view filter drawer, section-by-section:
 *
 *   FILTERS
 *
 *   Priority             ↟ ↑ = ↓ ↡
 *
 *   Reporter             [avatar grid 7-col + ...]
 *
 *   Status               [☐ LOZENGE] [☐ LOZENGE] + ...
 *
 *   Updated              [From] → [To]
 *
 *   Work type            [icon Label] [icon Label] + ...
 *
 *   Date range           [Start date] → [Due date]
 *
 *   Assignee             [avatar grid 7-col + ...]
 *
 *   Created              [From] → [To]
 *
 *   Fix versions         [pill] [pill] + ...
 *
 *   Labels               [pill] [pill] [pill] + ...
 *
 * Every surface uses @atlaskit/tokens so dark mode + future token updates
 * ripple through automatically. Layout primitives are plain HTML — we don't
 * depend on @atlaskit/popup here (§5a — Popup doesn't render content in this
 * surface; the drawer is an in-flow section rather than a portal).
 *
 * Data contract:
 *   - `value` / `onChange` are controlled props.
 *   - The parent supplies the option pools: assignees, reporters, fix versions,
 *     labels, statuses, workTypes. Priority is a fixed vocabulary. Sections
 *     with empty option pools render a small "No data" hint so the drawer
 *     stays self-explanatory while data is wired.
 *
 * Entry point: the caller renders <JiraFilterAtlaskit value={..} onChange={..} ..options />
 * just like before — the PROPS are different (breaking change), so BacklogPage
 * must pass the new pools.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import { Checkbox as AkCheckbox } from '@atlaskit/checkbox';
import { DatePicker } from '@atlaskit/datetime-picker';
import { token } from '@atlaskit/tokens';
import {
  Filter as FilterIcon,
  Calendar as CalendarIcon,
  ChevronsUp as HighestPriIcon,
  ChevronUp as HighPriIcon,
  Equal as MediumPriIcon,
  ChevronDown as LowPriIcon,
  ChevronsDown as LowestPriIcon,
  MoreHorizontal as MoreIcon,
  X as XIcon,
} from 'lucide-react';
import type { LozengeAppearance } from './JiraTable';

// ─── Types ────────────────────────────────────────────────────────────────

export interface AssigneeOption {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ReporterOption {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface FixVersionOption {
  id: string;
  label: string;
}

export interface LabelOption {
  id: string;
  label: string;
}

export interface StatusFilterOption {
  value: string;
  label: string;
  appearance: LozengeAppearance;
}

export interface WorkTypeOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export type PriorityLevel = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface JiraFilterValue {
  priority: PriorityLevel[];
  reporter: string[];
  status: string[];
  updated: { from?: string | null; to?: string | null };
  workType: string[];
  dateRange: { start?: string | null; due?: string | null };
  assignees: string[];
  created: { from?: string | null; to?: string | null };
  fixVersions: string[];
  labels: string[];
}

export const emptyFilterValue: JiraFilterValue = {
  priority: [],
  reporter: [],
  status: [],
  updated: {},
  workType: [],
  dateRange: {},
  assignees: [],
  created: {},
  fixVersions: [],
  labels: [],
};

export function countActiveFilters(v: JiraFilterValue): number {
  let n = 0;
  n += v.priority.length;
  n += v.reporter.length;
  n += v.status.length;
  if (v.updated.from || v.updated.to) n += 1;
  n += v.workType.length;
  if (v.dateRange.start || v.dateRange.due) n += 1;
  n += v.assignees.length;
  if (v.created.from || v.created.to) n += 1;
  n += v.fixVersions.length;
  n += v.labels.length;
  return n;
}

// ─── Priority fixed vocabulary (Jira canonical) ───────────────────────────

const PRIORITY_LEVELS: Array<{ level: PriorityLevel; label: string; icon: React.ReactNode; color: string }> = [
  { level: 'highest', label: 'Highest', icon: <HighestPriIcon size={18} />, color: token('color.icon.danger', '#E5484D') },
  { level: 'high',    label: 'High',    icon: <HighPriIcon    size={18} />, color: token('color.icon.danger', '#E5484D') },
  { level: 'medium',  label: 'Medium',  icon: <MediumPriIcon  size={18} />, color: token('color.icon.warning', '#F59E0B') },
  { level: 'low',     label: 'Low',     icon: <LowPriIcon     size={18} />, color: token('color.icon.information', '#0065FF') },
  { level: 'lowest',  label: 'Lowest',  icon: <LowestPriIcon  size={18} />, color: token('color.icon.information', '#0065FF') },
];

// ─── Props ────────────────────────────────────────────────────────────────

export interface JiraFilterAtlaskitProps {
  value: JiraFilterValue;
  onChange: (next: JiraFilterValue) => void;
  /** Option pools — the parent supplies what's available for the project. */
  assignees?: AssigneeOption[];
  reporters?: ReporterOption[];
  fixVersions?: FixVersionOption[];
  labels?: LabelOption[];
  statuses?: StatusFilterOption[];
  workTypes?: WorkTypeOption[];
}

// ─── The drawer trigger + content ─────────────────────────────────────────

export function JiraFilterAtlaskit(props: JiraFilterAtlaskitProps) {
  const {
    value,
    onChange,
    assignees = [],
    reporters = [],
    fixVersions = [],
    labels = [],
    statuses = [],
    workTypes = [],
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (drawerRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const count = countActiveFilters(value);
  const update = useCallback(<K extends keyof JiraFilterValue>(key: K, v: JiraFilterValue[K]) => {
    onChange({ ...value, [key]: v });
  }, [onChange, value]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 12px',
          borderRadius: 3,
          border: `1px solid ${isOpen ? token('color.border.selected', '#0C66E4') : token('color.border', '#DFE1E6')}`,
          background: isOpen ? token('color.background.selected', '#E9F2FF') : token('elevation.surface', '#FFFFFF'),
          color: isOpen ? token('color.text.selected', '#0055CC') : token('color.text', '#292A2E'),
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <FilterIcon size={14} />
        <span>Filters</span>
        <LowPriIcon size={12} style={{ marginLeft: -2, opacity: 0.7 }} />
        {count > 0 && (
          <span
            style={{
              marginLeft: 4,
              padding: '0 6px',
              minWidth: 18,
              height: 18,
              borderRadius: 10,
              background: token('color.background.accent.blue.bolder', '#0C66E4'),
              color: token('color.text.inverse', '#FFFFFF'),
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-label="Filters"
          style={{
            position: 'absolute',
            top: '100%',
            marginTop: 4,
            right: 0,
            zIndex: 900,
            width: 360,
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 8px 24px -4px rgba(9,30,66,0.18)'),
            color: token('color.text', '#292A2E'),
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            fontSize: 14,
          }}
        >
          {/* Drawer header — matches Jira: small caps "FILTERS" with a subtle border */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: token('color.text.subtlest', '#6B778C'),
              }}
            >
              Filters
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(emptyFilterValue)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: token('color.link', '#0C66E4'),
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontFamily: 'inherit',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Priority — icon row (Jira's canonical 5) */}
          <Section label="Priority">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {PRIORITY_LEVELS.map((p) => {
                const selected = value.priority.includes(p.level);
                return (
                  <button
                    key={p.level}
                    type="button"
                    aria-pressed={selected}
                    title={p.label}
                    onClick={() =>
                      update('priority', selected ? value.priority.filter(x => x !== p.level) : [...value.priority, p.level])
                    }
                    style={{
                      width: 36,
                      height: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${selected ? token('color.border.selected', '#0C66E4') : 'transparent'}`,
                      borderRadius: 3,
                      background: selected ? token('color.background.selected', '#E9F2FF') : 'transparent',
                      color: p.color,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {p.icon}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Reporter — avatar grid */}
          <Section label="Reporter">
            <AvatarGrid
              options={reporters}
              selected={value.reporter}
              onToggle={(id) =>
                update('reporter', value.reporter.includes(id) ? value.reporter.filter(x => x !== id) : [...value.reporter, id])
              }
              emptyHint="No reporters available yet."
            />
          </Section>

          {/* Status — lozenge checkbox chips */}
          <Section label="Status">
            <StatusChipGrid
              options={statuses}
              selected={value.status}
              onToggle={(s) =>
                update('status', value.status.includes(s) ? value.status.filter(x => x !== s) : [...value.status, s])
              }
            />
          </Section>

          {/* Updated — From / To */}
          <Section label="Updated">
            <DateRange
              from={value.updated.from ?? null}
              to={value.updated.to ?? null}
              onChange={(from, to) => update('updated', { from, to })}
              fromLabel="From"
              toLabel="To"
            />
          </Section>

          {/* Work type — icon+text chips */}
          <Section label="Work type">
            <WorkTypeChipGrid
              options={workTypes}
              selected={value.workType}
              onToggle={(id) =>
                update('workType', value.workType.includes(id) ? value.workType.filter(x => x !== id) : [...value.workType, id])
              }
            />
          </Section>

          {/* Date range — Start / Due */}
          <Section label="Date range">
            <DateRange
              from={value.dateRange.start ?? null}
              to={value.dateRange.due ?? null}
              onChange={(start, due) => update('dateRange', { start, due })}
              fromLabel="Start date"
              toLabel="Due date"
            />
          </Section>

          {/* Assignee — avatar grid */}
          <Section label="Assignee">
            <AvatarGrid
              options={assignees}
              selected={value.assignees}
              onToggle={(id) =>
                update('assignees', value.assignees.includes(id) ? value.assignees.filter(x => x !== id) : [...value.assignees, id])
              }
              emptyHint="No assignees in the current result set."
            />
          </Section>

          {/* Created — From / To */}
          <Section label="Created">
            <DateRange
              from={value.created.from ?? null}
              to={value.created.to ?? null}
              onChange={(from, to) => update('created', { from, to })}
              fromLabel="From"
              toLabel="To"
            />
          </Section>

          {/* Fix versions — plain pill chips */}
          <Section label="Fix versions">
            <PillChipGrid
              options={fixVersions}
              selected={value.fixVersions}
              onToggle={(id) =>
                update('fixVersions', value.fixVersions.includes(id) ? value.fixVersions.filter(x => x !== id) : [...value.fixVersions, id])
              }
              emptyHint="No fix versions yet."
            />
          </Section>

          {/* Labels — compact pill chips */}
          <Section label="Labels" noBorder>
            <PillChipGrid
              options={labels}
              selected={value.labels}
              onToggle={(id) =>
                update('labels', value.labels.includes(id) ? value.labels.filter(x => x !== id) : [...value.labels, id])
              }
              compact
              emptyHint="No labels yet."
            />
          </Section>
        </div>
      )}
    </>
  );
}

// ─── Section wrapper — shared layout for every filter section ─────────────

function Section({
  label,
  children,
  noBorder,
}: { label: string; children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div
      style={{
        padding: '16px 16px 18px',
        borderBottom: noBorder ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: token('color.text', '#292A2E'),
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── AvatarGrid — 7-col avatars + overflow "..." ──────────────────────────

function AvatarGrid({
  options,
  selected,
  onToggle,
  emptyHint,
}: {
  options: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  selected: string[];
  onToggle: (id: string) => void;
  emptyHint: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (options.length === 0) {
    return (
      <div style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), fontStyle: 'italic' }}>
        {emptyHint}
      </div>
    );
  }
  const perRow = 8;
  const rowsToShow = showAll ? Math.ceil(options.length / perRow) : 2;
  const visibleSlots = rowsToShow * perRow - (showAll ? 0 : 1); // reserve 1 for overflow btn on second row
  const visible = showAll ? options : options.slice(0, visibleSlots);
  const overflow = Math.max(0, options.length - visible.length);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
        gap: 8,
      }}
    >
      {visible.map((o) => {
        const isSel = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            title={o.name}
            aria-pressed={isSel}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: '50%',
              border: `2px solid ${isSel ? token('color.border.selected', '#0C66E4') : 'transparent'}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Avatar size="medium" name={o.name} src={o.avatarUrl || undefined} appearance="circle" />
          </button>
        );
      })}
      {overflow > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          title={`Show ${overflow} more`}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('elevation.surface', '#FFFFFF'),
            color: token('color.text.subtle', '#42526E'),
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
          }}
        >
          <MoreIcon size={14} />
        </button>
      )}
    </div>
  );
}

// ─── StatusChipGrid — checkbox + lozenge, 2 per row, overflow at end ──────

function StatusChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: StatusFilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (options.length === 0) {
    return (
      <div style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), fontStyle: 'italic' }}>
        No statuses available.
      </div>
    );
  }
  const cap = 4;
  const visible = showAll ? options : options.slice(0, cap);
  const overflow = Math.max(0, options.length - visible.length);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {visible.map((o) => {
        const isSel = selected.includes(o.value);
        return (
          <label
            key={o.value}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 16,
              border: `1px solid ${isSel ? token('color.border.selected', '#0C66E4') : token('color.border', '#DFE1E6')}`,
              background: isSel ? token('color.background.selected', '#E9F2FF') : token('elevation.surface', '#FFFFFF'),
              cursor: 'pointer',
            }}
          >
            <AkCheckbox isChecked={isSel} onChange={() => onToggle(o.value)} label="" />
            <Lozenge appearance={o.appearance}>{o.label}</Lozenge>
          </label>
        );
      })}
      {overflow > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          title={`Show ${overflow} more`}
          style={{
            gridColumn: overflow === 1 ? 'auto' : 'span 1',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('elevation.surface', '#FFFFFF'),
            color: token('color.text.subtle', '#42526E'),
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            justifySelf: 'start',
          }}
        >
          <MoreIcon size={14} />
        </button>
      )}
    </div>
  );
}

// ─── WorkTypeChipGrid — icon + text chips, 2 per row ──────────────────────

function WorkTypeChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: WorkTypeOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (options.length === 0) {
    return (
      <div style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), fontStyle: 'italic' }}>
        No work types available.
      </div>
    );
  }
  const cap = 4;
  const visible = showAll ? options : options.slice(0, cap);
  const overflow = Math.max(0, options.length - visible.length);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {visible.map((o) => {
        const isSel = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={isSel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 16,
              border: `1px solid ${isSel ? token('color.border.selected', '#0C66E4') : token('color.border', '#DFE1E6')}`,
              background: isSel ? token('color.background.selected', '#E9F2FF') : token('color.background.neutral.subtle', '#FAFBFC'),
              color: isSel ? token('color.text.selected', '#0055CC') : token('color.text', '#292A2E'),
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              width: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {o.icon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
          </button>
        );
      })}
      {overflow > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          title={`Show ${overflow} more`}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('elevation.surface', '#FFFFFF'),
            color: token('color.text.subtle', '#42526E'),
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            justifySelf: 'start',
          }}
        >
          <MoreIcon size={14} />
        </button>
      )}
    </div>
  );
}

// ─── PillChipGrid — plain text pills (Fix versions, Labels) ───────────────

function PillChipGrid({
  options,
  selected,
  onToggle,
  compact,
  emptyHint,
}: {
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onToggle: (id: string) => void;
  compact?: boolean;
  emptyHint: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (options.length === 0) {
    return (
      <div style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), fontStyle: 'italic' }}>
        {emptyHint}
      </div>
    );
  }
  const cap = compact ? 8 : 4;
  const visible = showAll ? options : options.slice(0, cap);
  const overflow = Math.max(0, options.length - visible.length);
  const columns = compact ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8 }}>
      {visible.map((o) => {
        const isSel = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={isSel}
            title={o.label}
            style={{
              padding: compact ? '4px 10px' : '6px 12px',
              borderRadius: 16,
              border: `1px solid ${isSel ? token('color.border.selected', '#0C66E4') : 'transparent'}`,
              background: isSel ? token('color.background.selected', '#E9F2FF') : token('color.background.neutral.subtle', '#FAFBFC'),
              color: isSel ? token('color.text.selected', '#0055CC') : token('color.text.subtle', '#42526E'),
              fontSize: compact ? 12 : 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        );
      })}
      {overflow > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          title={`Show ${overflow} more`}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('elevation.surface', '#FFFFFF'),
            color: token('color.text.subtle', '#42526E'),
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            justifySelf: 'start',
          }}
        >
          <MoreIcon size={13} />
        </button>
      )}
    </div>
  );
}

// ─── DateRange — From / To inputs with arrow separator ────────────────────

function DateRange({
  from,
  to,
  onChange,
  fromLabel,
  toLabel,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  fromLabel: string;
  toLabel: string;
}) {
  // Apr 27, 2026 (L41): replaced two `Textfield type="date"` (which renders
  // the native browser date input — banned by CLAUDE.md §7 and the
  // jira-compare skill's Atlaskit-only mandate) with @atlaskit/datetime-picker
  // DatePicker. DatePicker uses ISO yyyy-mm-dd internally just like the
  // native input it replaces, so the existing `from`/`to` callsite contracts
  // don't change. Calendar icon now ships with the picker; CalendarIcon
  // import retained elsewhere in this file for other uses.
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
      <div>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E'), marginBottom: 4 }}>{fromLabel}</div>
        <DatePicker
          value={from || ''}
          onChange={(v: string) => onChange(v || null, to)}
          dateFormat="DD/MM/YYYY"
          placeholder="dd/mm/yyyy"
          spacing="compact"
          weekStartDay={0}
        />
      </div>
      <div style={{ paddingBottom: 8, color: token('color.text.subtlest', '#6B778C') }}>→</div>
      <div>
        <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E'), marginBottom: 4 }}>{toLabel}</div>
        <DatePicker
          value={to || ''}
          onChange={(v: string) => onChange(from, v || null)}
          dateFormat="DD/MM/YYYY"
          placeholder="dd/mm/yyyy"
          spacing="compact"
          weekStartDay={0}
        />
      </div>
    </div>
  );
}
