/**
 * DockCatySheet — Slack "Slackbot" assistant sheet, here powered by Caty.
 * Opened from the conversation header's Caty icon. Bottom sheet with a Caty
 * chat (CatyPanel) and a History view toggled from the clock icon.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useState } from "react";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { CatyPanel } from "./CatyPanel";
import type { ChatConversation } from "@/types/chat";

interface DockCatySheetProps {
  conversation: ChatConversation;
  onClose: () => void;
}

export function DockCatySheet({ conversation, onClose }: DockCatySheetProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="cc-catys" role="dialog" aria-modal="true" aria-label="Caty" onClick={onClose}>
      <div className="cc-catys__card" onClick={(e) => e.stopPropagation()}>
        <div className="cc-catys__head">
          <button type="button" className="cc-catys__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          {historyOpen ? (
            <span className="cc-catys__htitle">History</span>
          ) : (
            <span className="cc-catys__id">
              <span className="cc-catys__mark" aria-hidden><CatyMoodFace state="content" size={20} /></span>
              <span className="cc-catys__idtext">
                <span className="cc-catys__name">Caty</span>
                <span className="cc-catys__sub">{conversation.title}</span>
              </span>
            </span>
          )}

          <button
            type="button"
            className="cc-catys__hist"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={historyOpen ? "New chat" : "History"}
            title={historyOpen ? "New chat" : "History"}
          >
            {historyOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
              </svg>
            )}
          </button>
        </div>

        <div className="cc-catys__body">
          {historyOpen ? (
            <div className="cc-catys__empty">No past conversations yet</div>
          ) : (
            <CatyPanel viewMode="floating" onViewModeChange={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DockCatySheet;
