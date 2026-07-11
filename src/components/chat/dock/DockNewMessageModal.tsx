/**
 * DockNewMessageModal — Slack "New Message" screen. Opened from the compose
 * popover's "Message" button. Search + a list of people and channels; tapping
 * a row opens (or starts) that conversation.
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001.
 */
import React, { useMemo, useRef, useEffect, useState } from "react";
import Textfield from "@atlaskit/textfield";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import ProjectIcon from "@/components/shared/ProjectIcon";
import { useChatPeople } from "@/hooks/chat/useChatPeople";
import { useStartDm } from "@/hooks/chat/useStartDm";
import type { ChatConversation, ChatPerson } from "@/types/chat";

interface DockNewMessageModalProps {
  conversations: ChatConversation[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function DockNewMessageModal({ conversations, onClose, onSelect }: DockNewMessageModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { groups } = useChatPeople();
  const startDm = useStartDm();

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
  const filteredPeople = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  const filteredChannels = q ? channels.filter((c) => c.title.toLowerCase().includes(q)) : channels;

  const openPerson = (p: ChatPerson) => {
    if (!p.profileId) return;
    startDm.mutateAsync(p.profileId).then((id) => { onSelect(id); onClose(); }).catch(() => {});
  };
  const openConv = (id: string) => { onSelect(id); onClose(); };

  const radio = <span className="cc-nm__radio" aria-hidden />;

  return (
    <div className="cc-nm" role="dialog" aria-modal="true" aria-label="New message">
      <div className="cc-nm__head">
        <button type="button" className="cc-nm__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <span className="cc-nm__title">New Message</span>
      </div>

      <div className="cc-nm__to">
        <span className="cc-nm__to-label">To:</span>
        <Textfield
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search for a channel or conversation"
          aria-label="Search for a channel or conversation"
          isCompact
          appearance="none"
        />
      </div>

      <div className="cc-nm__list">
        {filteredChannels.map((c) => (
          <button key={c.id} type="button" className="cc-nm__row" onClick={() => openConv(c.id)}>
            <ProjectIcon projectKey={c.projectKey ?? ""} size="small" />
            <span className="cc-nm__name">{c.title}</span>
            {radio}
          </button>
        ))}
        {filteredPeople.map((p) => (
          <button key={p.profileId ?? p.id} type="button" className="cc-nm__row" onClick={() => openPerson(p)}>
            <AtlaskitAvatar name={p.name} seed={p.profileId ?? p.id} pixelSize={32} shape="square" />
            <span className="cc-nm__name">{p.name}</span>
            {radio}
          </button>
        ))}
        {filteredPeople.length === 0 && filteredChannels.length === 0 && (
          <div className="cc-dms__empty">No matches</div>
        )}
      </div>
    </div>
  );
}

export default DockNewMessageModal;
