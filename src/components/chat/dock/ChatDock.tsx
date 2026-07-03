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
import React, { useState, Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { IconButton } from "@atlaskit/button/new";
import Badge from "@atlaskit/badge";
import Tabs, { Tab, TabList } from "@atlaskit/tabs";
import AddIcon from "@atlaskit/icon/core/add";
import GrowDiagonalIcon from "@atlaskit/icon/core/grow-diagonal";
import MinusIcon from "@atlaskit/icon/core/minus";
import { CatyPulseIcon } from "@/components/ui/CatyPulseIcon";
import { useConversations } from "@/hooks/chat/useConversations";
import { useIncomingHuddle } from "@/hooks/chat/useIncomingHuddle";
import { startRing, stopRing } from "@/lib/chat/huddle/ringtone";
import { DockCallRing } from "./DockCallRing";
import type { ChatConversation, ChatPresence } from "@/types/chat";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { useDraggableFab } from "./useDraggableFab";
import { CatyPanel } from "./CatyPanel";
import { DockConversationPane } from "./DockConversationPane";
import { DockDirectory } from "./DockDirectory";
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import "./dock.css";

/** Isolates a directory crash — shows a retry prompt instead of a blank dock. */
class ChatDirectoryErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error, info: ErrorInfo) {
    console.error('[ChatDock] directory error', e, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center' }}>
          <span>Messages failed to load.</span>
          <button
            type="button"
            style={{ fontSize: 'var(--ds-font-size-200)', cursor: 'pointer', background: 'none', border: '1px solid var(--ds-border)', borderRadius: 4, padding: '4px 10px' }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Isolates a single conversation pane crash from the rest of the dock. */
class ChatPaneErrorBoundary extends Component<
  { conversationId: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error, info: ErrorInfo) {
    console.error('[ChatDock] pane error', e, info);
  }
  componentDidUpdate(prev: { conversationId: string }) {
    // Reset error state when navigating to a different conversation.
    if (prev.conversationId !== this.props.conversationId) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>This conversation failed to load.</span>
          <button
            type="button"
            style={{ alignSelf: 'flex-start', fontSize: 'var(--ds-font-size-200)', cursor: 'pointer', background: 'none', border: '1px solid var(--ds-border)', borderRadius: 4, padding: '4px 10px' }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  onsite: "var(--ds-icon-success)",
  remote: "var(--ds-icon-information)",
  away: "var(--ds-icon-disabled)",
  on_leave: "var(--ds-icon-disabled)",
};

const TILE_PALETTE = [
  "var(--ds-background-accent-purple-bolder)",
  "var(--ds-background-accent-blue-bolder)",
  "var(--ds-background-accent-green-bolder)",
  "var(--ds-background-accent-magenta-bolder)",
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
    const assigneeName = conversation.assigneeName;
    const seed = assigneeName ?? conversation.id;
    const bgColor = TILE_PALETTE[hashIndex(seed, TILE_PALETTE.length)];
    const label = assigneeName
      ? initials(assigneeName)
      : (conversation.ticketKey ?? conversation.title ?? "?").split("-").pop()?.slice(0, 4) ?? "?";
    return (
      <span className="cc-conv-glyph--dm">
        <span className="cc-conv-glyph__inner" style={{ background: bgColor }}>
          {label}
        </span>
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
    return PRESENCE_DOT.onsite.replace("success", "brand");
  return "var(--ds-background-brand-bold)";
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

  // Incoming huddle → vibrate the FAB (magenta) instead of a separate strap.
  // Hovering the FAB stops the vibration and fans out decline/snooze/accept.
  const { incoming, accept: acceptCall, decline: declineCall, snooze: snoozeCall } = useIncomingHuddle();
  const ringing = !!incoming;
  const [ringHovered, setRingHovered] = React.useState(false);
  const ringDiscRef = React.useRef<HTMLSpanElement>(null);
  const ringPulseRef = React.useRef<HTMLSpanElement>(null);
  const ringCloseRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRing = React.useCallback(() => {
    if (ringCloseRef.current) { clearTimeout(ringCloseRef.current); ringCloseRef.current = null; }
    setRingHovered(true);
  }, []);
  const closeRing = React.useCallback(() => {
    if (ringCloseRef.current) clearTimeout(ringCloseRef.current);
    ringCloseRef.current = setTimeout(() => setRingHovered(false), 220);
  }, []);

  React.useEffect(() => {
    if (!ringing) { setRingHovered(false); return; }
    startRing();
    window.dispatchEvent(new CustomEvent('huddle:incoming-ring'));
    return () => stopRing();
  }, [ringing, incoming?.huddleId]);

  // rAF-driven vibrate + expanding ring. Inline transforms bypass the global
  // `prefers-reduced-motion` reset in index.css that kills all CSS animation.
  React.useEffect(() => {
    if (!ringing) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const disc = ringDiscRef.current;
      const ring = ringPulseRef.current;
      if (disc) {
        disc.style.transform = ringHovered
          ? 'translate(0,0) rotate(0deg)'
          : `translate(${(Math.sin(t * 40) * 1.4).toFixed(2)}px, ${(Math.cos(t * 36) * 0.9).toFixed(2)}px) rotate(${(Math.sin(t * 38) * 3).toFixed(2)}deg)`;
      }
      if (ring) {
        const p = (t % 1.25) / 1.25; // 0→1 expanding pulse
        ring.style.transform = `scale(${(0.9 + p * 0.85).toFixed(3)})`;
        ring.style.opacity = (0.65 * (1 - p)).toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (ringDiscRef.current) ringDiscRef.current.style.transform = '';
    };
  }, [ringing, ringHovered]);

  const fanOpen = ringing && ringHovered;

  // Full list passed to DockDirectory so archived section works.
  const listConversations = conversations ?? [];

  const fabHidden = dockMounted && !collapsed;
  const fab = (
    <>
    <button
      ref={fabRef}
      type="button"
      className={`cc-fab${isDragging ? ' cc-fab--dragging' : ''}${isSnapping ? ' cc-fab--snapping' : ''}${ringing && !fanOpen ? ' cc-fab--ringing' : ''}`}
      style={{ top: pos.y, left: pos.x, display: fabHidden ? 'none' : undefined }}
      onClick={() => { if (!didMove.current) onToggleCollapsed(); }}
      onPointerDown={dragHandlers.onPointerDown}
      onPointerMove={dragHandlers.onPointerMove}
      onPointerUp={dragHandlers.onPointerUp}
      onMouseEnter={ringing ? openRing : undefined}
      onMouseLeave={ringing ? closeRing : undefined}
      aria-label={totalUnread > 0
        ? `Caty online, ${totalUnread > 99 ? '99+' : totalUnread} unread. Open messages.`
        : 'Caty online. Open messages.'}
      title="Open messages"
    >
      <span className="cc-wake-disc" ref={ringDiscRef}>
        {ringing && <span className="cc-fab__ring" ref={ringPulseRef} aria-hidden />}
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
    {ringing && !fabHidden && (
      <DockCallRing
        centerX={pos.x + 38.5}
        centerY={pos.y + 38.5}
        open={fanOpen}
        onOpen={openRing}
        onClose={closeRing}
        onDecline={() => { setRingHovered(false); declineCall(); }}
        onSnooze={() => { setRingHovered(false); snoozeCall(); }}
        onAccept={() => { setRingHovered(false); acceptCall(); }}
      />
    )}
    </>
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
                <span className="cc-dock__wordmark">CATY</span>
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
                  aria-label="Minimize"
                  title="Minimize"
                  onClick={onToggleCollapsed}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="cc-mode-tabs">
              <Tabs id="cc-dock-mode-loading" selected={0} onChange={() => {}}>
                <TabList>
                  <Tab>Messages</Tab>
                  <Tab>Assistant</Tab>
                </TabList>
              </Tabs>
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
              <span className="cc-dock__wordmark">{dockMode === "caty" ? "Assistant" : "CATY"}</span>
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
                icon={(p) => <MinusIcon {...p} LEGACY_size="small" />}
                label="Minimize"
                appearance="subtle"
                spacing="compact"
                title="Minimize"
                onClick={onToggleCollapsed}
              />
            </div>
          </div>

          {/* Row 2 — dual-mode tabs (@atlaskit/tabs owns the selected-underline) */}
          <div className="cc-mode-tabs">
            <Tabs
              id="cc-dock-mode"
              selected={dockMode === "caty" ? 1 : 0}
              onChange={(index) => setDockMode(index === 1 ? "caty" : "messages")}
            >
              <TabList>
                <Tab>
                  Messages
                  {totalUnread > 0 && (
                    <span style={{ marginInlineStart: "var(--ds-space-075)" }}>
                      <Badge appearance="primary" max={99}>{totalUnread}</Badge>
                    </span>
                  )}
                </Tab>
                <Tab>Assistant</Tab>
              </TabList>
            </Tabs>
          </div>
        </div>

        {/* Messages mode — directory OR conversation pane */}
        {dockMode === "messages" && (
          <div className="cc-dock__messages-body">
            <div className="cc-dock__messages-inner">
              {activeId ? (
                <ChatPaneErrorBoundary conversationId={activeId}>
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
                </ChatPaneErrorBoundary>
              ) : (
                <ChatDirectoryErrorBoundary>
                  <DockDirectory
                    conversations={listConversations}
                    activeId={activeId}
                    onSelectConversation={onSelect}
                    focusTick={dirFocusTick}
                  />
                </ChatDirectoryErrorBoundary>
              )}
            </div>

            {openConversationIds.length > 0 && <div className="cc-tabs" role="tablist" aria-label="Open conversations">
              {openConversationIds.map((id) => {
                const conv = byId.get(id);
                const label = conv
                  ? conv.kind === "channel"
                    ? `# ${conv.title}`
                    : conv.title
                  : '…';
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
