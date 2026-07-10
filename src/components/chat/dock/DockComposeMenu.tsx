/**
 * DockComposeMenu — Slack compose popover shown when the "+" FAB is tapped.
 * Huddle / Channel entries + a primary "Message" pill. Appears above the FAB
 * (bottom-right) over a tap-to-dismiss backdrop.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React from "react";

const S = (path: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

interface DockComposeMenuProps {
  onClose: () => void;
  onMessage: () => void;
  onChannel: () => void;
  onHuddle: () => void;
}

export function DockComposeMenu({ onClose, onMessage, onChannel, onHuddle }: DockComposeMenuProps) {
  return (
    <div className="cc-compose" role="dialog" aria-label="New" onClick={onClose}>
      <div className="cc-compose__card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cc-compose__item" onClick={onHuddle}>
          <span className="cc-compose__icon" aria-hidden>{S(<><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></>)}</span>
          <span className="cc-compose__body">
            <span className="cc-compose__label">Huddle</span>
            <span className="cc-compose__sub">Start an audio or video chat</span>
          </span>
        </button>

        <button type="button" className="cc-compose__item" onClick={onChannel}>
          <span className="cc-compose__icon" aria-hidden>{S(<><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></>)}</span>
          <span className="cc-compose__body">
            <span className="cc-compose__label">Channel</span>
            <span className="cc-compose__sub">Organize teams and work</span>
          </span>
        </button>

        <button type="button" className="cc-compose__msg" onClick={onMessage}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          <span>Message</span>
        </button>
      </div>
    </div>
  );
}

export default DockComposeMenu;
