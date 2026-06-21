/**
 * ChatDock — bottom-right docked chat widget.
 *
 * Reproduces /tmp/catalyst-chat-mockups/chat-dock.html:
 *  - Collapsed launcher FAB (brand, chat-bubble icon, red unread badge, green presence dot)
 *  - Expanded 380px panel: header (new / pop-out / minimize / close icon buttons),
 *    compact conversation list, bottom multi-tab bar of open conversations (x per tab + "+" tab)
 *
 * ADS: @atlaskit/dropdown-menu is available for any future menu; icon buttons are @atlaskit/button
 * IconButton. Colors via var(--ds-*) tokens. Avatars are colored-initials circles (never <img>).
 */
import React, { useState } from "react";
import { IconButton } from "@atlaskit/button/new";
import AddIcon from "@atlaskit/icon/core/add";
import GrowDiagonalIcon from "@atlaskit/icon/core/grow-diagonal";
import CloseIcon from "@atlaskit/icon/core/close";
import { CatyPulseIcon } from "@/components/ui/CatyPulseIcon";
import { useConversations } from "@/hooks/chat/useConversations";
import type { ChatConversation, ChatPresence } from "@/types/chat";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { useDraggableFab } from "./useDraggableFab";
import { CatyPanel } from "./CatyPanel";
import { DockConversationPane } from "./DockConversationPane";
import { DockDirectory } from "./DockDirectory";
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import "./dock.css";

type DockMode = "messages" | "caty";
type CatyView = "floating" | "sidebar";

interface ChatDockProps {
  openConversationIds: string[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  collapsed?: boolean;
  /**
   * True once the dock shell has been shown (first FAB click). Controls whether
   * the dock panel is mounted at all. Kept as a separate flag from contentReady
   * so conversations start fetching during the shell phase (pre-warming cache).
   */
  dockMounted?: boolean;
  /**
   * True once DockDirectory is allowed to mount (~32ms after first open).
   * Deferred via double rAF + startTransition in ChatDockMount so DockDirectory's
   * 8+ hooks don't block the FAB click handler.
   */
  contentReady?: boolean;
  onToggleCollapsed: () => void;
  /**
   * Clears the active conversation so the inline DockDirectory becomes
   * the visible surface.
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
  if (conversation.kind === "channel") {
    return (
      <span
        className="cc-conv-glyph cc-conv-glyph--channel"
        style={{ background: TILE_PALETTE[hashIndex(conversation.id, TILE_PALETTE.length)] }}
      >
        #
      </span>
    );
  }
  if (conversation.kind === "ticket") {
    const num =
      (conversation.ticketKey ?? conversation.title ?? "").split("-").pop() ?? "";
    return (
      <span
        className="cc-conv-glyph cc-conv-glyph--ticket"
        style={{ background: "var(--ds-background-brand-bold, #0C66E4)" }}
      >
        {num.slice(0, 4)}
      </span>
    );
  }
  // dm — circular avatar
  return (
    <span className="cc-conv-glyph--dm">
      <span
        className="cc-conv-glyph__inner"
        style={{ background: TILE_PALETTE[hashIndex(conversation.id, TILE_PALETTE.length)] }}
      >
        {initials(conversation.title ?? "")}
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
  dockMounted = false,
  contentReady = false,
  onToggleCollapsed,
  onFocusDirectory,
  onPopOut,
}: ChatDockProps) {
  const [dockMode, setDockMode] = useState<DockMode>("messages");
  const [catyView, setCatyView] = useState<CatyView>("floating");
  const [dirFocusTick, setDirFocusTick] = useState(0);

  const { pos, isDragging, isSnapping, didMove, handlers: dragHandlers } = useDraggableFab();

  // Only fetch conversations after first dock open to avoid a Supabase query
  // (+ DM-title enrichment) on every page load for every authenticated user.
  const { conversations } = useConversations(dockMounted);

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

  const fabRef = React.useRef<HTMLButtonElement>(null);

  // Full list passed to DockDirectory so archived section works.
  const listConversations = conversations ?? [];

  const fab = (
    <button
      ref={fabRef}
      type="button"
      className={`cc-fab${isDragging ? ' cc-fab--dragging' : ''}${isSnapping ? ' cc-fab--snapping' : ''}`}
      style={{ top: pos.y, left: pos.x, display: dockMounted && !collapsed ? 'none' : undefined }}
      onClick={() => { if (!didMove.current) onToggleCollapsed(); }}
      onPointerDown={dragHandlers.onPointerDown}
      onPointerMove={dragHandlers.onPointerMove}
      onPointerUp={dragHandlers.onPointerUp}
      aria-label={totalUnread > 0
        ? `Caty online, ${totalUnread > 99 ? '99+' : totalUnread} unread. Open messages.`
        : 'Caty online. Open messages.'}
      title="Open messages"
    >
      <span className="cc-wake-disc">
        <CatyPulseIcon size={28} />
        {totalUnread > 0 ? (
          <span
            className="cc-wake-count"
            aria-label={`${totalUnread > 99 ? '99+' : totalUnread} unread messages`}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        ) : (
          <span className="cc-fab__presence" />
        )}
      </span>
    </button>
  );

  // Phase 0: before first FAB click — FAB only, zero dock mount cost.
  if (!dockMounted) return fab;

  // Phase 1: shell visible but DockDirectory not yet ready.
  // Plain HTML buttons + CSS spinner — zero @atlaskit CSS-in-JS injection.
  // Dock appears on the SAME FRAME as the click. Content mounts ~32ms later.
  if (!contentReady) {
    return (
      <>
        {fab}
        <div
          className="cc-dock"
          role="complementary"
          aria-label="Messages"
          style={{ display: collapsed ? 'none' : undefined }}
        >
          <div className="cc-dock__headerwrap" role="banner">
            <div className="cc-dock__accent" aria-hidden />
            <div className="cc-dock__titlebar">
              <span className="cc-dock__badge" aria-hidden>
                <CatyMoodFace state="content" size={26} />
              </span>
              <div className="cc-dock__title">
                <span className="cc-dock__wordmark">Messages</span>
              </div>
              <div className="cc-dock__actions">
                <button
                  type="button"
                  className="cc-dock__shell-action-btn"
                  aria-label="New conversation"
                  title="New conversation"
                  onClick={() => { onFocusDirectory?.(); setDirFocusTick((t) => t + 1); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="cc-dock__shell-action-btn"
                  aria-label="Open full screen"
                  title="Open full screen"
                  onClick={onPopOut}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="cc-dock__shell-action-btn"
                  aria-label="Close"
                  title="Close"
                  onClick={onToggleCollapsed}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="cc-mode-tabs" role="tablist" aria-label="Chat modes">
              <button type="button" role="tab" className="cc-mode-tab cc-mode-tab--active" aria-selected={true}>Messages</button>
              <button type="button" role="tab" className="cc-mode-tab" aria-selected={false}>Assistant</button>
            </div>
          </div>
          <div className="cc-dock__messages-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div className="cc-dock__shell-spinner" aria-label="Loading messages…" role="status" />
          </div>
        </div>
      </>
    );
  }

  // Phase 2: full dock with DockDirectory and all hooks.
  return (
    <>
      {fab}
      <div
        className={`cc-dock${dockMode === "caty" && catyView === "sidebar" ? " cc-dock--sidebar" : ""}`}
        role="complementary"
        aria-label={dockMode === "caty" ? "Caty assistant" : "Messages"}
        style={{ display: collapsed ? 'none' : undefined }}
      >
        {/* Shared header */}
        <div className="cc-dock__headerwrap" role="banner">
          {/* Static gradient hairline — Caty AI signifier (no motion, CLAUDE.md AI-CTA carve-out) */}
          <div className="cc-dock__accent" aria-hidden />

          {/* Row 1 — brand identity + action icons */}
          <div className="cc-dock__titlebar">
            <span className="cc-dock__badge" aria-hidden>
              <CatyMoodFace state="content" size={26} />
            </span>
            <div className="cc-dock__title">
              <span className="cc-dock__wordmark">{dockMode === "caty" ? "Assistant" : "Messages"}</span>
            </div>
            <div className="cc-dock__actions">
              <IconButton
                icon={(p) => <AddIcon {...p} LEGACY_size="small" />}
                label="New conversation"
                appearance="subtle"
                spacing="compact"
                title="New conversation"
                onClick={() => {
                  onFocusDirectory?.();
                  setDirFocusTick((t) => t + 1);
                }}
              />
              <IconButton
                icon={(p) => <GrowDiagonalIcon {...p} LEGACY_size="small" />}
                label="Open full screen"
                appearance="subtle"
                spacing="compact"
                title="Open full screen"
                onClick={onPopOut}
              />
              <IconButton
                icon={(p) => <CloseIcon {...p} LEGACY_size="small" />}
                label="Close"
                appearance="subtle"
                spacing="compact"
                title="Close"
                onClick={onToggleCollapsed}
              />
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
          <div className="cc-dock__messages-body">
            <div className="cc-dock__messages-inner">
              {activeId ? (
                <DockConversationPane
                  conversation={byId.get(activeId) ?? {
                    id: activeId,
                    kind: "dm",
                    title: "...",
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
            </div>

            {openConversationIds.length > 0 && <div className="cc-tabs" role="tablist" aria-label="Open conversations">
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
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
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
                      {label.length > 18 ? `${label.slice(0, 17)}...` : label}
                    </span>
                    {!isActive && (conv?.unreadCount ?? 0) > 0 && (
                      <span className="cc-tab__unread-dot" aria-label="Unread messages" />
                    )}
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
            </div>}
          </div>
        )}

        {/* Caty AI mode */}
        {dockMode === "caty" && (
          <div className="cc-dock__caty-body">
            <CatyPanel viewMode={catyView} onViewModeChange={setCatyView} />
          </div>
        )}
      </div>
    </>
  );
}

export default ChatDock;
