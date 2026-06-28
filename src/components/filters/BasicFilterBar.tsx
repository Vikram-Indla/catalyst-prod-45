/**
 * BasicFilterBar — inline chip-based filter builder.
 *
 * Matches Jira's filter toolbar pattern:
 *   [Assignee ∨]  [Type ∨]  [Status ∨]  [Priority ∨]  [More filters ∨]
 *
 * Each chip opens its own positioned dropdown for that field only.
 * Active chips show a count badge and the selected background.
 * "More filters" opens a wider panel covering Reporter, Fix Versions,
 * Labels, and Date ranges.
 *
 * Props are the same pools already fetched by useFilterOptionPools —
 * no new data fetching needed.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import { Checkbox as AkCheckbox } from '@atlaskit/checkbox';
import { DatePicker } from '@atlaskit/datetime-picker';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import HighestPriIcon from '@atlaskit/icon/core/priority-highest';
import HighPriIcon    from '@atlaskit/icon/core/priority-high';
import MediumPriIcon  from '@atlaskit/icon/core/priority-medium';
import LowPriIcon     from '@atlaskit/icon/core/priority-low';
import LowestPriIcon  from '@atlaskit/icon/core/priority-lowest';
import CrossCircleIcon from '@atlaskit/icon/core/cross-circle';
import Button from '@atlaskit/button/new';
import { resolveAvatarUrl } from '@/lib/avatars';
import type {
  JiraFilterValue,
  AssigneeOption,
  ReporterOption,
  StatusFilterOption,
  WorkTypeOption,
  SprintReleaseOption,
  LabelOption,
  PriorityLevel,
} from '@/components/shared/JiraFilterAtlaskit';
import { emptyFilterValue } from '@/components/shared/JiraFilterAtlaskit';
import type { LozengeAppearance } from '@/components/shared/JiraTable';

// ── Priority vocabulary ──────────────────────────────────────────────────────

const PRIORITY_OPTS: Array<{
  level: PriorityLevel;
  label: string;
  icon: React.ReactNode;
}> = [
  { level: 'highest', label: 'Highest', icon: <HighestPriIcon label="" size="small" /> },
  { level: 'high',    label: 'High',    icon: <HighPriIcon    label="" size="small" /> },
  { level: 'medium',  label: 'Medium',  icon: <MediumPriIcon  label="" size="small" /> },
  { level: 'low',     label: 'Low',     icon: <LowPriIcon     label="" size="small" /> },
  { level: 'lowest',  label: 'Lowest',  icon: <LowestPriIcon  label="" size="small" /> },
];

// ── Props ────────────────────────────────────────────────────────────────────

export interface BasicFilterBarProps {
  value: JiraFilterValue;
  onChange: (next: JiraFilterValue) => void;
  assignees?: AssigneeOption[];
  reporters?: ReporterOption[];
  statuses?: StatusFilterOption[];
  workTypes?: WorkTypeOption[];
  sprintReleases?: SprintReleaseOption[];
  labels?: LabelOption[];
  isLoading?: boolean;
}

// ── Chip base ─────────────────────────────────────────────────────────────────

interface ChipButtonProps {
  label: string;
  count: number;
  isOpen: boolean;
  onClick: () => void;
  chipRef: React.RefObject<HTMLButtonElement>;
}

function ChipButton({ label, count, isOpen, onClick, chipRef }: ChipButtonProps) {
  const active = count > 0;
  return (
    <button
      ref={chipRef}
      type="button"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 32,
        padding: '0 8px',
        borderRadius: 3,
        border: `1px solid ${isOpen || active
          ? token('color.border.selected', 'var(--ds-link)')
          : token('color.border', 'var(--ds-border)')}`,
        background: active
          ? token('color.background.selected', 'var(--ds-background-selected)')
          : isOpen
            ? `var(--ds-background-neutral-subtle-hovered)`
            : `var(--ds-surface)`,
        color: active || isOpen
          ? token('color.text.selected', 'var(--ds-link)')
          : token('color.text', 'var(--ds-text)'),
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 400,
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 80ms, border-color 80ms',
      }}
    >
      <span>{label}</span>
      {active && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 10,
            background: token('color.background.accent.blue.bolder', 'var(--ds-link)'),
            color: token('color.text.inverse', 'var(--ds-text-inverse)'),
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 653,
          }}
        >
          {count}
        </span>
      )}
      <ChevronDownIcon label="" size="small" />
    </button>
  );
}

// ── Dropdown shell ────────────────────────────────────────────────────────────

interface DropdownShellProps {
  triggerRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  label?: string;
  onClear?: () => void;
  hasSelections?: boolean;
}

function DropdownShell({
  triggerRef,
  onClose,
  children,
  width = 240,
  label,
  onClear,
  hasSelections,
}: DropdownShellProps) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      // Keep dropdown within viewport width
      const left = Math.min(r.left, window.innerWidth - width - 8);
      setPos({ top: r.bottom + 4, left });
    }
  }, [triggerRef, width]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (dropRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, triggerRef]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={dropRef}
      role="dialog"
      aria-label={label ?? 'Filter options'}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 9999,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 4,
        boxShadow: token('elevation.shadow.overlay', '0 8px 24px -4px var(--ds-shadow-raised, rgba(9,30,66,0.18))'),
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        fontFamily: 'var(--ds-font-family-sans, ui-sans-serif, system-ui, sans-serif)',
        fontSize: 'var(--ds-font-size-400)',
      }}
    >
      {(label || hasSelections) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        }}>
          {label && (
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
              {label}
            </span>
          )}
          {hasSelections && onClear && (
            <Button
              appearance="link"
              spacing="none"
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </div>
      )}
      <div style={{ padding: '8px 0' }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Checkbox option row ───────────────────────────────────────────────────────

function CheckRow({
  label,
  isChecked,
  onChange,
  icon,
}: {
  label: string;
  isChecked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        cursor: 'pointer',
        background: isChecked
          ? `var(--ds-background-selected)`
          : 'transparent',
        color: token('color.text', 'var(--ds-text)'),
      }}
      onMouseEnter={e => {
        if (!isChecked) (e.currentTarget as HTMLElement).style.background = `var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral-subtle))`;
      }}
      onMouseLeave={e => {
        if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <AkCheckbox isChecked={isChecked} onChange={onChange} label="" />
      {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
      <span style={{ fontSize: 'var(--ds-font-size-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </label>
  );
}

// ── Section label inside "More filters" ──────────────────────────────────────

function MoreSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0 0 12px' }}>
      <div style={{
        padding: '8px 12px 4px',
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 653,
        color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BasicFilterBar({
  value,
  onChange,
  assignees = [],
  reporters = [],
  statuses = [],
  workTypes = [],
  sprintReleases = [],
  labels = [],
  isLoading,
}: BasicFilterBarProps) {
  type OpenChip = 'assignee' | 'type' | 'status' | 'priority' | 'more' | null;
  const [openChip, setOpenChip] = useState<OpenChip>(null);

  const assigneeRef  = useRef<HTMLButtonElement>(null);
  const typeRef      = useRef<HTMLButtonElement>(null);
  const statusRef    = useRef<HTMLButtonElement>(null);
  const priorityRef  = useRef<HTMLButtonElement>(null);
  const moreRef      = useRef<HTMLButtonElement>(null);

  const toggle = useCallback((chip: OpenChip) => {
    setOpenChip(prev => prev === chip ? null : chip);
  }, []);

  const close = useCallback(() => setOpenChip(null), []);

  const upd = useCallback(<K extends keyof JiraFilterValue>(key: K, v: JiraFilterValue[K]) => {
    onChange({ ...value, [key]: v });
  }, [onChange, value]);

  const toggleMulti = useCallback(<K extends keyof JiraFilterValue>(
    key: K,
    id: string,
    current: string[]
  ) => {
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    upd(key, next as JiraFilterValue[K]);
  }, [upd]);

  // Count for "More filters" badge
  const moreCount =
    value.reporter.length +
    value.sprintReleases.length +
    value.labels.length +
    (value.updated.from || value.updated.to ? 1 : 0) +
    (value.created.from || value.created.to ? 1 : 0) +
    (value.dateRange.start || value.dateRange.due ? 1 : 0);

  const hasAny =
    value.assignees.length + value.workType.length + value.status.length +
    value.priority.length + moreCount > 0;

  return (
    <div>
      {/* Chip toolbar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

        {/* Assignee */}
        <ChipButton
          label="Assignee"
          count={value.assignees.length}
          isOpen={openChip === 'assignee'}
          onClick={() => toggle('assignee')}
          chipRef={assigneeRef}
        />
        {openChip === 'assignee' && (
          <DropdownShell
            triggerRef={assigneeRef}
            onClose={close}
            label="ASSIGNEE"
            hasSelections={value.assignees.length > 0}
            onClear={() => upd('assignees', [])}
          >
            {assignees.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontStyle: 'italic' }}>
                {isLoading ? 'Loading…' : 'No assignees found'}
              </div>
            ) : (
              assignees.map(a => (
                <CheckRow
                  key={a.id}
                  label={a.name}
                  isChecked={value.assignees.includes(a.id)}
                  onChange={() => toggleMulti('assignees', a.id, value.assignees)}
                  icon={
                    <Avatar
                      size="xsmall"
                      name={a.name}
                      src={resolveAvatarUrl(a.name) ?? a.avatarUrl ?? undefined}
                    />
                  }
                />
              ))
            )}
          </DropdownShell>
        )}

        {/* Work type */}
        <ChipButton
          label="Type"
          count={value.workType.length}
          isOpen={openChip === 'type'}
          onClick={() => toggle('type')}
          chipRef={typeRef}
        />
        {openChip === 'type' && (
          <DropdownShell
            triggerRef={typeRef}
            onClose={close}
            label="WORK TYPE"
            hasSelections={value.workType.length > 0}
            onClear={() => upd('workType', [])}
          >
            {workTypes.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontStyle: 'italic' }}>
                {isLoading ? 'Loading…' : 'No work types found'}
              </div>
            ) : (
              workTypes.map(w => (
                <CheckRow
                  key={w.id}
                  label={w.label}
                  isChecked={value.workType.includes(w.id)}
                  onChange={() => toggleMulti('workType', w.id, value.workType)}
                  icon={w.icon}
                />
              ))
            )}
          </DropdownShell>
        )}

        {/* Status */}
        <ChipButton
          label="Status"
          count={value.status.length}
          isOpen={openChip === 'status'}
          onClick={() => toggle('status')}
          chipRef={statusRef}
        />
        {openChip === 'status' && (
          <DropdownShell
            triggerRef={statusRef}
            onClose={close}
            label="STATUS"
            width={260}
            hasSelections={value.status.length > 0}
            onClear={() => upd('status', [])}
          >
            {statuses.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontStyle: 'italic' }}>
                {isLoading ? 'Loading…' : 'No statuses found'}
              </div>
            ) : (
              statuses.map(s => (
                <CheckRow
                  key={s.value}
                  label={s.label}
                  isChecked={value.status.includes(s.value)}
                  onChange={() => toggleMulti('status', s.value, value.status)}
                  icon={<span data-cp-lozenge-jira-parity><Lozenge appearance={s.appearance as LozengeAppearance}>{s.label}</Lozenge></span>}
                />
              ))
            )}
          </DropdownShell>
        )}

        {/* Priority */}
        <ChipButton
          label="Priority"
          count={value.priority.length}
          isOpen={openChip === 'priority'}
          onClick={() => toggle('priority')}
          chipRef={priorityRef}
        />
        {openChip === 'priority' && (
          <DropdownShell
            triggerRef={priorityRef}
            onClose={close}
            label="PRIORITY"
            hasSelections={value.priority.length > 0}
            onClear={() => upd('priority', [])}
          >
            {PRIORITY_OPTS.map(p => (
              <CheckRow
                key={p.level}
                label={p.label}
                isChecked={value.priority.includes(p.level)}
                onChange={() => toggleMulti('priority', p.level, value.priority as string[])}
                icon={p.icon}
              />
            ))}
          </DropdownShell>
        )}

        {/* More filters */}
        <ChipButton
          label="More filters"
          count={moreCount}
          isOpen={openChip === 'more'}
          onClick={() => toggle('more')}
          chipRef={moreRef}
        />
        {openChip === 'more' && (
          <DropdownShell
            triggerRef={moreRef}
            onClose={close}
            width={320}
            label="MORE FILTERS"
            hasSelections={moreCount > 0}
            onClear={() => onChange({
              ...value,
              reporter: [],
              sprintReleases: [],
              labels: [],
              updated: {},
              created: {},
              dateRange: {},
            })}
          >
            {/* Reporter */}
            <MoreSection label="Reporter">
              {reporters.length === 0 ? (
                <div style={{ padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontStyle: 'italic' }}>
                  {isLoading ? 'Loading…' : 'No reporters found'}
                </div>
              ) : (
                reporters.map(r => (
                  <CheckRow
                    key={r.id}
                    label={r.name}
                    isChecked={value.reporter.includes(r.id)}
                    onChange={() => toggleMulti('reporter', r.id, value.reporter)}
                    icon={
                      <Avatar
                        size="xsmall"
                        name={r.name}
                        src={resolveAvatarUrl(r.name) ?? r.avatarUrl ?? undefined}
                      />
                    }
                  />
                ))
              )}
            </MoreSection>

            {/* Sprint/Iteration */}
            {sprintReleases.length > 0 && (
              <MoreSection label="Sprint/Iteration">
                {sprintReleases.map(fv => (
                  <CheckRow
                    key={fv.id}
                    label={fv.label}
                    isChecked={value.sprintReleases.includes(fv.id)}
                    onChange={() => toggleMulti('sprintReleases', fv.id, value.sprintReleases)}
                  />
                ))}
              </MoreSection>
            )}

            {/* Labels */}
            {labels.length > 0 && (
              <MoreSection label="Label">
                {labels.map(l => (
                  <CheckRow
                    key={l.id}
                    label={l.label}
                    isChecked={value.labels.includes(l.id)}
                    onChange={() => toggleMulti('labels', l.id, value.labels)}
                  />
                ))}
              </MoreSection>
            )}

            {/* Date ranges */}
            <MoreSection label="Created">
              <div style={{ padding: '4px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), marginBottom: 4 }}>From</div>
                    <DatePicker
                      value={value.created.from || ''}
                      onChange={(v: string) => upd('created', { ...value.created, from: v || null })}
                      dateFormat="DD/MM/YYYY"
                      placeholder="dd/mm/yyyy"
                      spacing="compact"
                    />
                  </div>
                  <div style={{ paddingBottom: 8, color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-200)' }}>→</div>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), marginBottom: 4 }}>To</div>
                    <DatePicker
                      value={value.created.to || ''}
                      onChange={(v: string) => upd('created', { ...value.created, to: v || null })}
                      dateFormat="DD/MM/YYYY"
                      placeholder="dd/mm/yyyy"
                      spacing="compact"
                    />
                  </div>
                </div>
              </div>
            </MoreSection>

            <MoreSection label="Updated">
              <div style={{ padding: '4px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), marginBottom: 4 }}>From</div>
                    <DatePicker
                      value={value.updated.from || ''}
                      onChange={(v: string) => upd('updated', { ...value.updated, from: v || null })}
                      dateFormat="DD/MM/YYYY"
                      placeholder="dd/mm/yyyy"
                      spacing="compact"
                    />
                  </div>
                  <div style={{ paddingBottom: 8, color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-200)' }}>→</div>
                  <div>
                    <div style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtle)'), marginBottom: 4 }}>To</div>
                    <DatePicker
                      value={value.updated.to || ''}
                      onChange={(v: string) => upd('updated', { ...value.updated, to: v || null })}
                      dateFormat="DD/MM/YYYY"
                      placeholder="dd/mm/yyyy"
                      spacing="compact"
                    />
                  </div>
                </div>
              </div>
            </MoreSection>
          </DropdownShell>
        )}

        {/* Clear all — only when something is active */}
        {hasAny && (
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={CrossCircleIcon}
            onClick={() => onChange(emptyFilterValue)}
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
