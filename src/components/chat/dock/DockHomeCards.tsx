/**
 * DockHomeCards — Slack-mobile Home "cards rail" (Catch Up / Slackbot / Threads
 * / Huddles / Later). Here the assistant slot is Caty. Horizontal scroll row
 * above the directory. Caty opens the assistant; the rest are the cloned
 * surface (wired to real destinations in a later slice).
 *
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001. ADS tokens throughout.
 */
import React from "react";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { useActiveHuddleIds, useActiveHuddle } from "@/hooks/chat/useHuddleData";
import type { ChatConversation } from "@/types/chat";

const svg = (path: React.ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

interface DockHomeCardsProps {
  conversations: ChatConversation[];
  onOpenCaty: () => void;
  onThreads: () => void;
  onHuddles: () => void;
  onLater: () => void;
}

export function DockHomeCards({ conversations, onOpenCaty, onThreads, onHuddles, onLater }: DockHomeCardsProps) {
  // Live huddles: conversations that currently have an active huddle. When any
  // are live, the Huddles card lights up (purple) with a count + participant
  // avatars — Slack-mobile parity.
  const activeHuddleIds = useActiveHuddleIds();
  const liveHuddles = conversations.filter((c) => activeHuddleIds.has(c.id));
  const liveCount = activeHuddleIds.size;
  const isLive = liveCount > 0;

  // Participants of the first live huddle → grouped avatars (me + others), so
  // the card shows every face in the call, not just the DM's other person.
  const firstLiveId = liveHuddles[0]?.id ?? null;
  const { huddle } = useActiveHuddle(firstLiveId);
  const participants = huddle?.participants ?? [];

  return (
    <div className="cc-cards" role="list" aria-label="Quick access">
      <button type="button" role="listitem" className="cc-cards__card" onClick={onOpenCaty}>
        <span className="cc-cards__icon cc-cards__icon--caty" aria-hidden>
          <CatyMoodFace state="content" size={18} />
        </span>
        <span className="cc-cards__title">Caty</span>
        <span className="cc-cards__sub">Ask anything</span>
      </button>

      <button type="button" role="listitem" className="cc-cards__card" onClick={onThreads}>
        <span className="cc-cards__icon" aria-hidden>
          {svg(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>)}
        </span>
        <span className="cc-cards__title">Threads</span>
        <span className="cc-cards__sub">View replies</span>
      </button>

      <button
        type="button"
        role="listitem"
        className={`cc-cards__card${isLive ? " cc-cards__card--live" : ""}`}
        onClick={onHuddles}
      >
        <span className="cc-cards__hrow">
          <span className="cc-cards__icon" aria-hidden>
            {svg(<><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z" /><path d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></>)}
          </span>
          {isLive && (
            <span className="cc-cards__stack" aria-hidden>
              {(participants.length > 0
                ? participants.slice(0, 3).map((p) => ({ key: p.userId, name: p.name, seed: p.userId }))
                : liveHuddles.slice(0, 2).map((c) => ({ key: c.id, name: c.title, seed: c.id }))
              ).map((a) => (
                <span key={a.key} className="cc-cards__stack-ava">
                  <AtlaskitAvatar name={a.name} seed={a.seed} pixelSize={20} />
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="cc-cards__title">Huddles</span>
        <span className="cc-cards__sub">{isLive ? `${liveCount} live` : "Recent calls"}</span>
      </button>

      <button type="button" role="listitem" className="cc-cards__card" onClick={onLater}>
        <span className="cc-cards__icon" aria-hidden>
          {svg(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />)}
        </span>
        <span className="cc-cards__title">Later</span>
        <span className="cc-cards__sub">Saved items</span>
      </button>
    </div>
  );
}

export default DockHomeCards;
