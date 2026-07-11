/**
 * DockConvHeader — Slack-mobile conversation/thread header for the dock detail
 * view. Back + centre pill (avatar + name + sub) + Caty and Huddle icons.
 * Dock-scoped (does NOT touch the shared chat-v2 ConversationHeader used by
 * the /chat page). Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React from "react";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import type { ChatConversation } from "@/types/chat";

interface DockConvHeaderProps {
  conversation: ChatConversation;
  isThread?: boolean;
  onBack: () => void;
  onCaty: () => void;
  onHuddle: () => void;
  huddleBusy?: boolean;
}

export function DockConvHeader({ conversation, isThread, onBack, onCaty, onHuddle, huddleBusy }: DockConvHeaderProps) {
  const isChannel = conversation.kind === "channel" || conversation.kind === "custom_channel";
  const title = isThread ? "Thread" : conversation.title;
  // No per-person presence on the conversation object — default availability.
  const status = "In office";
  const sub = isThread
    ? conversation.title
    : isChannel
      ? "Channel"
      : conversation.ticketKey ?? status;

  return (
    <div className="cc-cvh">
      <button type="button" className="cc-cvh__back" onClick={onBack} aria-label="Back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="cc-cvh__pill">
        {isChannel ? (
          <span className="cc-cvh__hash" aria-hidden>#</span>
        ) : (
          <span className="cc-cvh__ava">
            <AtlaskitAvatar name={conversation.title} seed={conversation.id} pixelSize={40} />
            <span className="cc-cvh__ava-dot" style={{ background: "var(--ds-icon-success)" }} aria-hidden />
          </span>
        )}
        <span className="cc-cvh__id">
          <span className="cc-cvh__title">{title}</span>
          {sub && <span className="cc-cvh__sub">{sub}</span>}
        </span>
      </div>

      <div className="cc-cvh__actions">
        <button type="button" className="cc-cvh__caty" onClick={onCaty} aria-label="Ask Caty" title="Ask Caty">
          <CatyMoodFace state="content" size={22} />
        </button>
        <button
          type="button"
          className="cc-cvh__btn"
          onClick={onHuddle}
          disabled={huddleBusy}
          aria-label="Start huddle"
          title="Start huddle"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default DockConvHeader;
