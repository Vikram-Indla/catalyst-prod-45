/**
 * CANONICAL — Header status pill for all CatalystView* components.
 * Change here → updates all 7 work item types.
 *
 * Architecture: createPortal + getBoundingClientRect anchor
 * ──────────────────────────────────────────────────────────
 * NOT @atlaskit/popup — Popper.js cannot find the trigger inside
 * cv-drawer-sidebar's overflow/transform context → popup lands at (0,0).
 * NOT @atlaskit/dropdown-menu — trigger render prop injects styles
 * that override pill colors.
 *
 * Keyboard nav: ArrowDown/Up/Home/End + Enter/Space to select + Escape to close.
 * Focus returns to trigger on close. menu items use role="menuitemradio".
 * Colors from ADS subtle-tier tokens (dark-mode safe).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import RetryIcon from '@atlaskit/icon/glyph/retry';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';

import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { WorkflowViewerModal } from './WorkflowViewerModal';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 1: STYLE INJECTION (module-level, runs once)
 * ═══════════════════════════════════════════════════════════════════════════ */

const PILL_CLASS = 'csp-v7-pill';

if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('csp-v7-pill-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'csp-v7-pill-styles';
    style.textContent = `
      .${PILL_CLASS} {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 8px;
        border-radius: 3px;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: normal;
        text-transform: none;
        outline: none;
        transition: filter 0.15s ease;
        background: var(--csp-bg);
        color: var(--csp-fg);
      }
      .${PILL_CLASS}:hover,
      .${PILL_CLASS}[aria-expanded="true"] {
        filter: brightness(0.92);
      }
      .${PILL_CLASS}:focus-visible {
        box-shadow:
          0 0 0 2px var(--ds-surface, #FFFFFF),
          0 0 0 4px var(--ds-border-focused, #388BFF);
      }
      [data-csp-item]:focus {
        outline: none;
        background: var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06)) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 2: ADS SUBTLE-TIER COLOR SYSTEM (dark-mode safe)
 * ═══════════════════════════════════════════════════════════════════════════ */

type Appearance = 'success' | 'inprogress' | 'moved' | 'removed' | 'new' | 'default';

function getPillBg(appearance: Appearance): string {
  switch (appearance) {
    case 'success':    return token('color.background.success.bold', '#1F845A');
    case 'inprogress': return token('color.background.information.bold', '#0C66E4');
    case 'moved':      return token('color.background.warning.bold', '#E2B203');
    case 'new':        return token('color.background.discovery.bold', '#8270DB');
    case 'removed':
    default:           return token('color.background.neutral.bold', '#626F86');
  }
}

function getPillFg(appearance: Appearance): string {
  switch (appearance) {
    case 'moved': return token('color.text.inverse', '#FFFFFF');
    default:      return token('color.text.inverse', '#FFFFFF');
  }
}

function getDropdownBg(appearance: Appearance): string {
  switch (appearance) {
    case 'success':    return token('color.background.success', '#DCFFF1');
    case 'inprogress': return token('color.background.information', '#E9F2FF');
    case 'moved':      return token('color.background.warning', '#FFF7D6');
    case 'new':        return token('color.background.discovery', '#F3F0FF');
    case 'removed':
    default:           return token('color.background.neutral', '#F1F2F4');
  }
}

function getDropdownFg(appearance: Appearance): string {
  switch (appearance) {
    case 'success':    return token('color.text.success', '#216E4E');
    case 'inprogress': return token('color.text.information', '#0055CC');
    case 'moved':      return token('color.text.warning', '#7F5F01');
    case 'new':        return token('color.text.discovery', '#5E4DB2');
    case 'removed':
    default:           return token('color.text', '#172B4D');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 3: COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */

interface CatalystStatusPillProps {
  status?: string | null;
  statusCategory?: string | null;
  onStatusChange?: (newStatus: string) => void;
  issueType?: string | null;
}

export function CatalystStatusPill({
  status,
  statusCategory,
  onStatusChange,
  issueType,
}: CatalystStatusPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [workflowViewerOpen, setWorkflowViewerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Workflow-driven statuses from admin/workflows (ph_workflow_* tables)
  const {
    statusGroups: workflowGroups,
    getAvailableStatuses,
    hasConfig,
  } = useIssueTypeWorkflow(issueType);

  // Fall back to static list when no workflow is configured for this type
  const activeGroups = hasConfig ? workflowGroups : STATUS_OPTION_GROUPS;

  const display    = status || 'Backlog';
  const appearance = statusToLozenge(display, statusCategory) as Appearance;

  const pillBg = getPillBg(appearance);
  const pillFg = getPillFg(appearance);

  // ── Helpers ────────────────────────────────────────────────────────────

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

  // ── Click-outside + keyboard handlers ──────────────────────────────────

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

  // Focus first item when menu opens
  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      const items = getMenuItems();
      const selected = items.find((el) => el.getAttribute('aria-checked') === 'true');
      (selected ?? items[0])?.focus();
    });
  }, [isOpen, getMenuItems]);

  // ── Toggle ──────────────────────────────────────────────────────────────

  const toggle = () => {
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, left: r.left });
    }
    setIsOpen((o) => !o);
  };

  // ── Pick handler ────────────────────────────────────────────────────────

  const pick = (newStatus: string) => {
    onStatusChange?.(newStatus);
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={PILL_CLASS}
        data-testid="catalyst-status-pill-trigger"
        aria-label={`Status: ${display}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={toggle}
        style={
          { '--csp-bg': pillBg, '--csp-fg': pillFg } as React.CSSProperties
        }
      >
        {display}
        <ChevronDownIcon
          size="small"
          label=""
          primaryColor={pillFg}
        />
      </button>

      {isOpen && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          data-testid="catalyst-status-pill-popover"
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
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token(
              'elevation.shadow.overlay' as Parameters<typeof token>[0],
              '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
            ),
            padding: '4px 0',
            zIndex: 9999,
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {/* Status groups — driven by admin/workflows config, falls back to static list */}
          {(() => {
            const available = new Set(hasConfig ? getAvailableStatuses(status) : null);
            return activeGroups.map((group) => {
              const visibleStatuses = hasConfig
                ? group.statuses.filter((st) => available.has(st))
                : group.statuses;
              if (visibleStatuses.length === 0) return null;
              return (
                <div key={group.category}>
                  <div
                    style={{
                      padding: '8px 12px 4px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: token('color.text.subtlest', '#8590A2'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {group.groupLabel}
                  </div>
                  {visibleStatuses.map((st) => {
                    const a = statusToLozenge(st, group.category) as Appearance;
                    const bg = getDropdownBg(a);
                    const fg = getDropdownFg(a);
                    const isSelected = display === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        data-csp-item
                        tabIndex={-1}
                        data-testid={`catalyst-status-option-${st}`}
                        onClick={() => pick(st)}
                        onFocus={(e) => {
                          if (!isSelected) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? token('color.background.selected', '#E9F2FF')
                            : 'transparent';
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
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
                          height: 36,
                          padding: '0 12px',
                          background: isSelected
                            ? token('color.background.selected', '#E9F2FF')
                            : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 20,
                            padding: '0 7px',
                            borderRadius: 3,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            background: bg,
                            color: fg,
                          }}
                        >
                          {st}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: 12, color: token('color.text.brand', '#0C66E4'), fontWeight: 600 }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}

          {/* Separator */}
          <div style={{ height: 1, background: token('color.border', '#DFE1E6'), margin: '4px 0' }} />

          {/* View workflow */}
          <button
            type="button"
            role="menuitem"
            data-csp-item
            tabIndex={-1}
            data-testid="catalyst-status-view-workflow"
            onClick={() => {
              setIsOpen(false);
              setWorkflowViewerOpen(true);
            }}
            onFocus={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
            onMouseLeave={(e) => {
              if (e.currentTarget !== document.activeElement) e.currentTarget.style.background = 'transparent';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              height: 36,
              padding: '0 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              color: token('color.text', '#172B4D'),
              outline: 'none',
            }}
          >
            <RetryIcon size="small" label="" primaryColor={token('color.icon.subtle', '#626F86')} />
            View workflow
          </button>

          {/* Explain workflow */}
          <button
            type="button"
            role="menuitem"
            data-csp-item
            tabIndex={-1}
            data-testid="catalyst-status-explain-workflow"
            onClick={() => close(true)}
            onFocus={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
            onMouseLeave={(e) => {
              if (e.currentTarget !== document.activeElement) e.currentTarget.style.background = 'transparent';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              height: 36,
              padding: '0 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              color: token('color.text', '#172B4D'),
              outline: 'none',
            }}
          >
            <QuestionCircleIcon size="small" label="" primaryColor={token('color.icon.subtle', '#626F86')} />
            Explain workflow
          </button>
        </div>,
        document.body,
      )}

      <WorkflowViewerModal
        isOpen={workflowViewerOpen}
        onClose={() => setWorkflowViewerOpen(false)}
        issueType={issueType}
        currentStatus={status}
      />
    </>
  );
}

export default CatalystStatusPill;
