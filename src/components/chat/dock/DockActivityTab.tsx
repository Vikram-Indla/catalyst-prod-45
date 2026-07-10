/**
 * DockActivityTab — Slack-mobile "Activity" surface for the chat dock.
 *
 * Chips (All / DMs / Mentions / Threads) over a merged feed of real signals:
 *  - unread conversations (DMs + channels) from the loaded conversation list
 *  - @mentions from useChatMentions (notifications table)
 * Zero invented data — Threads shows an honest empty state until a thread-feed
 * source exists. Part of CAT-CHAT-DOCK-SLACK-20260709-001 (Slice 4).
 */
import React, { useMemo, useState } from "react";
import Badge from "@atlaskit/badge";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { useChatMentions } from "@/hooks/chat/useChatMentions";
import type { ChatConversation } from "@/types/chat";

type ActFilter = "all" | "dms" | "mentions" | "threads";

const CHIPS: { key: ActFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dms", label: "DMs" },
  { key: "mentions", label: "Mentions" },
  { key: "threads", label: "Threads" },
];

function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface DockActivityTabProps {
  conversations: ChatConversation[];
  onSelect: (id: string) => void;
}

export function DockActivityTab({ conversations, onSelect }: DockActivityTabProps) {
  const [filter, setFilter] = useState<ActFilter>("all");
  const { data: mentions = [] } = useChatMentions();

  const unreadConvs = useMemo(
    () => conversations.filter((c) => !c.isArchived && c.unreadCount > 0),
    [conversations],
  );

  // Map a mention's anchor key back to a conversation so the row can open it.
  const convByKey = useMemo(() => {
    const map = new Map<string, ChatConversation>();
    conversations.forEach((c) => {
      if (c.ticketKey) map.set(c.ticketKey, c);
      if (c.projectKey) map.set(c.projectKey, c);
    });
    return map;
  }, [conversations]);

  const typeLabel = (c: ChatConversation): string => {
    if (c.kind === "dm" || c.kind === "group_dm") return "Direct message";
    if (c.kind === "channel") return "Channel";
    if (c.kind === "custom_channel") return "Channel";
    if (c.kind === "ticket") return "Work item";
    return "Message";
  };

  const dmRows = useMemo(
    () => unreadConvs.filter((c) => c.kind === "dm" || c.kind === "group_dm"),
    [unreadConvs],
  );

  const isEmpty =
    (filter === "all" && unreadConvs.length === 0 && mentions.length === 0) ||
    (filter === "dms" && dmRows.length === 0) ||
    (filter === "mentions" && mentions.length === 0) ||
    filter === "threads";

  const showConvs = filter === "all" ? unreadConvs : filter === "dms" ? dmRows : [];
  const shownConvIds = new Set(showConvs.map((c) => c.id));
  const showMentions = (filter === "all" || filter === "mentions" ? mentions : []).filter((m) => {
    const c = convByKey.get(m.entityKey);
    return !c || !shownConvIds.has(c.id);
  });

  const emptyCopy: Record<ActFilter, string> = {
    all: "No new activity",
    dms: "No unread direct messages",
    mentions: "No mentions yet",
    threads: "No thread activity yet",
  };

  return (
    <div className="cc-dms">
      <div className="cc-dms__chips" role="tablist" aria-label="Filter activity">
        {CHIPS.map((ch) => (
          <button
            key={ch.key}
            type="button"
            role="tab"
            aria-selected={filter === ch.key}
            className={`cc-dms__chip${filter === ch.key ? " cc-dms__chip--active" : ""}`}
            onClick={() => setFilter(ch.key)}
          >
            {ch.label}
          </button>
        ))}
      </div>

      <div className="cc-dms__list">
        {showConvs.map((c) => (
          <button
            key={`c:${c.id}`}
            type="button"
            className="cc-dms__row cc-act__row"
            onClick={() => onSelect(c.id)}
            aria-label={`${c.title}, ${c.unreadCount} unread`}
          >
            <AtlaskitAvatar name={c.title} seed={c.id} pixelSize={40} shape="square" className="cc-dms__avatar" />
            <span className="cc-dms__body">
              <span className="cc-dms__top">
                <span className="cc-dms__name">{c.title}</span>
                <span className="cc-dms__time">{relTime(c.lastMessageAt)}</span>
              </span>
              <span className="cc-act__type">{typeLabel(c)}</span>
              <span className="cc-dms__bottom">
                <span className="cc-dms__preview">{c.lastMessagePreview ?? "New activity"}</span>
                <span className="cc-dms__unread">
                  <Badge appearance="important" max={99}>{c.unreadCount}</Badge>
                </span>
              </span>
            </span>
          </button>
        ))}

        {showMentions.map((m) => {
          const conv = convByKey.get(m.entityKey);
          return (
            <button
              key={`m:${m.id}`}
              type="button"
              className="cc-dms__row cc-act__row"
              onClick={() => conv && onSelect(conv.id)}
              disabled={!conv}
              aria-label={`Mention in ${m.entityKey}`}
            >
              <AtlaskitAvatar name={m.entityKey} seed={m.actorUserId ?? m.entityKey} pixelSize={40} shape="square" className="cc-dms__avatar" />
              <span className="cc-dms__body">
                <span className="cc-dms__top">
                  <span className="cc-dms__name">{m.entityKey}</span>
                  <span className="cc-dms__time">{relTime(m.createdAt)}</span>
                </span>
                <span className="cc-act__type">Mentioned you</span>
                <span className="cc-dms__preview">{m.entityTitle}</span>
              </span>
            </button>
          );
        })}

        {isEmpty && <div className="cc-dms__empty">{emptyCopy[filter]}</div>}
      </div>
    </div>
  );
}

export default DockActivityTab;
