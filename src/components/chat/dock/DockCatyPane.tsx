/**
 * DockCatyPane — Caty assistant rendered inside the dock's DM-detail shell so
 * it reads like a conversation (the "Slackbot" slot). Slack-mobile header:
 * back + centre pill (Caty face + name/status) + new-chat button. The body is
 * the existing CatyPanel; its own sub-header is hidden via scoped CSS so there
 * is a single header bar. New-chat remounts CatyPanel (fresh conversation).
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useState } from "react";
import { CatyPanel } from "./CatyPanel";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";

interface DockCatyPaneProps {
  onBack: () => void;
}

export function DockCatyPane({ onBack }: DockCatyPaneProps) {
  const [instance, setInstance] = useState(0);

  return (
    <div className="cc-conv-pane cc-caty-pane cv2-chat-shell" style={{ height: "100%", minHeight: 0 }}>
      <div className="cc-cvh">
        <button type="button" className="cc-cvh__back" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="cc-cvh__pill">
          <span className="cc-cvh__ava">
            <span className="cc-caty-pane__face" aria-hidden>
              <CatyMoodFace state="content" size={40} />
            </span>
            <span className="cc-cvh__ava-dot" style={{ background: "var(--ds-icon-success)" }} aria-hidden />
          </span>
          <span className="cc-cvh__id">
            <span className="cc-cvh__title">Caty</span>
            <span className="cc-cvh__sub">Assistant</span>
          </span>
        </div>

        <div className="cc-cvh__actions">
          <button
            type="button"
            className="cc-cvh__btn"
            onClick={() => setInstance((i) => i + 1)}
            aria-label="New chat"
            title="New chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="cc-conv-pane__body">
        <CatyPanel key={instance} viewMode="floating" onViewModeChange={() => {}} />
      </div>
    </div>
  );
}

export default DockCatyPane;
