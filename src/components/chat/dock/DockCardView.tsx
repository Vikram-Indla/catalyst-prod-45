/**
 * DockCardView — full-screen detail surface opened from the Home cards
 * (Later / Huddles / Threads). Slack-mobile pattern: a back button + centred
 * title header, then the list fills the panel (the bottom nav stays visible).
 * Later reuses the chat-v2 LaterPanel; Huddles lists recent missed huddles;
 * Threads is a placeholder until an all-threads query exists.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React from "react";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { LaterPanel } from "@/features/chat-v2/components/Later/LaterPanel";
import { useMissedCalls } from "@/hooks/chat/useMissedCalls";

export type CardKind = "later" | "huddles" | "threads";

const TITLES: Record<CardKind, string> = { later: "Later", huddles: "Huddles", threads: "Threads" };

interface DockCardViewProps {
  kind: CardKind;
  onBack: () => void;
  onSelect: (id: string) => void;
}

export function DockCardView({ kind, onBack, onSelect }: DockCardViewProps) {
  const { missed } = useMissedCalls();

  return (
    <div className="cc-cardv" role="region" aria-label={TITLES[kind]}>
      <div className="cc-cardv__hdr">
        <button type="button" className="cc-cvh__back" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="cc-cardv__title">{TITLES[kind]}</span>
      </div>

      <div className="cc-cardv__body">
        {kind === "later" && <LaterPanel showRightBorder={false} />}

        {kind === "huddles" && (
          missed.length > 0 ? (
            <div className="cc-cardsheet__list">
              {missed.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="cc-nm__row"
                  onClick={() => { onSelect(m.conversationId); onBack(); }}
                >
                  <AtlaskitAvatar name={m.callerName} seed={m.conversationId} pixelSize={32} shape="square" />
                  <span className="cc-dms__body">
                    <span className="cc-dms__name">{m.callerName}</span>
                    <span className="cc-dms__preview">Missed huddle</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="cc-catys__empty">No recent huddles</div>
          )
        )}

        {kind === "threads" && <div className="cc-catys__empty">No threads yet</div>}
      </div>
    </div>
  );
}

export default DockCardView;
