/**
 * DockMoreTab — Slack-mobile "More" tab (bottom nav). Lists secondary
 * destinations: Files, Assigned to you. The "You" profile lives in a modal
 * opened from the header avatar (DockYouModal), not here.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React from "react";

const S = (path: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

interface MoreEntry {
  key: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const ENTRIES: MoreEntry[] = [
  {
    key: "files",
    label: "Files",
    sub: "Browse your canvases, lists and attachments",
    icon: S(<><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" /><path d="M14 2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /></>),
  },
  {
    key: "assigned",
    label: "Assigned to you",
    sub: "Tick off your tasks",
    icon: S(<><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>),
  },
];

export function DockMoreTab() {
  return (
    <div className="cc-more">
      <div className="cc-tab-hdr">More</div>
      {ENTRIES.map((e) => (
        <button key={e.key} type="button" className="cc-more__entry">
          <span className="cc-more__entry-icon" aria-hidden>{e.icon}</span>
          <span className="cc-more__entry-body">
            <span className="cc-more__entry-label">{e.label}</span>
            <span className="cc-more__entry-sub">{e.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default DockMoreTab;
