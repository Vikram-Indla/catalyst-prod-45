/**
 * CANONICAL — Header status pill for all CatalystView* components.
 * Change here → updates all 7 work item types (everything except Story,
 * which has its own equivalent in StoryDetailModal:1162+).
 *
 * Apr 28, 2026 (jira-compare cycle 4 — Phase B B1):
 *   Jira renders an editable status pill at top-right of the H1 in
 *   every issue detail surface (probed live on BAU-5711, BAU-5470,
 *   BAU-4517 — `[data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"]`).
 *   Catalyst's CatalystView* surfaces showed the title with NO visible
 *   status near it — users had to scroll to the right sidebar to see
 *   what state the work item was in. This component renders the
 *   Atlaskit Lozenge (same colour-mapping as the table cell + sidebar
 *   pill via `statusToLozenge`) right under the title, with a
 *   click-to-open picker that fires the supplied `onStatusChange`.
 *
 *   Picker uses `createPortal`-to-body for the dropdown popover (same
 *   workaround as DangerConfirmModal / Improve dialogs — the
 *   `@atlaskit/dropdown-menu` portal-empty bug bites here too).
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { WorkflowViewerModal } from './WorkflowViewerModal';

/**
 * 2026-05-29 — ADS spec implementation.
 *   CatalystStatusPill now uses @atlaskit/lozenge isBold appearance, delegating
 *   all colour logic to ADS design tokens (--ds-background-*-bold, --ds-text-inverse).
 *   The previous hand-rolled statusBg() using Jira-probed hex values is removed;
 *   the ADS token system handles light + dark theme correctly out of the box.
 */

interface CatalystStatusPillProps {
  /** Current status name (e.g. "To Do", "In Progress", "Ready for QA"). */
  status?: string | null;
  /** Jira workflow statusCategory key — drives the Atlaskit Lozenge
   *  appearance per Jira NIN parity. When omitted, statusToLozenge
   *  falls back to name-based mapping (less accurate). */
  statusCategory?: string | null;
  /** Called when the user picks a different status from the dropdown. */
  onStatusChange?: (newStatus: string) => void;
  /** Issue type — used to look up the workflow for "View workflow". */
  issueType?: string | null;
}

export function CatalystStatusPill({ status, statusCategory, onStatusChange, issueType }: CatalystStatusPillProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [workflowViewerOpen, setWorkflowViewerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      // Allow clicks inside the portal popover.
      const popover = document.querySelector('[data-testid="catalyst-status-pill-popover"]');
      if (popover && popover.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = () => {
    if (!triggerRef.current) return;
    if (open) {
      setOpen(false);
      return;
    }
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
    setOpen(true);
  };

  const display = status || 'Backlog';

  return (
    <>
      {/* 2026-05-29: button is a transparent click-target; Lozenge isBold
          provides all visual styling via ADS --ds-background-*-bold tokens. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change status"
        data-testid="catalyst-status-pill-trigger"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'filter 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.88)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      >
        {/* Header pill — Jira-probed: 32px/14px/500/padding 0 10px/rgb(148,199,72) success */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 32,
          lineHeight: '32px',
          padding: '0 10px',
          borderRadius: 3,
          fontSize: 14,
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: 'normal',
          background: ({
            success:    'rgb(148, 199, 72)',
            inprogress: 'rgb(143, 184, 246)',
            moved:      'rgb(243, 214, 100)',
            removed:    'rgb(221, 222, 225)',
            new:        'rgb(184, 172, 246)',
            default:    'rgb(221, 222, 225)',
          } as Record<string, string>)[statusToLozenge(display, statusCategory)] ?? 'rgb(221, 222, 225)',
          color: 'rgb(41, 42, 46)',
        }}>
          {display}
          <ChevronDownIcon size="small" label="" />
        </span>
      </button>

      {open && anchor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="catalyst-status-pill-popover"
            className="cv-status-listbox"
            role="menu"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              minWidth: 220,
              maxHeight: 360,
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              padding: '4px 0',
              zIndex: 9999,
            }}
          >
            {STATUS_OPTION_GROUPS.map((group) => {
              /* jira-compare 2026-05-05 — Fix: dropdown lozenge appearance must
                 use the GROUP category (todo/in_progress/done), NOT the status
                 name lookup. Using statusToLozenge(name) caused "In Requirements"
                 and "In Design" (which are in the TO DO group) to render as bold
                 blue because they were individually mapped to 'inprogress' in the
                 name table. The group.category is the correct source of truth here —
                 it matches Jira's status-picker where colour = workflow category. */
              const groupAppearance: 'default' | 'inprogress' | 'success' =
                group.category === 'done'
                  ? 'success'
                  : group.category === 'in_progress'
                  ? 'inprogress'
                  : 'default';

              return (
                <div key={group.category}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: token('color.text.subtle', '#6B6E76'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '8px 12px 4px',
                      marginTop: 4,
                    }}
                  >
                    {group.groupLabel}
                  </div>
                  {group.statuses.map((st) => {
                    const isActive = display === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          if (onStatusChange) onStatusChange(st);
                          setOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          height: 36,
                          padding: '0 12px',
                          background: isActive
                            ? token('color.background.selected', '#E9F2FF')
                            : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 14,
                          color: token('color.text', '#292A2E'),
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Dropdown pill — Jira-probed colors, sentence-case, no uppercase */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 20,
                          padding: '0 7px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          background: ({
                            success:    'rgb(148, 199, 72)',
                            inprogress: 'rgb(143, 184, 246)',
                            default:    'rgb(221, 222, 225)',
                          } as Record<string, string>)[groupAppearance] ?? 'rgb(221, 222, 225)',
                          color: 'rgb(41, 42, 46)',
                        }}>
                          {st}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: 12, color: token('color.text.brand', '#0C66E4'), fontWeight: 600 }}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {/* jira-compare 2026-05-04 — "View workflow" / "Explain workflow" footer
                matches Jira's status picker footer (probed BAU-5609). Stubs for now;
                clicking either opens a toast until workflow viewer is built. */}
            <div style={{
              borderTop: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
              padding: '4px 0',
              marginTop: 4,
            }}>
              {[
                { label: 'View workflow',    icon: '⟳' },
                { label: 'Explain workflow', icon: '✦' },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    if (label === 'View workflow') setWorkflowViewerOpen(true);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', height: 36, padding: '0 12px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 14, color: token('color.text', '#292A2E'),
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 12, color: token('color.text.subtle', '#505258') }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {/* View workflow modal — wired to /admin/workflow definitions via WorkflowProvider */}
      <WorkflowViewerModal
        isOpen={workflowViewerOpen}
        onClose={() => setWorkflowViewerOpen(false)}
        issueType={issueType}
        currentStatus={status}
      />
    </>
  );
}
