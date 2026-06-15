/**
 * Hub-agnostic primitive components for the shared Timeline.
 *
 * - PortalMenu — positioned dropdown that escapes overflow:hidden ancestors
 *   (per CLAUDE.md 2026-06-13 — Atlaskit dropdown-menu would render at 0,0)
 * - MenuItemRow — single menu item with optional checkbox
 * - ModalDateField — date input + @atlaskit/calendar dropdown
 * - EmptyRowAdd — hover + button on empty rows that opens the add-dates modal
 * - InlineEmptyOverlay — centered prompt when the whole tree has no dates
 * - ViewSettingsPanel — checkboxes for "show progress" / "show releases"
 * - TimelineBarPopover — hover card over a Gantt bar
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import EditorAddIcon from '@atlaskit/icon/glyph/editor/add';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import Avatar from '@atlaskit/avatar';
import Checkbox from '@atlaskit/checkbox';
import AkCalendar from '@atlaskit/calendar';
import Tooltip from '@atlaskit/tooltip';
import { Calendar, GanttChart } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusPill } from '@/components/shared/StatusPill';
import { resolveAvatarUrl } from '@/lib/avatars';
import { ROW_H, BAR_H, type TimelineIssue } from './types';
import { formatDateCompact } from './utils';

/* ─────────────────────────────── portal menu ───────────────────────── */

interface PortalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  minWidth?: number;
  alignRight?: boolean;
  children: React.ReactNode;
}

export function PortalMenu({ isOpen, onClose, triggerRef, minWidth = 200, alignRight = false, children }: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [isOpen, onClose, triggerRef]);
  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const pos = alignRight
    ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
    : { top: rect.bottom + 4, left: rect.left };
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu options"
      style={{
        position: 'fixed',
        ...pos,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))',
        padding: '4px 0',
        minWidth,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItemRow({
  label, isChecked, onClick, disabled = false, danger = false,
}: {
  label: string; isChecked?: boolean; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <div
      role="menuitem"
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        color: danger
          ? 'var(--ds-text-danger, #AE2A19)'
          : disabled
            ? 'var(--ds-text-disabled, #A5ADBA)'
            : 'var(--ds-text, #172B4D)',
        fontFamily: 'var(--ds-font-family-body)',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {isChecked !== undefined && (
        <div style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: `2px solid ${isChecked ? 'var(--ds-border-selected, #0052CC)' : 'var(--ds-border, #DFE1E6)'}`,
          background: isChecked ? 'var(--ds-background-selected-bold, #0052CC)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isChecked && <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      )}
      {label}
    </div>
  );
}

/* ─────────────────────────────── modal date field ──────────────────── */
/* @atlaskit DatePicker's calendar uses @atlaskit/popper which collapses
   to viewport-origin (0,0) inside the modal's overflow:hidden scroll container
   (CLAUDE.md 2026-06-13). This anchors @atlaskit/calendar via PortalMenu instead. */

export function ModalDateField({
  value, onChange, placeholder, ariaLabel,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const validMonth = parsed && !isNaN(parsed.getTime());
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', height: 40, padding: '0 8px', boxSizing: 'border-box',
          border: `1px solid ${open ? 'var(--ds-border-focused, #388BFF)' : 'var(--ds-border-input, #DFE1E6)'}`,
          borderRadius: 3, background: 'var(--ds-background-input, #FFFFFF)',
          cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14, color: value ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-subtlest, #626F86)' }}>
          {value || placeholder}
        </span>
        <span style={{ lineHeight: 0, color: 'var(--ds-text-subtle, #42526E)', flexShrink: 0 }}>
          <Calendar size={16} />
        </span>
      </button>
      <PortalMenu isOpen={open} onClose={() => setOpen(false)} triggerRef={btnRef} minWidth={0}>
        <AkCalendar
          selected={value ? [value] : []}
          defaultMonth={validMonth ? parsed!.getMonth() + 1 : undefined}
          defaultYear={validMonth ? parsed!.getFullYear() : undefined}
          onSelect={(e) => { onChange(e.iso); setOpen(false); }}
        />
      </PortalMenu>
    </>
  );
}

/* ─────────────────────── empty-row add-dates lane ───────────────── */

export function EmptyRowAdd({ rowTop, addLeft, onAdd }: { rowTop: number; addLeft: number; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_H, zIndex: 1 }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        aria-label="Add dates"
        title="Add dates"
        style={{
          position: 'absolute', left: addLeft, top: (ROW_H - 24) / 2, width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed var(--ds-border-bold, #8590A2)', borderRadius: 3,
          background: 'var(--ds-surface, #FFFFFF)', cursor: 'pointer',
          color: 'var(--ds-text-subtle, #42526E)',
          opacity: hovered ? 1 : 0, transition: 'opacity 120ms ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        <EditorAddIcon label="" size="small" />
      </button>
    </div>
  );
}

/* ─────────────────────────────── inline empty overlay ──────────────── */

export function InlineEmptyOverlay({ projectKey, onDismiss }: { projectKey: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8,
      boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.15))',
      zIndex: 20, minWidth: 280,
    }}>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, border: 'none', borderRadius: 3,
          background: 'transparent', cursor: 'pointer',
          color: 'var(--ds-text-subtlest, #626F86)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <CrossIcon label="Dismiss" size="small" />
      </button>
      <GanttChart style={{ width: 40, height: 40, color: 'var(--ds-text-subtlest, #626F86)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          No issues with dates
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
          Add start or due dates to issues in {projectKey} to see them on the timeline.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────── view settings panel ───────────────── */

interface ViewSettingsPanelProps {
  showProgress: boolean;
  showReleases: boolean;
  onToggleProgress: () => void;
  onToggleReleases: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function ViewSettingsPanel({ showProgress, showReleases, onToggleProgress, onToggleReleases, onClose, triggerRef }: ViewSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [onClose, triggerRef]);
  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return createPortal(
    <div ref={panelRef} style={{
      position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8,
      boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))', padding: '12px 0',
      minWidth: 220, zIndex: 9999,
    }}>
      <div style={{ padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', letterSpacing: '0.06em', fontFamily: 'var(--ds-font-family-body)' }}>
        View settings
      </div>
      <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '0 0 8px' }} />
      <div style={{ padding: '4px 12px' }}>
        <Checkbox label="Show progress" isChecked={showProgress} onChange={onToggleProgress} />
      </div>
      <div style={{ padding: '4px 12px' }}>
        <Checkbox label="Show releases" isChecked={showReleases} onChange={onToggleReleases} />
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────── timeline bar popover ──────────────── */

export function TimelineBarPopover({ issue, disabled, children }: {
  issue: TimelineIssue;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const enterTimer = useRef<number | undefined>(undefined);
  const leaveTimer = useRef<number | undefined>(undefined);
  const CARD_W = 280;

  const open = useCallback(() => {
    if (disabled) return;
    let el: Element | null = triggerRef.current;
    if (!el) return;
    let r = el.getBoundingClientRect();
    while (r.width === 0 && r.height === 0 && el?.firstElementChild) {
      el = el.firstElementChild;
      r = el.getBoundingClientRect();
    }
    if (r.width === 0 && r.height === 0) return;
    setRect(r);
    setIsOpen(true);
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setRect(null);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(leaveTimer.current);
  }, []);

  const cardTop = rect ? (rect.top > 144 ? rect.top - 140 : rect.bottom + 6) : 0;
  const cardLeft = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - CARD_W - 8)) : 0;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => { window.clearTimeout(leaveTimer.current); enterTimer.current = window.setTimeout(open, 300); }}
        onMouseLeave={() => { window.clearTimeout(enterTimer.current); leaveTimer.current = window.setTimeout(close, 200); }}
        style={{ display: 'inline-flex', alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}
      >
        {children}
      </span>
      {isOpen && rect && createPortal(
        <div
          data-timeline-bar-popover="true"
          onMouseEnter={() => window.clearTimeout(leaveTimer.current)}
          onMouseLeave={() => { leaveTimer.current = window.setTimeout(close, 200); }}
          style={{
            position: 'fixed', top: cardTop, left: cardLeft, width: CARD_W,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 6,
            boxShadow: '0 8px 28px rgba(9,30,66,0.2)',
            padding: '12px 14px',
            zIndex: 9999,
            fontFamily: 'var(--ds-font-family-body)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <JiraIssueTypeIcon type={issue.issueType} size={14} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-code, monospace)', flexShrink: 0 }}>
              {issue.issueKey}
            </span>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)', lineHeight: 1.4, marginBottom: 10,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {issue.summary}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: issue.assigneeDisplayName ? 8 : 0 }}>
            {issue.status && <StatusPill value={issue.statusCategory} label={issue.status} />}
            {(issue.startDate || issue.dueDate) && (
              <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #626F86)' }}>
                {[issue.startDate, issue.dueDate].filter(Boolean).map(d => formatDateCompact(d)).join(' → ')}
              </span>
            )}
          </div>
          {issue.assigneeDisplayName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar size="xsmall" src={resolveAvatarUrl(issue.assigneeDisplayName) ?? undefined} name={issue.assigneeDisplayName} />
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #626F86)' }}>{issue.assigneeDisplayName}</span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
