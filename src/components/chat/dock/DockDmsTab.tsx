/**
 * DockDmsTab — Slack-mobile "DMs" surface for the chat dock.
 *
 * Avatar rail (recent DMs) → filter chips (All / VIP / Unreads / External) →
 * DM list (avatar + name + preview + timestamp). Reuses the conversations
 * already loaded by ChatDock — no new data layer.
 *
 * ADS: AtlaskitAvatar, @atlaskit/badge; all colour via var(--ds-*). Fonts via
 * ADS bridge size tokens. Part of CAT-CHAT-DOCK-SLACK-20260709-001 (Slice 2).
 */
import React, { useMemo, useState } from "react";
import Badge from "@atlaskit/badge";
import { AtlaskitAvatar, type AvatarPresenceColor } from "@/components/chat/main/AtlaskitAvatar";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { useChatPeople } from "@/hooks/chat/useChatPeople";
import { useStartDm } from "@/hooks/chat/useStartDm";
import type { ChatConversation, ChatPerson, ChatPresence } from "@/types/chat";

type DmFilter = "all" | "vip" | "unreads" | "external";

/** Chat presence → avatar dot colour. */
const PRESENCE_COLOR: Record<ChatPresence, AvatarPresenceColor> = {
  onsite: "green",
  remote: "blue",
  away: "amber",
  on_leave: "grey",
};

const CHIPS: { key: DmFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "vip", label: "VIP" },
  { key: "unreads", label: "Unreads" },
  { key: "external", label: "External" },
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

function firstName(title: string): string {
  return title.trim().split(/[\s,]+/)[0] || title;
}

interface DockDmsTabProps {
  conversations: ChatConversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  /** Opens the Caty assistant chat (the "Slackbot"-slot pinned first). */
  onOpenCaty: () => void;
}

/** Caty assistant avatar — the pinned first DM (replaces Slack's Slackbot). */
function CatyGlyph({ size }: { size: number }) {
  return (
    <span
      className="cc-dms__caty-glyph"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <CatyMoodFace state="content" size={Math.round(size * 0.62)} />
    </span>
  );
}

export function DockDmsTab({ conversations, activeId, onSelect, onOpenCaty }: DockDmsTabProps) {
  const [filter, setFilter] = useState<DmFilter>("all");

  const dms = useMemo(
    () =>
      conversations
        .filter((c) => (c.kind === "dm" || c.kind === "group_dm") && !c.isArchived)
        .sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        }),
    [conversations],
  );

  // Rail shows ALL members (scrollable), not just existing DMs — clicking a
  // person opens/starts a DM with them.
  const { groups } = useChatPeople();
  const startDm = useStartDm();
  const railPeople = useMemo(() => {
    const seen = new Set<string>();
    const out: ChatPerson[] = [];
    groups.forEach((g) => {
      (g.people ?? []).forEach((p) => {
        const key = p.profileId ?? p.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          out.push(p);
        }
      });
    });
    return out;
  }, [groups]);

  const openPerson = (p: ChatPerson) => {
    if (!p.profileId) return;
    startDm.mutateAsync(p.profileId).then(onSelect).catch(() => {});
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "unreads":
        return dms.filter((c) => c.unreadCount > 0);
      case "vip":
        return dms.filter((c) => c.isPinned);
      case "external":
        return [];
      default:
        return dms;
    }
  }, [dms, filter]);

  const emptyCopy: Record<DmFilter, string> = {
    all: "No direct messages yet",
    vip: "No VIP conversations",
    unreads: "You're all caught up",
    external: "No external conversations",
  };

  return (
    <div className="cc-dms">
      <div className="cc-dms__rail" role="list" aria-label="Members">
        <button
          type="button"
          role="listitem"
          className="cc-dms__rail-item"
          onClick={onOpenCaty}
          title="Caty — your assistant"
        >
          <CatyGlyph size={44} />
          <span className="cc-dms__rail-name">Caty</span>
        </button>
        {railPeople.map((p) => (
          <button
            key={p.profileId ?? p.id}
            type="button"
            role="listitem"
            className="cc-dms__rail-item"
            onClick={() => openPerson(p)}
            title={p.name}
          >
            <AtlaskitAvatar
              name={p.name}
              seed={p.profileId ?? p.id}
              pixelSize={44}
              shape="square"
              presence={PRESENCE_COLOR[p.presence]}
            />
            <span className="cc-dms__rail-name">{firstName(p.name)}</span>
          </button>
        ))}
      </div>

      <div className="cc-dms__chips" role="tablist" aria-label="Filter direct messages">
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
        {filter === "all" && (
          <button
            type="button"
            className="cc-dms__row cc-dms__row--caty"
            onClick={onOpenCaty}
            aria-label="Caty, your assistant"
          >
            <CatyGlyph size={40} />
            <span className="cc-dms__body">
              <span className="cc-dms__top">
                <span className="cc-dms__name">Caty</span>
              </span>
              <span className="cc-dms__bottom">
                <span className="cc-dms__preview">Ask me anything</span>
              </span>
            </span>
          </button>
        )}
        {filtered.map((c) => {
          const unread = c.unreadCount > 0;
          return (
            <button
              key={c.id}
              type="button"
              className={`cc-dms__row${activeId === c.id ? " cc-dms__row--active" : ""}${unread ? " cc-dms__row--unread" : ""}`}
              onClick={() => onSelect(c.id)}
              aria-label={`${c.title}${unread ? `, ${c.unreadCount} unread` : ""}`}
            >
              <AtlaskitAvatar name={c.title} seed={c.id} pixelSize={40} shape="square" className="cc-dms__avatar" />
              <span className="cc-dms__body">
                <span className="cc-dms__top">
                  <span className="cc-dms__name">{c.title}</span>
                  <span className="cc-dms__time">{relTime(c.lastMessageAt)}</span>
                </span>
                <span className="cc-dms__bottom">
                  <span className="cc-dms__preview">{c.lastMessagePreview ?? "No messages yet"}</span>
                  {unread && (
                    <span className="cc-dms__unread">
                      <Badge appearance="important" max={99}>{c.unreadCount}</Badge>
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && filter !== "all" && (
          <div className="cc-dms__empty">{emptyCopy[filter]}</div>
        )}
      </div>
    </div>
  );
}

export default DockDmsTab;
