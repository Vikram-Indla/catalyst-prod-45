/**
 * DockSearchTab — Slack-mobile "Search" surface for the chat dock.
 *
 * Auto-focused search field → grouped live results (messages / channels /
 * projects / people). Empty query shows "Recently visited places" (recent
 * conversations). Reuses the same search + start-conversation hooks as the
 * directory — no new data layer.
 *
 * Part of CAT-CHAT-DOCK-SLACK-20260709-001 (Slice 3). ADS tokens throughout.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Textfield from "@atlaskit/textfield";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import ProjectIcon from "@/components/shared/ProjectIcon";
import { useChatSearch, groupSearchHits } from "@/hooks/chat/useChatSearch";
import { useStartDm } from "@/hooks/chat/useStartDm";
import { useStartProjectChannel } from "@/hooks/chat/useStartProjectChannel";
import type { ChatConversation } from "@/types/chat";

interface DockSearchTabProps {
  conversations: ChatConversation[];
  onSelect: (id: string) => void;
}

export function DockSearchTab({ conversations, onSelect }: DockSearchTabProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const startDm = useStartDm();
  const startChannel = useStartProjectChannel();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { hits, isEnabled } = useChatSearch(query, "all", 25);
  const groups = useMemo(() => groupSearchHits(hits), [hits]);

  const recent = useMemo(
    () =>
      conversations
        .filter((c) => !c.isArchived && c.lastMessageAt)
        .sort((a, b) => new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime())
        .slice(0, 15),
    [conversations],
  );

  const openConv = (id: string) => onSelect(id);
  const openChannel = (key: string) => {
    startChannel.mutateAsync(key).then(onSelect).catch(() => {});
  };
  const openDm = (profileId: string) => {
    startDm.mutateAsync(profileId).then(onSelect).catch(() => {});
  };

  const recentGlyph = (c: ChatConversation) =>
    c.kind === "channel" ? (
      <ProjectIcon projectKey={c.projectKey ?? ""} size="small" />
    ) : (
      <AtlaskitAvatar name={c.title} seed={c.id} pixelSize={32} shape="square" className="cc-dms__avatar" />
    );

  return (
    <div className="cc-search">
      <div className="cc-search__field">
        <Textfield
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search"
          aria-label="Search messages, channels and people"
          isCompact
          elemBeforeInput={
            <span aria-hidden style={{ display: "inline-flex", paddingInlineStart: "var(--ds-space-075)", color: "var(--ds-icon-subtle)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" strokeLinecap="round" />
              </svg>
            </span>
          }
        />
      </div>

      <div className="cc-search__scroll">
        {isEnabled && hits.length > 0 ? (
          <>
            {groups.people.length > 0 && (
              <>
                <div className="cc-dir__section">People</div>
                {groups.people.map((h) => (
                  <button key={`u:${h.id}`} type="button" className="cc-dms__row" onClick={() => openDm(h.id)}>
                    <AtlaskitAvatar name={h.title} seed={h.id} pixelSize={32} shape="square" className="cc-dms__avatar" />
                    <span className="cc-dms__body">
                      <span className="cc-dms__name">{h.title}</span>
                      {h.subtitle && <span className="cc-dms__preview">{h.subtitle}</span>}
                    </span>
                  </button>
                ))}
              </>
            )}
            {groups.channels.length > 0 && (
              <>
                <div className="cc-dir__section">Channels</div>
                {groups.channels.map((h) => (
                  <button key={`c:${h.id}`} type="button" className="cc-dms__row" onClick={() => openConv(h.id)}>
                    <ProjectIcon projectKey={h.subtitle ?? ""} size="small" />
                    <span className="cc-dms__body">
                      <span className="cc-dms__name">{h.title}</span>
                      {h.subtitle && <span className="cc-dms__preview">{h.subtitle}</span>}
                    </span>
                  </button>
                ))}
              </>
            )}
            {groups.projects.length > 0 && (
              <>
                <div className="cc-dir__section">Projects</div>
                {groups.projects.map((h) => (
                  <button key={`p:${h.id}`} type="button" className="cc-dms__row" onClick={() => openChannel(h.subtitle ?? "")}>
                    <ProjectIcon projectKey={h.subtitle ?? ""} size="small" />
                    <span className="cc-dms__body">
                      <span className="cc-dms__name">{h.title}</span>
                      {h.subtitle && <span className="cc-dms__preview">{h.subtitle}</span>}
                    </span>
                  </button>
                ))}
              </>
            )}
            {groups.messages.length > 0 && (
              <>
                <div className="cc-dir__section">Messages</div>
                {groups.messages.map((h) => (
                  <button key={`m:${h.id}`} type="button" className="cc-dms__row" onClick={() => h.conversationId && openConv(h.conversationId)}>
                    <AtlaskitAvatar name={h.subtitle ?? "?"} seed={h.conversationId ?? h.id} pixelSize={32} shape="square" className="cc-dms__avatar" />
                    <span className="cc-dms__body">
                      <span className="cc-dms__name">{h.subtitle ?? "Conversation"}</span>
                      <span className="cc-dms__preview">{h.title}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </>
        ) : isEnabled && hits.length === 0 ? (
          <div className="cc-dms__empty">No matches for "{query}"</div>
        ) : (
          <>
            <div className="cc-dir__section">Recently visited places</div>
            {recent.map((c) => (
              <button key={c.id} type="button" className="cc-dms__row" onClick={() => openConv(c.id)}>
                {recentGlyph(c)}
                <span className="cc-dms__body">
                  <span className="cc-dms__name">{c.title}</span>
                  {c.lastMessagePreview && <span className="cc-dms__preview">{c.lastMessagePreview}</span>}
                </span>
              </button>
            ))}
            {recent.length === 0 && <div className="cc-dms__empty">Nothing here yet</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default DockSearchTab;
