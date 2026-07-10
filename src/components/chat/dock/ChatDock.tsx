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
import { CatyPulseIcon } from "@/components/ui/CatyPulseIcon";
import { AtlaskitAvatar } from "@/components/chat/main/AtlaskitAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/chat/useConversations";
import { useIncomingHuddle } from "@/hooks/chat/useIncomingHuddle";
import type { ChatConversation } from "@/types/chat";
import { CatyMoodFace } from "../caty-mood/CatyMoodFace";
import { useDraggableFab } from "./useDraggableFab";
import { CatyPanel } from "./CatyPanel";
import { DockConversationPane } from "./DockConversationPane";
import { DockDirectory } from "./DockDirectory";
import { DockDmsTab } from "./DockDmsTab";
import { DockSearchTab } from "./DockSearchTab";
import { DockActivityTab } from "./DockActivityTab";
import { DockMoreTab } from "./DockMoreTab";
import { DockHomeCards } from "./DockHomeCards";
import { DockTabBar, type DockTab } from "./DockTabBar";
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import "./dock.css";

/** Sentinel activeId for the Caty assistant chat (the pinned DMs "Slackbot" slot). */
export const CATY_ID = "__caty_assistant__";

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
  const [activeTab, setActiveTab] = useState<DockTab>("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dirFocusTick, setDirFocusTick] = useState(0);
  // True while the directory's full-screen Browse Sections view is open — the
  // shell hides its header, cards rail and FAB so browse takes the whole panel.
  const [dirBrowsing, setDirBrowsing] = useState(false);

  // Inside a conversation (DM/channel) the DockConversationPane owns its own
  // header (back + ConversationHeader), so the shared Caty branding is redundant
  // clutter. Hide it in detail view — cleaner UX.
  const inConversation = !!activeId;

  // Slack-style per-tab purple header. Home keeps the Caty brand; the other
  // destinations show a big title. Detail (inConversation) uses a white back bar.
  const isHome = !searchOpen && activeTab === "home";
  const headerTitle = searchOpen
    ? "Search"
    : activeTab === "dms"
      ? "DMs"
      : activeTab === "activity"
        ? "Activity"
        : activeTab === "more"
          ? "You"
          : "Home";

  // Slack shows the current user's avatar top-right on every primary tab.
  const { user } = useAuth();
  const meMeta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const meName = meMeta.full_name || meMeta.name || user?.email || "You";
  const meSeed = user?.id ?? meName;

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

  // Incoming/snoozed huddle → the global IncomingHuddleFab (mounted in
  // CatalystShell) owns the FAB (it renders on EVERY route incl. /chat where
  // this dock is hidden). Hide this launcher whenever a call is active so the
  // two never overlap.
  const { incoming, snoozeActive } = useIncomingHuddle();
  const callActive = !!incoming || snoozeActive;

  // Full list passed to DockDirectory so archived section works.
  const listConversations = conversations ?? [];

  const fabHidden = (dockMounted && !collapsed) || callActive;
  const fab = (
    <button
      ref={fabRef}
      type="button"
      className={`cc-fab${isDragging ? ' cc-fab--dragging' : ''}${isSnapping ? ' cc-fab--snapping' : ''}`}
      style={{ top: pos.y, left: pos.x, display: fabHidden ? 'none' : undefined }}
      onClick={() => { if (!didMove.current) onToggleCollapsed(); }}
      onPointerDown={dragHandlers.onPointerDown}
      onPointerMove={dragHandlers.onPointerMove}
      onPointerUp={dragHandlers.onPointerUp}
      onPointerEnter={dragHandlers.onPointerEnter}
      onPointerLeave={dragHandlers.onPointerLeave}
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
        className="cc-dock"
        role="complementary"
        aria-label="Messages"
        style={{ display: collapsed ? 'none' : undefined }}
      >
        {/* Shared header — hidden while the full-screen Browse Sections view is open */}
        {!dirBrowsing && (
        <div
          className={`cc-dock__headerwrap${!inConversation ? " cc-dock__headerwrap--purple" : ""}`}
          role="banner"
        >
          {/* Static gradient hairline — Caty AI signifier (no motion, CLAUDE.md AI-CTA carve-out) */}
          <div className="cc-dock__accent" aria-hidden />

          {/* Row 1 — brand identity / title + action icons */}
          <div className="cc-dock__titlebar">
            {inConversation ? (
              // Inside a conversation the back affordance lives here, sharing the
              // row with the +/expand/minimize actions (no separate back row).
              <button
                type="button"
                className="cc-conv-pane__back"
                onClick={() => onFocusDirectory?.()}
                aria-label="Back to directory"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>All messages</span>
              </button>
            ) : isHome ? (
              <>
                <span className="cc-dock__wslogo" aria-hidden>
                  <CatyMoodFace state="content" size={22} />
                </span>
                <div className="cc-dock__title">
                  <span className="cc-dock__wordmark">Catalyst</span>
                </div>
              </>
            ) : (
              <div className="cc-dock__title">
                <span className="cc-dock__bigtitle">{headerTitle}</span>
              </div>
            )}
            <div className="cc-dock__actions">
              {!inConversation && (
                <div className="cc-dock__hdr-pill">
                  <button
                    type="button"
                    className="cc-dock__hdr-pill-btn"
                    aria-label="Filter conversations"
                    title="Filter"
                    onClick={() => { setSearchOpen(true); }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <line x1="4" y1="7" x2="20" y2="7" />
                      <line x1="7" y1="12" x2="17" y2="12" />
                      <line x1="10" y1="17" x2="14" y2="17" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="cc-dock__hdr-avatar"
                    aria-label="Open You menu"
                    title="You"
                    onClick={() => { setActiveTab("more"); setSearchOpen(false); }}
                  >
                    <AtlaskitAvatar name={meName} seed={meSeed} pixelSize={24} shape="square" presence="green" />
                  </button>
                </div>
              )}
              <button
                type="button"
                className="cc-dock__hdr-btn cc-dock__hdr-btn--minimize"
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
        </div>
        )}

        {/* Body — conversation pane (detail) OR the active nav tab + bottom nav */}
        <div className="cc-dock__messages-body">
          <div className="cc-dock__messages-inner">
            {activeId === CATY_ID ? (
              <ChatPaneErrorBoundary conversationId={CATY_ID}>
                <CatyPanel viewMode="floating" onViewModeChange={() => {}} />
              </ChatPaneErrorBoundary>
            ) : activeId ? (
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
            ) : searchOpen ? (
              <ChatDirectoryErrorBoundary>
                <DockSearchTab conversations={listConversations} onSelect={onSelect} />
              </ChatDirectoryErrorBoundary>
            ) : (activeTab === "home") ? (
              <ChatDirectoryErrorBoundary>
                <div className="cc-home">
                  {!dirBrowsing && <DockHomeCards onOpenCaty={() => onSelect(CATY_ID)} />}
                  <DockDirectory
                    conversations={listConversations}
                    activeId={activeId}
                    onSelectConversation={onSelect}
                    focusTick={dirFocusTick}
                    onBrowseChange={setDirBrowsing}
                  />
                </div>
              </ChatDirectoryErrorBoundary>
            ) : (activeTab === "dms") ? (
              <ChatDirectoryErrorBoundary>
                <DockDmsTab
                  conversations={listConversations}
                  activeId={activeId}
                  onSelect={onSelect}
                  onOpenCaty={() => onSelect(CATY_ID)}
                />
              </ChatDirectoryErrorBoundary>
            ) : (activeTab === "activity") ? (
              <ChatDirectoryErrorBoundary>
                <DockActivityTab conversations={listConversations} onSelect={onSelect} />
              </ChatDirectoryErrorBoundary>
            ) : (
              <ChatDirectoryErrorBoundary>
                <DockMoreTab />
              </ChatDirectoryErrorBoundary>
            )}
          </div>

          {/* Slack-style compose FAB — Home / DMs list view. */}
          {!inConversation && !searchOpen && !dirBrowsing && (activeTab === "home" || activeTab === "dms") && (
            <button
              type="button"
              className="cc-dock__compose-fab"
              aria-label="New message"
              title="New message"
              onClick={() => {
                onFocusDirectory?.();
                setActiveTab("home");
                setSearchOpen(false);
                setDirFocusTick((t) => t + 1);
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}

          {/* Glassy bottom nav — list view only; hidden in detail + full-screen browse. */}
          {!inConversation && !dirBrowsing && (
            <DockTabBar
              active={activeTab}
              searchActive={searchOpen}
              onChange={(tab) => { setSearchOpen(false); setActiveTab(tab); }}
              onSearch={() => setSearchOpen((s) => !s)}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default ChatDock;
