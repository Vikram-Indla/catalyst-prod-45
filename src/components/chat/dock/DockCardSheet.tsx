/**
 * DockCardSheet — bottom sheet opened from the Home cards (Later / Huddles /
 * Threads). Later reuses the chat-v2 LaterPanel; Huddles lists recent missed
 * huddles; Threads is a placeholder until an all-threads query exists.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React from "react";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { LaterPanel } from "@/features/chat-v2/components/Later/LaterPanel";
import { useMissedCalls } from "@/hooks/chat/useMissedCalls";

export type CardKind = "later" | "huddles" | "threads";

const TITLES: Record<CardKind, string> = { later: "Later", huddles: "Huddles", threads: "Threads" };

interface DockCardSheetProps {
  kind: CardKind;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function DockCardSheet({ kind, onClose, onSelect }: DockCardSheetProps) {
  const { missed } = useMissedCalls();

  return (
    <div className="cc-catys" role="dialog" aria-modal="true" aria-label={TITLES[kind]} onClick={onClose}>
      <div className="cc-catys__card" onClick={(e) => e.stopPropagation()}>
        <div className="cc-catys__head">
          <button type="button" className="cc-catys__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
          <span className="cc-catys__htitle">{TITLES[kind]}</span>
        </div>

        <div className="cc-catys__body">
          {kind === "later" && <LaterPanel showRightBorder={false} />}

          {kind === "huddles" && (
            missed.length > 0 ? (
              <div className="cc-cardsheet__list">
                {missed.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="cc-nm__row"
                    onClick={() => { onSelect(m.conversationId); onClose(); }}
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
    </div>
  );
}

export default DockCardSheet;
