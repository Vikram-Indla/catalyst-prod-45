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

const svg = (path: React.ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

interface DockHomeCardsProps {
  onOpenCaty: () => void;
  onThreads: () => void;
  onHuddles: () => void;
  onLater: () => void;
}

export function DockHomeCards({ onOpenCaty, onThreads, onHuddles, onLater }: DockHomeCardsProps) {
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

      <button type="button" role="listitem" className="cc-cards__card" onClick={onHuddles}>
        <span className="cc-cards__icon" aria-hidden>
          {svg(<><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z" /><path d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></>)}
        </span>
        <span className="cc-cards__title">Huddles</span>
        <span className="cc-cards__sub">Recent calls</span>
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
