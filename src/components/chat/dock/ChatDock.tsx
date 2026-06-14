/**
 * ChatDock — bottom-right docked chat widget.
 *
 * Reproduces /tmp/catalyst-chat-mockups/chat-dock.html:
 *  - Collapsed launcher FAB (brand, chat-bubble icon, red unread badge, green presence dot)
 *  - Expanded 380px panel: header (new / pop-out / minimize / close icon buttons),
 *    compact conversation list, bottom multi-tab bar of open conversations (× per tab + "+" tab)
 *
 * Perf: while collapsed, the panel and its data are NOT rendered, so callers can gate any
 * realtime subscription on `!collapsed`. This component never opens a subscription itself.
 *
 * ADS: @atlaskit/dropdown-menu is available for any future menu; icon buttons are @atlaskit/button
 * IconButton. Colors via var(--ds-*) tokens. Avatars are colored-initials circles (never <img>).
 */
import React, { useState } from "react";
import { IconButton } from "@atlaskit/button/new";
import Tooltip from "@atlaskit/tooltip";
import AddIcon from "@atlaskit/icon/core/add";
import GrowDiagonalIcon from "@atlaskit/icon/core/grow-diagonal";
import CloseIcon from "@atlaskit/icon/core/close";
import { useConversations } from "@/hooks/chat/useConversations";
import type { ChatConversation, ChatPresence } from "@/types/chat";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { CatyMarkFlat } from "../caty-mood/CatyMarkFlat";
import { CatyWhyCard } from "../caty-mood/CatyWhyCard";
import { useCatyMood } from "../caty-mood/useCatyMood";
import { useCatyEvents } from "../caty-mood/useCatyEvents";
import { buildEventLine, gestureFor } from "../caty-mood/catyEvents";
import { useGlobalSearchStore } from "@/store/globalSearchStore";
import { useDraggableFab } from "./useDraggableFab";
import { CatyPanel } from "./CatyPanel";
import { DockDirectory } from "./DockDirectory";
import { DockConversationPane } from "./DockConversationPane";
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import "./dock.css";

const FAB_SIZE = 77;

type DockMode = "messages" | "caty";
type CatyView = "floating" | "sidebar";

interface ChatDockProps {
  openConversationIds: string[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapsed: () => void;
  /**
   * Clears the active conversation so the inline DockDirectory becomes
   * the visible surface. Replaces the legacy onNewMessage modal (removed
   * 2026-06-08 — directory now covers both "browse" and "start new" inline).
   */
  onFocusDirectory?: () => void;
  onPopOut?: () => void;
}

const PRESENCE_DOT: Record<ChatPresence, string> = {
  on_set: "var(--ds-icon-success, #22A06B)",
  remote: "var(--ds-icon-information, #0C66E4)",
  away: "var(--ds-icon-disabled, #8590A2)",
  on_leave: "var(--ds-icon-disabled, #8590A2)",
};

const TILE_PALETTE = [
  "var(--ds-background-accent-purple-bolder, #6E5DC6)",
  "var(--ds-background-accent-blue-bolder, #0C66E4)",
  "var(--ds-background-accent-green-bolder, #22A06B)",
  "var(--ds-background-accent-magenta-bolder, #CD519D)",
];

function hashIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % mod;
}

function initials(title: string): string {
  const parts = title.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function ConvGlyph({ conversation }: { conversation: ChatConversation }) {
  const tileBase = {
    width: 32,
    height: 32,
    borderRadius: 8,
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--ds-text-inverse, #FFFFFF)",
    fontWeight: 600,
  } as const;

  if (conversation.kind === "channel") {
    return (
      <span
        style={{
          ...tileBase,
          fontSize: 14,
          background:
            TILE_PALETTE[hashIndex(conversation.id, TILE_PALETTE.length)],
        }}
      >
        #
      </span>
    );
  }
  if (conversation.kind === "ticket") {
    const num =
      (conversation.ticketKey ?? conversation.title).split("-").pop() ?? "";
    return (
      <span
        style={{
          ...tileBase,
          fontSize: 9,
          background: "var(--ds-background-brand-bold, #0C66E4)",
        }}
      >
        {num.slice(0, 4)}
      </span>
    );
  }
  // dm — circular avatar
  return (
    <span
      style={{ position: "relative", flex: "0 0 32px", width: 32, height: 32 }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ds-text-inverse, #FFFFFF)",
          fontSize: 12,
          fontWeight: 600,
          background:
            TILE_PALETTE[hashIndex(conversation.id, TILE_PALETTE.length)],
        }}
      >
        {initials(conversation.title)}
      </span>
    </span>
  );
}

function tabDotColor(conversation: ChatConversation): string {
  if (conversation.kind === "channel") return "transparent";
  if (conversation.kind === "ticket")
    return PRESENCE_DOT.on_set.replace("success", "brand");
  return "var(--ds-background-brand-bold, #0C66E4)";
}

export function ChatDock({
  openConversationIds,
  activeId,
  onSelect,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  onFocusDirectory,
  onPopOut,
}: ChatDockProps) {
  const [dockMode, setDockMode] = useState<DockMode>("messages");
  const [catyView, setCatyView] = useState<CatyView>("floating");
  const [dirFocusTick, setDirFocusTick] = useState(0);

  const { pos, isDragging, isSnapping, handlers: dragHandlers } = useDraggableFab();

  // Collapsed: render only the FAB. No data hook subscription is created here; callers
  // gate realtime on !collapsed. We still need an unread total for the badge — read it
  // from a lightweight (already-cached) hook only when expanded; when collapsed we keep
  // the FAB cheap and let the hook compute the badge.
  const { conversations } = useConversations();

  const byId = React.useMemo(() => {
    const map = new Map<string, ChatConversation>();
    (conversations ?? []).forEach((c) => map.set(c.id, c));
    return map;
  }, [conversations]);

  const totalUnread = React.useMemo(
    () =>
      (conversations ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  // Caty STATE layer (mood) + SIGNAL layer (events). Both glass-box, both from data.
  const { displayState, liveMood, evidence, byType, trend, sparkline } = useCatyMood();
  const { events, unseenCount: eventUnseen } = useCatyEvents();
  const fabRef = React.useRef<HTMLButtonElement>(null);
  const [whyOpen, setWhyOpen] = React.useState(false);
  const [gesture, setGesture] = React.useState("");
  const prevUnseen = React.useRef(eventUnseen);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // One-time gesture when a NEW unseen event arrives, then silent (calm tech, no nag).
  React.useEffect(() => {
    if (eventUnseen > prevUnseen.current) {
      const newest = events.find((e) => !e.seen);
      setGesture(newest ? gestureFor(newest.kind) : "");
      const t = setTimeout(() => setGesture(""), 1600);
      prevUnseen.current = eventUnseen;
      return () => clearTimeout(t);
    }
    prevUnseen.current = eventUnseen;
  }, [eventUnseen, events]);

  const eventLine = React.useMemo(() => buildEventLine(events), [events]);
  const openHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setWhyOpen(true);
  };
  const closeHoverSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setWhyOpen(false), 220);
  };
  const openTicket = (key: string) => {
    setWhyOpen(false);
    useGlobalSearchStore.getState().openDetail({ id: key });
  };

  if (collapsed) {
    return (
      <>
        <button
          ref={fabRef}
          type="button"
          className={`cc-fab${isDragging ? ' cc-fab--dragging' : ''}${isSnapping ? ' cc-fab--snapping' : ''}${gesture ? ' ' + gesture : ''}`}
          style={{ top: pos.y, left: pos.x }}
          aria-label={`Caty — ${displayState}. ${liveMood.message} Open messages.`}
          onClick={onToggleCollapsed}
          onMouseEnter={openHover}
          onMouseLeave={closeHoverSoon}
          onFocus={openHover}
          onBlur={closeHoverSoon}
          onClickCapture={dragHandlers.onClickCapture}
          onPointerDown={dragHandlers.onPointerDown}
          onPointerMove={dragHandlers.onPointerMove}
          onPointerUp={dragHandlers.onPointerUp}
        >
          {/* One stable component across the whole gesture — never swap on isDragging,
              or the pointer-down target unmounts mid-drag and capture is lost (drag dies). */}
          <CatyMoodFace state={displayState} size={FAB_SIZE} title={`Caty — ${displayState}`} />
          {totalUnread > 0 && (
            <span
              className="cc-fab__badge"
              aria-label={`${totalUnread > 99 ? "99+" : totalUnread} unread messages`}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
          <span className="cc-fab__presence" />
        </button>
        {!isDragging && (
          <CatyWhyCard
            open={whyOpen}
            anchorRef={fabRef}
            mood={liveMood}
            state={displayState}
            evidence={evidence}
            byType={byType}
            trend={trend}
            sparkline={sparkline}
            eventLine={eventLine}
            onClose={() => setWhyOpen(false)}
            onOpenTicket={openTicket}
            onHoverIn={openHover}
            onHoverOut={closeHoverSoon}
          />
        )}
      </>
    );
  }

  // Full list passed to DockDirectory so archived section works.
  // DockDirectory does its own live/archived split internally.
  const listConversations = conversations ?? [];

  return (
    <div
      className={`cc-dock${dockMode === "caty" && catyView === "sidebar" ? " cc-dock--sidebar" : ""}`}
      role="dialog"
      aria-label={dockMode === "caty" ? "Assistant" : "CATY"}
    >
      {/* Shared header — Option C: AI-forward two-row title bar */}
      <div className="cc-dock__headerwrap" role="banner">
        {/* Static gradient hairline — Caty AI signifier (no motion, CLAUDE.md AI-CTA carve-out) */}
        <div className="cc-dock__accent" aria-hidden />

        {/* Row 1 — brand identity + live status + action icons */}
        <div className="cc-dock__titlebar">
          <span className="cc-dock__badge" aria-hidden>
            {/* Gradient Caty cat — matches the FAB / AI avatar / header accent */}
            <CatyMarkFlat size={26} tone="gradient" />
          </span>
          <div className="cc-dock__title">
            <span className="cc-dock__wordmark">CATY</span>
          </div>
          <div className="cc-dock__actions">
            <Tooltip content="New conversation" position="bottom">
              <IconButton
                icon={(p) => <AddIcon {...p} LEGACY_size="small" />}
                label="New conversation"
                appearance="subtle"
                spacing="compact"
                onClick={() => {
                  // If a conversation is open, go back to directory.
                  // Either way, signal directory to focus search so user can type a name.
                  onFocusDirectory?.();
                  setDirFocusTick((t) => t + 1);
                }}
              />
            </Tooltip>
            <Tooltip content="Open full screen" position="bottom">
              <IconButton
                icon={(p) => <GrowDiagonalIcon {...p} LEGACY_size="small" />}
                label="Open full screen"
                appearance="subtle"
                spacing="compact"
                onClick={onPopOut}
              />
            </Tooltip>
            <Tooltip content="Close" position="bottom">
              <IconButton
                icon={(p) => <CloseIcon {...p} LEGACY_size="small" />}
                label="Close"
                appearance="subtle"
                spacing="compact"
                onClick={onToggleCollapsed}
              />
            </Tooltip>
          </div>
        </div>

        {/* Row 2 — dual-mode underline tabs */}
        <div className="cc-mode-tabs" role="tablist" aria-label="Chat modes">
          <button
            type="button"
            role="tab"
            className={`cc-mode-tab${dockMode === "messages" ? " cc-mode-tab--active" : ""}`}
            onClick={() => setDockMode("messages")}
            aria-selected={dockMode === "messages"}
          >
            Messages
            {totalUnread > 0 && (
              <span className="cc-mode-tab__badge" aria-label={`${totalUnread} unread`}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            className={`cc-mode-tab${dockMode === "caty" ? " cc-mode-tab--active" : ""}`}
            onClick={() => setDockMode("caty")}
            aria-selected={dockMode === "caty"}
          >
            Assistant
          </button>
        </div>
      </div>

      {/* Messages mode — directory OR conversation pane */}
      {dockMode === "messages" && (
        <>
          {activeId ? (
            // Render pane immediately when activeId is set, even before the
            // conversations query refetches (race condition fix). Stub fills
            // in the title/kind until byId has the real data.
            <DockConversationPane
              conversation={byId.get(activeId) ?? {
                id: activeId,
                kind: "dm",
                title: "…",
                isArchived: false,
                lastMessageAt: null,
                lastMessagePreview: null,
                unreadCount: 0,
                ticketKey: null,
                ticketType: null,
                projectKey: null,
                projectName: null,
              }}
              onBack={() => onFocusDirectory?.()}
            />
          ) : (
            <DockDirectory
              conversations={listConversations}
              activeId={activeId}
              onSelectConversation={onSelect}
              focusTick={dirFocusTick}
            />
          )}

          <div className="cc-tabs">
            {openConversationIds.map((id) => {
              const conv = byId.get(id);
              const label = conv
                ? conv.kind === "channel"
                  ? `# ${conv.title}`
                  : conv.title
                : id;
              const isActive = id === activeId;
              return (
                <div
                  key={id}
                  className={isActive ? "cc-tab cc-tab--active" : "cc-tab"}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(id);
                    }
                  }}
                >
                  {conv && conv.kind !== "channel" && (
                    <span
                      className="cc-tab__dot"
                      style={{ background: tabDotColor(conv) }}
                    />
                  )}
                  <span>
                    {label.length > 12 ? `${label.slice(0, 11)}…` : label}
                  </span>
                  {/* Unread indicator — blue dot when conversation has unread messages and is not active */}
                  {!isActive && (conv?.unreadCount ?? 0) > 0 && (
                    <span
                      aria-label="Unread messages"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--ds-background-brand-bold, #0C66E4)",
                        flexShrink: 0,
                        marginLeft: 4,
                      }}
                    />
                  )}
                  {/* × dismiss tab — closes the conversation tab without leaving/archiving */}
                  <button
                    type="button"
                    className="cc-tab__x"
                    aria-label={`Close ${label} tab`}
                    title="Close tab"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(id);
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <line x1="2" y1="2" x2="8" y2="8" />
                      <line x1="8" y1="2" x2="2" y2="8" />
                    </svg>
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="cc-tab__add"
              aria-label="Open another chat"
              onClick={onFocusDirectory}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Caty AI mode — new panel, messages mode is paused but state preserved */}
      {dockMode === "caty" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CatyPanel viewMode={catyView} onViewModeChange={setCatyView} />
        </div>
      )}
    </div>
  );
}

export default ChatDock;
