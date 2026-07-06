import React from 'react';
import { createPortal } from 'react-dom';

interface DockPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional sticky footer row (e.g. primary + cancel buttons). */
  footer?: React.ReactNode;
}

/**
 * DockPanel — in-dock slide-over overlay used INSTEAD of a viewport-centered
 * @atlaskit/modal-dialog for flows triggered inside the chat dock (New channel,
 * Add people, Roster, New group DM, Browse channels).
 *
 * It portals into the `.cc-dock` root and covers ONLY the dock (position:absolute
 * inset:0, clipped by the dock's rounded/overflow-hidden box) — never the page —
 * so a docked flow never floats off in the viewport corner.
 *
 * Callers that also render on the /chat page keep the ADS modal: when no dock is
 * mounted `dockRoot` is null and this returns null, so the caller branches to its
 * modal shell instead (see the `dockScoped` prop on the shared roster/add-people
 * components).
 */
export function DockPanel({ title, onClose, children, footer }: DockPanelProps) {
  const dockRoot =
    typeof document !== 'undefined' ? document.querySelector('.cc-dock') : null;
  if (!dockRoot) return null;

  return createPortal(
    <div className="cc-dock-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cc-dock-panel__head">
        <button
          type="button"
          className="cc-dock-panel__back"
          onClick={onClose}
          aria-label="Back"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="cc-dock-panel__title">{title}</span>
      </div>
      <div className="cc-dock-panel__body">{children}</div>
      {footer && <div className="cc-dock-panel__foot">{footer}</div>}
    </div>,
    dockRoot,
  );
}

export default DockPanel;
