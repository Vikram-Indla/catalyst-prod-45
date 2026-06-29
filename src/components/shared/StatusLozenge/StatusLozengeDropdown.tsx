/**
 * StatusLozengeDropdown — CANONICAL interactive status pill.
 *
 * Wraps the canonical visual <StatusLozenge> with the dropdown shell ported
 * from the (now-deleted) CatalystStatusPill. One dropdown component for every
 * detail view, header, table editor — no more competing implementations.
 *
 * Architecture: createPortal + getBoundingClientRect anchor
 * ──────────────────────────────────────────────────────────
 * NOT @atlaskit/popup — Popper.js cannot find the trigger inside
 * cv-drawer-sidebar's overflow/transform context → popup lands at (0,0).
 * NOT @atlaskit/dropdown-menu — trigger render prop injects styles that
 * override pill colors.
 *
 * Keyboard nav: ArrowDown/Up/Home/End + Enter/Space to select + Escape to close.
 * Focus returns to trigger on close. Menu items use role="menuitemradio".
 * Colors from ADS bold tokens via statusPalette.ts (dark-mode safe).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import RetryIcon from '@atlaskit/icon/glyph/retry';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';

import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { CatalystWorkflowModal } from '@/components/catalyst-detail-views/shared/workflow/CatalystWorkflowModal';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';
import { toStatusCategory } from '@/components/ads';
import { useCanonicalIssueWorkflow } from '@/hooks/useCanonicalIssueWorkflow';
import { ReasonCaptureModal } from '@/components/catalyst-detail-views/shared/workflow/ReasonCaptureModal';
import { StatusLozenge } from './StatusLozenge';

/** Converts a flat WorkflowStatusOption array → grouped format for the dropdown. */
function buildGroupsFromOptions(
  opts: Array<{ value: string; label: string; color_category: string }>,
) {
  const ORDER: Record<string, { label: string; idx: number }> = {
    todo:        { label: 'TO DO',       idx: 0 },
    in_progress: { label: 'IN PROGRESS', idx: 1 },
    done:        { label: 'DONE',        idx: 2 },
  };
  const map = new Map<string, string[]>();
  for (const o of opts) {
    const cat = o.color_category ?? 'todo';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(o.value);
  }
  return [...map.entries()]
    .sort((a, b) => (ORDER[a[0]]?.idx ?? 9) - (ORDER[b[0]]?.idx ?? 9))
    .map(([cat, statuses]) => ({
      category: cat,
      groupLabel: ORDER[cat]?.label ?? cat.replace(/_/g, ' ').toUpperCase(),
      statuses,
    }));
}


export interface StatusLozengeDropdownProps {
  status?: string | null;
  statusCategory?: string | null;
  onStatusChange?: (newStatus: string, reason?: { code: string | null; text: string | null }) => void;
  issueType?: string | null;
  /** Injected workflow options (e.g. from CreateStoryModal). When provided,
   *  these replace the hardcoded STATUS_OPTION_GROUPS and bypass transition
   *  filtering so all options are selectable as a starting status. */
  statusOptions?: Array<{ value: string; label: string; color_category: string }>;
  /** When false, renders as a static non-interactive <StatusLozenge>. */
  interactive?: boolean;
  /** Pill size (passes through to StatusLozenge). Default 'md' (32px header). */
  size?: 'sm' | 'md';
  /** 2026-06-21 (Vikram canonical): freeze the pill once status category = done. Default true. */
  lockWhenDone?: boolean;
}

export function StatusLozengeDropdown({
  status,
  statusCategory,
  onStatusChange,
  issueType,
  statusOptions,
  interactive = true,
  size = 'md',
  lockWhenDone = true,
}: StatusLozengeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [workflowViewerOpen, setWorkflowViewerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const {
    statusGroups: workflowGroups,
    getAvailableStatuses,
    hasConfig,
    isCanonical,
    requiresReason,
  } = useCanonicalIssueWorkflow(issueType);
  const [reasonTarget, setReasonTarget] = useState<string | null>(null);

  const injectedGroups = useMemo(
    () => (statusOptions && statusOptions.length > 0 ? buildGroupsFromOptions(statusOptions) : null),
    [statusOptions],
  );

  const activeGroups = injectedGroups ?? (hasConfig ? workflowGroups : STATUS_OPTION_GROUPS);
  const display = status || 'Backlog';

  const getMenuItems = useCallback((): HTMLElement[] => {
    if (!menuRef.current) return [];
    return Array.from(menuRef.current.querySelectorAll<HTMLElement>('[data-csp-item]'));
  }, []);

  const close = useCallback((returnFocus = true) => {
    setIsOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onMousedown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      close(false);
    };

    const onKeydown = (e: KeyboardEvent) => {
      const items = getMenuItems();
      const focused = document.activeElement as HTMLElement;
      const idx = items.indexOf(focused);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close(true);
          break;
        case 'ArrowDown':
          e.preventDefault();
          items[idx < items.length - 1 ? idx + 1 : 0]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          items[idx > 0 ? idx - 1 : items.length - 1]?.focus();
          break;
        case 'Home':
          e.preventDefault();
          items[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    };

    document.addEventListener('mousedown', onMousedown);
    document.addEventListener('keydown', onKeydown, true);
    return () => {
      document.removeEventListener('mousedown', onMousedown);
      document.removeEventListener('keydown', onKeydown, true);
    };
  }, [isOpen, close, getMenuItems]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const items = getMenuItems();
      const selected = items.find((el) => el.getAttribute('aria-checked') === 'true');
      (selected ?? items[0])?.focus();
    });
  }, [isOpen, getMenuItems]);

  const isFrozen = lockWhenDone && status ? toStatusCategory(status) === 'done' : false;

  const toggle = () => {
    if (isFrozen) return;
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const w = 220;
      const spaceRight = window.innerWidth - r.left;
      const openLeft = spaceRight < w + 16;
      const rawLeft = openLeft ? r.right - w : r.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8));
      setAnchor({ top: r.bottom + 4, left });
    }
    setIsOpen((o) => !o);
  };

  const pick = (newStatus: string) => {
    setIsOpen(false);
    if (isCanonical && requiresReason(status, newStatus)) {
      setReasonTarget(newStatus);
      return;
    }
    onStatusChange?.(newStatus);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // Non-interactive: just the visual lozenge.
  if (!interactive) {
    return <StatusLozenge status={display} statusCategory={statusCategory} size={size} />;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="status-lozenge-dropdown-trigger"
        disabled={isFrozen}
        title={isFrozen ? `Status frozen — ${display} is final` : undefined}
        aria-label={
          isFrozen
            ? `Status: ${display}. Frozen — done items cannot change status.`
            : `Status: ${display}. Click to change.`
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={toggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: isFrozen ? 'default' : 'pointer',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <StatusLozenge
          status={display}
          statusCategory={statusCategory}
          size={size}
          trailing={
            !isFrozen ? (
              <ChevronDownIcon size="small" label="" primaryColor="currentColor" />
            ) : undefined
          }
        />
      </button>

      {isOpen && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          data-testid="status-lozenge-dropdown-popover"
          role="menu"
          aria-label="Change status"
          style={{
            position: 'fixed',
            top: anchor.top,
            left: anchor.left,
            minWidth: 200,
            maxWidth: 280,
            maxHeight: 360,
            overflowY: 'auto',
            background: token('elevation.surface.overlay', 'var(--ds-surface-overlay)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 'var(--ds-border-radius, 4px)',
            boxShadow: token(
              'elevation.shadow.overlay' as Parameters<typeof token>[0],
              'var(--ds-shadow-overlay)',
            ),
            padding: 0,
            zIndex: 9999,
            fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
          }}
        >
          {(() => {
            const available = new Set(
              !injectedGroups && hasConfig ? getAvailableStatuses(status) : null,
            );
            return activeGroups.map((group, groupIdx) => {
              const visibleStatuses = !injectedGroups && hasConfig
                ? group.statuses.filter((st) => available.has(st))
                : group.statuses;
              if (visibleStatuses.length === 0) return null;
              void groupIdx;
              return (
                <div key={group.category}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 'var(--ds-space-400, 32px)',
                    paddingRight: token('space.150', '12px'),
                    paddingLeft: token('space.150', '12px'),
                  }}>
                    <StatusLozenge
                      status={group.groupLabel}
                      statusCategory={group.category}
                      size="sm"
                    />
                  </div>
                  {visibleStatuses.map((st) => {
                    const isSelected = display === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        data-csp-item
                        tabIndex={-1}
                        data-testid={`status-lozenge-option-${st}`}
                        onClick={() => pick(st)}
                        onFocus={(e) => {
                          if (!isSelected) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)');
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? token('color.background.neutral', 'var(--ds-background-neutral)')
                            : 'transparent';
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)');
                        }}
                        onMouseLeave={(e) => {
                          const isFocused = e.currentTarget === document.activeElement;
                          if (!isSelected && !isFocused) e.currentTarget.style.background = 'transparent';
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          height: 'var(--ds-space-400, 32px)',
                          paddingTop: 0,
                          paddingRight: token('space.150', '12px'),
                          paddingBottom: 0,
                          paddingLeft: token('space.150', '12px'),
                          background: isSelected
                            ? token('color.background.neutral', 'var(--ds-background-neutral)')
                            : 'transparent',
                          border: 'none',
                          borderLeft: isSelected
                            ? `var(--ds-space-025, 3px) solid ${token('color.border.selected', 'var(--ds-border-selected)')}`
                            : 'var(--ds-space-025, 3px) solid transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                      >
                        <StatusLozenge status={st} size="sm" />
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}

          <div style={{ height: 1, background: token('color.border', 'var(--ds-border)'), margin: 0 }} />

          <button
            type="button"
            role="menuitem"
            data-csp-item
            tabIndex={-1}
            data-testid="status-lozenge-view-workflow"
            onClick={() => {
              setIsOpen(false);
              setWorkflowViewerOpen(true);
            }}
            onFocus={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)'); }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)'); }}
            onMouseLeave={(e) => {
              if (e.currentTarget !== document.activeElement) e.currentTarget.style.background = 'transparent';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.100', '8px'),
              width: '100%',
              height: 'var(--ds-space-400, 32px)',
              paddingTop: 0,
              paddingRight: token('space.150', '12px'),
              paddingBottom: 0,
              paddingLeft: token('space.150', '12px'),
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-400)',
              color: token('color.text', 'var(--ds-text)'),
              outline: 'none',
            }}
          >
            <RetryIcon size="small" label="" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
            View workflow
          </button>

          <button
            type="button"
            role="menuitem"
            data-csp-item
            tabIndex={-1}
            data-testid="status-lozenge-explain-workflow"
            onClick={() => close(true)}
            onFocus={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)'); }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)'); }}
            onMouseLeave={(e) => {
              if (e.currentTarget !== document.activeElement) e.currentTarget.style.background = 'transparent';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.100', '8px'),
              width: '100%',
              height: 'var(--ds-space-400, 32px)',
              paddingTop: 0,
              paddingRight: token('space.150', '12px'),
              paddingBottom: 0,
              paddingLeft: token('space.150', '12px'),
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-400)',
              color: token('color.text', 'var(--ds-text)'),
              outline: 'none',
            }}
          >
            <QuestionCircleIcon size="small" label="" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
            Explain workflow
          </button>
        </div>,
        document.body,
      )}

      {workflowViewerOpen && issueType && (
        <CatalystWorkflowModal
          issueTypeName={issueType as WorkItemType}
          currentStatusName={status ?? undefined}
          onClose={() => setWorkflowViewerOpen(false)}
        />
      )}

      {reasonTarget && (
        <ReasonCaptureModal
          entityType={issueType ?? 'item'}
          fromStatus={status ?? null}
          toStatus={reasonTarget}
          onSubmit={(reason) => {
            onStatusChange?.(reasonTarget, reason);
            setReasonTarget(null);
            requestAnimationFrame(() => triggerRef.current?.focus());
          }}
          onCancel={() => setReasonTarget(null)}
        />
      )}
    </>
  );
}

export default StatusLozengeDropdown;
