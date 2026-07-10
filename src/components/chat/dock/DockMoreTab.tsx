/**
 * DockMoreTab — Slack-mobile "You / More" surface for the chat dock.
 *
 * Real profile header (avatar + name + presence) from useAuth, a status field,
 * and the Slack "You" menu. Sign out is wired (real, safe). The remaining menu
 * entries are the cloned surface; their actions are wired in a later slice.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001 (Slice 4).
 */
import React from "react";
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
  onClick?: () => void;
  danger?: boolean;
}

export function DockMoreTab() {
  const { user, signOut } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string };
  const name = meta.full_name || meta.name || user?.email || "You";
  const seed = user?.id ?? name;

  const items: MenuItem[] = [
    { key: "pause", label: "Pause notifications", value: "Off", icon: S(<><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.9 17.9 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" /></>) },
    { key: "away", label: "Set yourself as away", icon: S(<><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4" /><circle cx="18" cy="17" r="4" /><path d="M18 15.5V17l1 1" /></>) },
  ];

  const listItems: MenuItem[] = [
    { key: "invites", label: "Invitations to connect", icon: S(<><rect x="4" y="3" width="16" height="18" rx="1" /><line x1="8" y1="7" x2="8" y2="7" /><line x1="12" y1="7" x2="12" y2="7" /><line x1="8" y1="11" x2="8" y2="11" /><line x1="12" y1="11" x2="12" y2="11" /></>) },
    { key: "profile", label: "View profile", icon: S(<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>) },
    { key: "vip", label: "VIP", icon: S(<polygon points="12 2 15 8.5 22 9.3 17 14 18.5 21 12 17.3 5.5 21 7 14 2 9.3 9 8.5 12 2" />) },
    { key: "notifs", label: "Notifications", icon: S(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>) },
    { key: "prefs", label: "Preferences", icon: S(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>) },
  ];

  return (
    <div className="cc-more">
      <div className="cc-more__head">
        <AtlaskitAvatar name={name} seed={seed} pixelSize={40} shape="square" presence="green" />
        <div className="cc-more__ident">
          <div className="cc-more__name">{name}</div>
          <div className="cc-more__status">Active</div>
        </div>
      </div>

      <button type="button" className="cc-more__statusfield">
        <span className="cc-more__item-icon" aria-hidden>{S(<><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9" y2="9" /><line x1="15" y1="9" x2="15" y2="9" /></>)}</span>
        <span>What's your status?</span>
      </button>

      {items.map((it) => (
        <button key={it.key} type="button" className="cc-more__item" onClick={it.onClick}>
          <span className="cc-more__item-icon" aria-hidden>{it.icon}</span>
          <span className="cc-more__item-label">{it.label}</span>
          {it.value && <span className="cc-more__item-value">{it.value}</span>}
        </button>
      ))}

      <div className="cc-more__divider" />

      {listItems.map((it) => (
        <button key={it.key} type="button" className="cc-more__item" onClick={it.onClick}>
          <span className="cc-more__item-icon" aria-hidden>{it.icon}</span>
          <span className="cc-more__item-label">{it.label}</span>
        </button>
      ))}

      <div className="cc-more__divider" />

      <button type="button" className="cc-more__item" onClick={() => signOut?.()}>
        <span className="cc-more__item-icon" aria-hidden>{S(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>)}</span>
        <span className="cc-more__item-label">Sign out</span>
      </button>
    </div>
  );
}

export default DockMoreTab;
