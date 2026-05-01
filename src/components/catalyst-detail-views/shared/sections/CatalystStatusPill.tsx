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
import { ChevronDown } from 'lucide-react';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';

interface CatalystStatusPillProps {
  /** Current status name (e.g. "To Do", "In Progress", "Ready for QA"). */
  status?: string | null;
  /** Called when the user picks a different status from the dropdown. */
  onStatusChange?: (newStatus: string) => void;
}

export function CatalystStatusPill({ status, onStatusChange }: CatalystStatusPillProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
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
          background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
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
          height: 28,
          padding: '0 8px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 4,
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
          e.currentTarget.style.borderColor = token('color.border.bold', '#C1C7D0');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = token('color.border', '#DFE1E6');
        }}
      >
        <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}><Lozenge appearance={statusToLozenge(display)}>{display}</Lozenge></span>
        <ChevronDown size={12} color={token('color.icon.subtle', '#42526E') as string} />
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
                      <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}><Lozenge appearance={statusToLozenge(st)}>{st}</Lozenge></span>
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
          </div>,
          document.body,
        )}
    </>
  );
}
