/**
 * DockNewHuddleModal — Slack "New Huddle" screen. Search + a list of people and
 * channels; tapping one shows a confirmation sheet, and "Huddle" starts the call
 * via useHuddleActions().startOrJoin.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useMemo, useRef, useEffect, useState } from "react";
import Textfield from "@atlaskit/textfield";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import ProjectIcon from "@/components/shared/ProjectIcon";
import { useChatPeople } from "@/hooks/chat/useChatPeople";
import { useStartDm } from "@/hooks/chat/useStartDm";
import { useHuddleActions } from "@/hooks/chat/useHuddleData";
import type { ChatConversation, ChatPerson } from "@/types/chat";

type Target =
  | { kind: "person"; name: string; seed: string; person: ChatPerson }
  | { kind: "conv"; name: string; seed: string; conv: ChatConversation };

function minimalDm(id: string, title: string): ChatConversation {
  return {
    id, kind: "dm", title, ticketKey: null, ticketType: null, projectKey: null,
    projectName: null, isArchived: false, lastMessageAt: null, lastMessagePreview: null,
    unreadCount: 0,
  };
}

interface DockNewHuddleModalProps {
  conversations: ChatConversation[];
  onClose: () => void;
}

export function DockNewHuddleModal({ conversations, onClose }: DockNewHuddleModalProps) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { groups } = useChatPeople();
  const startDm = useStartDm();
  const { startOrJoin } = useHuddleActions();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const people = useMemo(() => {
    const seen = new Set<string>();
    const out: ChatPerson[] = [];
    groups.forEach((g) => (g.people ?? []).forEach((p) => {
      const key = p.profileId ?? p.id;
      if (key && !seen.has(key)) { seen.add(key); out.push(p); }
    }));
    return out;
  }, [groups]);

  const channels = useMemo(
    () => conversations.filter((c) => c.kind === "channel" || c.kind === "custom_channel"),
    [conversations],
  );

  const q = query.trim().toLowerCase();
  const fPeople = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  const fChannels = q ? channels.filter((c) => c.title.toLowerCase().includes(q)) : channels;

  const start = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      if (target.kind === "person") {
        if (!target.person.profileId) return;
        const id = await startDm.mutateAsync(target.person.profileId);
        await startOrJoin(minimalDm(id, target.name));
      } else {
        await startOrJoin(target.conv);
      }
      onClose();
    } catch { /* useHuddleActions surfaces its own toast */ }
    finally { setBusy(false); }
  };

  return (
    <div className="cc-nm" role="dialog" aria-modal="true" aria-label="New huddle">
      <div className="cc-nm__head">
        <button type="button" className="cc-nm__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <span className="cc-nm__title">New Huddle</span>
      </div>

      <div className="cc-nm__to" style={{ borderBottom: "none" }}>
        <Textfield
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search"
          aria-label="Search people and channels"
          isCompact
        />
      </div>

      <div className="cc-nm__list">
        {fChannels.map((c) => (
          <button key={c.id} type="button" className="cc-nm__row" onClick={() => setTarget({ kind: "conv", name: c.title, seed: c.id, conv: c })}>
            <ProjectIcon projectKey={c.projectKey ?? ""} size="small" />
            <span className="cc-nm__name">{c.title}</span>
          </button>
        ))}
        {fPeople.map((p) => (
          <button key={p.profileId ?? p.id} type="button" className="cc-nm__row" onClick={() => setTarget({ kind: "person", name: p.name, seed: p.profileId ?? p.id, person: p })}>
            <AtlaskitAvatar name={p.name} seed={p.profileId ?? p.id} pixelSize={32} shape="square" />
            <span className="cc-nm__name">{p.name}</span>
          </button>
        ))}
        {fPeople.length === 0 && fChannels.length === 0 && <div className="cc-dms__empty">No matches</div>}
      </div>

      {target && (
        <div className="cc-huddle-sheet" role="dialog" aria-label="Start huddle" onClick={() => setTarget(null)}>
          <div className="cc-huddle-sheet__card" onClick={(e) => e.stopPropagation()}>
            <div className="cc-huddle-sheet__avatars">
              <AtlaskitAvatar name={target.name} seed={target.seed} pixelSize={40} shape="square" />
            </div>
            <div className="cc-huddle-sheet__title">Start a huddle with {target.name}</div>
            <div className="cc-huddle-sheet__sub">They'll receive a notification to join.</div>
            <button type="button" className="cc-huddle-sheet__btn" onClick={start} disabled={busy}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" />
              </svg>
              <span>{busy ? "Starting…" : "Huddle"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DockNewHuddleModal;
