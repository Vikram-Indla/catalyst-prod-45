/**
 * DockYouModal — Slack "You" profile sheet. Opens (as a full-cover overlay
 * inside the dock) when the header avatar is tapped. X to close.
 *
 * Real profile header (avatar + name + presence) from useAuth, a status field,
 * and the Slack "You" menu. Menu actions are the cloned surface — wired later.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useState } from "react";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { useAuth } from "@/hooks/useAuth";

const S = (path: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  value?: string;
}

interface DockYouModalProps {
  onClose: () => void;
}

export function DockYouModal({ onClose }: DockYouModalProps) {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = meta.full_name || meta.name || user?.email || "You";
  const seed = user?.id ?? name;

  const topItems: MenuItem[] = [
    { key: "pause", label: "Pause notifications", value: "Off", icon: S(<><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.9 17.9 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" /></>) },
  ];

  // Availability statuses — mirrors Catalyst's own user menu (dot colours = ADS
  // semantic tokens: success / information / warning).
  const availability = [
    { key: "onsite", label: "In office", color: "var(--ds-icon-success)" },
    { key: "remote", label: "Remote", color: "var(--ds-icon-information)" },
    { key: "away", label: "Away", color: "var(--ds-icon-warning)" },
  ];
  const [status, setStatus] = useState("onsite");
  const current = availability.find((a) => a.key === status) ?? availability[0];
  const listItems: MenuItem[] = [
    { key: "profile", label: "View profile", icon: S(<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>) },
  ];

  return (
    <div className="cc-you" role="dialog" aria-modal="true" aria-label="You" onClick={onClose}>
      <div className="cc-you__sheet" onClick={(e) => e.stopPropagation()}>
      <div className="cc-you__head">
        <button type="button" className="cc-you__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <div className="cc-you__scroll">
        <div className="cc-more__head">
          <span className="cc-ava">
            <AtlaskitAvatar name={name} seed={seed} pixelSize={40} shape="square" />
            <span className="cc-ava-dot" style={{ background: current.color }} aria-hidden />
          </span>
          <div className="cc-more__ident">
            <div className="cc-more__name">{name}</div>
            <div className="cc-more__status">{current.label}</div>
          </div>
        </div>

        <button type="button" className="cc-more__statusfield">
          <span className="cc-more__item-icon" aria-hidden>{S(<><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9" y2="9" /><line x1="15" y1="9" x2="15" y2="9" /></>)}</span>
          <span>What's your status?</span>
        </button>

        {topItems.map((it) => (
          <button key={it.key} type="button" className="cc-more__item">
            <span className="cc-more__item-icon" aria-hidden>{it.icon}</span>
            <span className="cc-more__item-label">{it.label}</span>
            {it.value && <span className="cc-more__item-value">{it.value}</span>}
          </button>
        ))}

        <div className="cc-you__avail-label">Set availability</div>
        {availability.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`cc-you__avail-row${status === a.key ? " cc-you__avail-row--active" : ""}`}
            aria-pressed={status === a.key}
            onClick={() => setStatus(a.key)}
          >
            <span className="cc-you__dot" style={{ background: a.color }} aria-hidden />
            <span>{a.label}</span>
          </button>
        ))}

        <div className="cc-more__divider" />

        {listItems.map((it) => (
          <button key={it.key} type="button" className="cc-more__item">
            <span className="cc-more__item-icon" aria-hidden>{it.icon}</span>
            <span className="cc-more__item-label">{it.label}</span>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}

export default DockYouModal;
