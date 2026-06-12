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
 * This version mirrors BrStatusSection.tsx exactly:
 * - triggerRef on the button
 * - getBoundingClientRect() anchor computed on open
 * - createPortal to document.body with position:fixed + zIndex:9999
 * - Custom dropdown items with inline styles (no Atlaskit rendering issues)
 * - click-outside + Escape close handlers
 */
import React, { useEffect, useRef, useState } from 'react';
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

const PILL_CLASS = 'csp-v4-pill';

if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('csp-v4-pill-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'csp-v4-pill-styles';
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
    `;
    document.head.appendChild(style);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION 2: COLOR TOKEN SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════ */

// Jira-actual header pill colors (DOM-probed 2026-05-05, mirrored from BrStatusSection)
const PILL_BG: Record<string, string> = {
  success:    'rgb(148, 199, 72)',
  inprogress: 'rgb(143, 184, 246)',
  moved:      'rgb(243, 214, 100)',
  removed:    'rgb(221, 222, 225)',
  new:        'rgb(184, 172, 246)',
  default:    'rgb(221, 222, 225)',
};

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

  // Workflow-driven statuses from admin/workflows (ph_workflow_* tables)
  const {
    statusGroups: workflowGroups,
    getAvailableStatuses,
    hasConfig,
  } = useIssueTypeWorkflow(issueType);

  // Fall back to static list when no workflow is configured for this type
  const activeGroups = hasConfig ? workflowGroups : STATUS_OPTION_GROUPS;

  const display    = status || 'Backlog';
  const appearance = statusToLozenge(display, statusCategory) as string;
  const headerBg   = PILL_BG[appearance] ?? PILL_BG.default;

  // Close on click-outside
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      const pop = document.querySelector('[data-testid="catalyst-status-pill-popover"]');
      if (pop?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen]);

  const toggle = () => {
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, left: r.left });
    }
    setIsOpen((o) => !o);
  };

  const handleStatusSelect = (newStatus: string) => {
    onStatusChange?.(newStatus);
    setIsOpen(false);
  };

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
        style={{
          background: headerBg,
          color: 'rgb(41, 42, 46)',
        }}
      >
        {display}
        <ChevronDownIcon
          size="small"
          label=""
          primaryColor="rgb(41, 42, 46)"
        />
      </button>

      {isOpen && anchor && typeof document !== 'undefined' && createPortal(
        <div
          data-testid="catalyst-status-pill-popover"
          role="menu"
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
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
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
                    const a = statusToLozenge(st, group.category) as string;
                    const bg = PILL_BG[a] ?? PILL_BG.default;
                    const isSelected = display === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="menuitem"
                        data-testid={`catalyst-status-option-${st}`}
                        onClick={() => handleStatusSelect(st)}
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
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? token('color.background.selected', '#E9F2FF')
                            : 'transparent';
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
                            color: 'rgb(41, 42, 46)',
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
            data-testid="catalyst-status-view-workflow"
            onClick={() => {
              setIsOpen(false);
              setWorkflowViewerOpen(true);
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
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <RetryIcon size="small" label="" primaryColor={token('color.icon.subtle', '#626F86')} />
            View workflow
          </button>

          {/* Explain workflow */}
          <button
            type="button"
            role="menuitem"
            data-testid="catalyst-status-explain-workflow"
            onClick={() => setIsOpen(false)}
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
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
