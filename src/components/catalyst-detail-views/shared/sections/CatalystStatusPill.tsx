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
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { statusToLozenge, type LozengeAppearance } from '@/modules/project-work-hub/utils/statusToLozenge';
import { WorkflowViewerModal } from './WorkflowViewerModal';

/**
 * jira-compare 2026-05-04 (D1 — P0): Jira header status pill uses a plain
 * button with a LIGHT category background + dark text (14px/500/#292A2E),
 * NOT an Atlaskit Lozenge. DOM-probed on BAU-5609 (Story, "In QA"):
 *   height: 32px, background: rgb(148,199,72), color: #292A2E,
 *   fontSize: 14px, fontWeight: 500, borderRadius: 3px, border: none.
 * Using ADS token equivalents per statusCategory appearance.
 */
function statusBg(appearance: LozengeAppearance): string {
  switch (appearance) {
    case 'success':    return token('color.background.success',    '#DFFCF0');
    case 'inprogress': return token('color.background.information', '#E9F2FF');
    case 'moved':      return token('color.background.warning',    '#FFF7D6');
    case 'removed':    return token('color.background.danger',     '#FFEDEB');
    case 'new':        return token('color.background.discovery',  '#F3F0FF');
    default:           return token('color.background.neutral',    '#F1F2F4');
  }
}

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
      {/* Apr 28, 2026 (jira-compare cycle 5 — Phase B B9): pill sticks
          immediately below the (also-sticky) title editor at
          `top: 32px` so the title + status form a unified sticky
          header. Wrapper div carries the sticky positioning so that
          the popover anchor measurement uses the trigger's static
          position — wrapping the button avoids breaking the
          getBoundingClientRect baseline that `toggle()` relies on. */}
      <div
        style={{
          position: 'sticky',
          top: 32,
          zIndex: 9,
          background: 'var(--ds-surface, #FFFFFF)',
          marginBottom: 12,
        }}
      >
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
          gap: 6,
          /* jira-compare 2026-05-04 (D1): 32px height, no border, light
             ADS category bg, dark text — matches Jira BAU-5609 DOM probe. */
          height: 32,
          padding: '0 10px',
          border: 'none',
          borderRadius: 3,
          background: statusBg(statusToLozenge(display, statusCategory)),
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'filter 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.92)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      >
        {/* jira-compare 2026-05-04 (D1): plain text at 14px/500/color.text
            replacing @atlaskit/lozenge which rendered 11px white-on-bold. */}
        <span style={{
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '20px',
          color: token('color.text', '#292A2E'),
        }}>
          {display}
        </span>
        <ChevronDownIcon size="small" primaryColor={token('color.icon.subtle', '#42526E') as string} />
      </button>
      </div>

      {open && anchor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="catalyst-status-pill-popover"
            role="menu"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              minWidth: 220,
              maxHeight: 360,
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              padding: '4px 0',
              zIndex: 9999,
            }}
          >
            {STATUS_OPTION_GROUPS.map((group) => (
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
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* jira-compare 2026-05-04 (D1 popup correction): Jira's status
                          picker popup uses solid isBold Lozenges for destination statuses —
                          same as the isBold pattern used in Jira's workflow-transition
                          popup (IN DEVELOPMENT, IN UAT etc). Light tokens were wrong here;
                          reverted to isBold Lozenge which matches the solid-colored pills
                          Jira renders in the picker. Trigger button keeps the light-bg
                          statusBg() pattern (header pill, not picker item). */}
                      <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                        <Lozenge appearance={statusToLozenge(st)} isBold={statusToLozenge(st) !== 'default'}>{st}</Lozenge>
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
            ))}
            {/* jira-compare 2026-05-04 — "View workflow" / "Explain workflow" footer
                matches Jira's status picker footer (probed BAU-5609). Stubs for now;
                clicking either opens a toast until workflow viewer is built. */}
            <div style={{
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
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
