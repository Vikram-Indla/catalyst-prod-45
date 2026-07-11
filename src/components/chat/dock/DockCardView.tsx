/**
 * DockCardView — full-screen detail surface opened from the Home cards
 * (Later / Huddles / Threads). Slack-mobile pattern: a back button + centred
 * title header, then the list fills the panel (the bottom nav stays visible).
 * Later reuses the chat-v2 LaterPanel (its own header, with the dock back
 * button injected via leftSlot); Huddles lists recent missed huddles; Threads
 * is a placeholder until an all-threads query exists.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useEffect } from "react";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { LaterPanel } from "@/features/chat-v2/components/Later/LaterPanel";
import { DockReminderModal } from "./DockReminderModal";
import { useMissedCalls } from "@/hooks/chat/useMissedCalls";
import { useChatTheme } from "@/features/chat-v2/hooks/useChatTheme";

export type CardKind = "later" | "huddles" | "threads";

const TITLES: Record<CardKind, string> = { later: "Later", huddles: "Huddles", threads: "Threads" };

interface DockCardViewProps {
  kind: CardKind;
  onBack: () => void;
  onSelect: (id: string) => void;
  /** Open a specific message in its conversation (jump + outline highlight). */
  onOpenMessage: (conversationId: string, messageId: string) => void;
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="cc-cvh__back" onClick={onBack} aria-label="Back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

export function DockCardView({ kind, onBack, onSelect, onOpenMessage }: DockCardViewProps) {
  const { missed } = useMissedCalls();
  const { theme } = useChatTheme();

  // LaterPanel's portaled popovers (filter menu) resolve --cv2-* tokens off
  // body[data-cv2-theme]; without it they render transparent/unstyled. Set it
  // while the Later view is mounted (mirrors DockConversationPane).
  useEffect(() => {
    if (kind !== "later") return;
    const prev = document.body.dataset.cv2Theme;
    document.body.dataset.cv2Theme = theme;
    return () => {
      if (prev === undefined) delete document.body.dataset.cv2Theme;
      else document.body.dataset.cv2Theme = prev;
    };
  }, [kind, theme]);

  // Later reuses LaterPanel's own header (single header, filter/+ on the right).
  // The dock back button is injected at the start via leftSlot.
  if (kind === "later") {
    return (
      <div className="cc-cardv" role="region" aria-label="Later">
        <div className="cc-cardv__body">
          <LaterPanel
            showRightBorder={false}
            selectedItemId={null}
            leftSlot={<BackButton onBack={onBack} />}
            renderCreateModal={(p) => <DockReminderModal {...p} />}
            onSelectItem={(item) => {
              if (item.conversationId && item.messageId) {
                onOpenMessage(item.conversationId, item.messageId);
              } else if (item.conversationId) {
                onSelect(item.conversationId);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cc-cardv" role="region" aria-label={TITLES[kind]}>
      <div className="cc-cardv__hdr">
        <BackButton onBack={onBack} />
        <span className="cc-cardv__title">{TITLES[kind]}</span>
      </div>

      <div className="cc-cardv__body">
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
