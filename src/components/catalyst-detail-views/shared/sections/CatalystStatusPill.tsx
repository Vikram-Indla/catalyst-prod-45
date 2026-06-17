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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import RetryIcon from '@atlaskit/icon/glyph/retry';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';

import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { CatalystWorkflowModal } from '../workflow/CatalystWorkflowModal';
import type { WorkItemType } from '@/hooks/useTypeWorkflow';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';
import { statusBg, statusFg } from './statusPalette';

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
      .${PILL_CLASS}[data-csp-compact="true"] {
        height: 24px;
        padding: 0 6px;
        font-size: 12px;
        gap: 3px;
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
 * SECTION 2: COLOR SYSTEM — Jira-probed (BAU-5774 / BAU-5609)
 *
 * THREE tiers exist for Jira status colors:
 *   BOLD    color.background.success.bold  #1F845A  dark, white text  ← BAU-5774 flagged WRONG
 *   SUBTLE  color.background.success       #DCFFF1  very light        ← too washed out vs Jira
 *   JIRA    (no ADS token)                 #94C748  medium pastel     ← DOM-probed, used here
 *
 * Text is ALWAYS dark (#292A2E) — Jira never uses white on status buttons.
 * WCAG AA ratios: success 7.23:1, inprogress 6.84:1, moved 10.91:1,
 *                 new 6.52:1, removed 5.67:1, default 10.36:1
 *
 * Used identically for both the header trigger pill and each dropdown option
 * pill — one color system, no mismatch between header and dropdown.
 * ═══════════════════════════════════════════════════════════════════════════ */

type Appearance = 'success' | 'inprogress' | 'moved' | 'removed' | 'new' | 'default';

// Canonical palette — single source of truth in statusPalette.ts.
const getStatusBg = statusBg;
const getStatusFg = statusFg;

/**
 * Maps a workflow group's category to an appearance string.
 * Used for dropdown pills — group wins over individual status name
 * to prevent statusToLozenge name-matching from overriding group color
 * (e.g. "On Hold" in todo group → grey, not yellow).
 */
function groupCategoryToAppearance(cat: string): string {
  switch (cat) {
    case 'done':        return 'success';
    case 'in_progress': return 'inprogress';
    case 'moved':       return 'moved';
    case 'removed':     return 'removed';
    case 'new':         return 'new';
    default:            return 'default';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 3: COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */

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

interface CatalystStatusPillProps {
  status?: string | null;
  statusCategory?: string | null;
  onStatusChange?: (newStatus: string) => void;
  issueType?: string | null;
  /** Injected workflow options (e.g. from CreateStoryModal). When provided,
   *  these replace the hardcoded STATUS_OPTION_GROUPS and bypass transition
   *  filtering so all options are selectable as a starting status. */
  statusOptions?: Array<{ value: string; label: string; color_category: string }>;
  /** When false, renders as static non-interactive pill (for table cells).
   *  When true or omitted, renders interactive dropdown (default). */
  interactive?: boolean;
  /** When true, renders compact 24px height (table cells). Omit or false for 32px (default). */
  compact?: boolean;
}

export function CatalystStatusPill({
  status,
  statusCategory,
  onStatusChange,
  issueType,
  statusOptions,
  interactive = true,
  compact = false,
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

  // Caller-injected options (e.g. from CreateStoryModal resolvedStatusOptions).
  // When provided, these take precedence and bypass transition filtering.
  const injectedGroups = useMemo(
    () => (statusOptions && statusOptions.length > 0 ? buildGroupsFromOptions(statusOptions) : null),
    [statusOptions],
  );

  // Fall back to static list when no workflow is configured for this type
  const activeGroups = injectedGroups ?? (hasConfig ? workflowGroups : STATUS_OPTION_GROUPS);

  const display    = status || 'Backlog';
  const appearance = statusToLozenge(display, statusCategory) as Appearance;

  const pillBg = getStatusBg(appearance);
  const pillFg = getStatusFg(appearance);

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

  // Non-interactive mode: static pill (used in table cells AND inside
  // popup options — where the surrounding MenuItemBtn owns the click).
  //
  // 2026-06-17: `pointer-events: none` is critical. When the static pill is
  // rendered as a popup option's child (StatusPopupCell / EditorPopover),
  // the disabled inner button would otherwise SWALLOW the click event and
  // the surrounding MenuItemBtn.onClick (which actually commits the status
  // change) would never fire. Letting clicks pass through fixes "popup
  // opens but selecting an option does nothing" on the Tasks list.
  if (!interactive) {
    // Rendered as a <span>, NOT a <button>: the static pill is frequently
    // mounted inside an interactive wrapper (makeStatusEditCell's trigger
    // button, JiraTable cell editors, popup MenuItemBtn). A nested <button>
    // is invalid HTML (validateDOMNesting) and an a11y focus-ambiguity defect.
    // `pointerEvents: none` keeps clicks passing through to the owning control
    // (preserves the 2026-06-17 popup-option fix).
    return (
      <span
        className={PILL_CLASS}
        data-testid="catalyst-status-pill-static"
        data-csp-compact={compact ? 'true' : 'false'}
        style={
          { '--csp-bg': pillBg, '--csp-fg': pillFg, cursor: 'default', opacity: 1, pointerEvents: 'none' } as React.CSSProperties
        }
      >
        {display}
      </span>
    );
  }

  // Interactive mode: dropdown (default)
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={PILL_CLASS}
        data-testid="catalyst-status-pill-trigger"
        data-csp-compact={compact ? 'true' : 'false'}
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
          {/* Status groups — injected options > workflow engine > static fallback */}
          {(() => {
            const available = new Set(
              !injectedGroups && hasConfig ? getAvailableStatuses(status) : null,
            );
            return activeGroups.map((group) => {
              const visibleStatuses = !injectedGroups && hasConfig
                ? group.statuses.filter((st) => available.has(st))
                : group.statuses;
              if (visibleStatuses.length === 0) return null;
              return (
                <div key={group.category}>
                  <div
                    style={{
                      padding: '8px 8px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: token('color.text.subtlest', '#8590A2'),
                      letterSpacing: '0.06em',
                    }}
                  >
                    {group.groupLabel}
                  </div>
                  {visibleStatuses.map((st) => {
                    const groupAppearance = groupCategoryToAppearance(group.category);
                    const bg = getStatusBg(groupAppearance);
                    const fg = getStatusFg(groupAppearance);
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
                          height: 32,
                          padding: '0 8px',
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
                            padding: '0 8px',
                            borderRadius: 3,
                            fontSize: 11,
                            fontWeight: 600,
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
              height: 32,
              padding: '0 8px',
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
              height: 32,
              padding: '0 8px',
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

      {workflowViewerOpen && issueType && (
        <CatalystWorkflowModal
          issueTypeName={issueType as WorkItemType}
          currentStatusName={status ?? undefined}
          onClose={() => setWorkflowViewerOpen(false)}
        />
      )}
    </>
  );
}

export default CatalystStatusPill;
