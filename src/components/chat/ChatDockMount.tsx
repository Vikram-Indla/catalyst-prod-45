import React, { useTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { ChatDock } from '@/components/chat/dock/ChatDock';
import {
  CHAT_OPEN_CONVERSATION_EVENT,
  type OpenConversationDetail,
} from '@/lib/chat-dock-bridge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// How long to defer DockDirectory mount after first FAB click (ms).
// Gives the browser a paint frame so the FAB toggle feels instant.
const DOCK_MOUNT_DEFER_MS = 0;

/**
 * ChatDockMount — the always-on chat dock for the global app shell.
 *
 * Mounted once for authenticated users (see ChatDockRouteGuard in
 * FullAppRoutes). Starts COLLAPSED so only the launcher FAB renders and NO
 * realtime subscriptions open until the user expands it — protects the global
 * shell's performance budget (CLAUDE.md app-shell rule). Tab/open-conversation
 * state lives here so chat persists across route changes.
 *
 * The legacy NewMessageModal was removed 2026-06-08 — its function is now
 * fully covered by the inline DockDirectory (unified people + conversations
 * list, commit cbffd9f2c). The two surfaces were stacking, producing the
 * "broken chat" double-modal collision.
 */
export default function ChatDockMount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  // dockMounted: false until first open. Once true, dock subtree stays mounted forever.
  // This + startTransition means first open renders DockDirectory incrementally (yields
  // every 5ms) instead of a SyncLane commit that freezes the thread. Subsequent toggles
  // are instant display:none flips — no re-mount, no hook re-run.
  const [dockMounted, setDockMounted] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  // Presence heartbeat — upsert user_presence every 30s when dock is expanded (finding 41)
  useEffect(() => {
    if (collapsed || !user) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }
    const ping = () => {
      (supabase as any)
        .from('user_presence')
        .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .then(() => { /* fire-and-forget */ });
    };
    ping();
    heartbeatRef.current = setInterval(ping, 30_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [collapsed, user]);

  // Cleanup deferred mount timer on unmount
  useEffect(() => () => { if (mountTimerRef.current) clearTimeout(mountTimerRef.current); }, []);

  // Schedule DockDirectory mount in next event loop tick so the FAB animation
  // paints before the heavy subtree initializes.
  const scheduleDockMount = useCallback(() => {
    if (dockMounted) return;
    if (mountTimerRef.current) return; // already scheduled
    mountTimerRef.current = setTimeout(() => {
      startTransition(() => setDockMounted(true));
      mountTimerRef.current = null;
    }, DOCK_MOUNT_DEFER_MS);
  }, [dockMounted, startTransition]);

  const handleSelect = useCallback((id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    setCollapsed(false);
    scheduleDockMount();
  }, [scheduleDockMount]);

  const handleClose = useCallback((id: string) => {
    setOpenIds((prev) => prev.filter((x) => x !== id));
    setActiveId((cur) => (cur === id ? undefined : cur));
  }, []);

  // Bridge: any component can open a conversation by dispatching the event
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenConversationDetail>).detail;
      if (!detail?.id) return;
      handleSelect(detail.id);
    };
    window.addEventListener(CHAT_OPEN_CONVERSATION_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_CONVERSATION_EVENT, onOpen);
  }, [handleSelect]);

  return (
    <ChatRealtimeProvider>
      <ChatDock
        openConversationIds={openIds}
        activeId={activeId}
        onSelect={handleSelect}
        onClose={handleClose}
        collapsed={collapsed}
        dockMounted={dockMounted}
        onToggleCollapsed={() => {
          // Toggle collapse IMMEDIATELY so the FAB responds in the same frame.
          // No isPending guard — second click always works.
          if (collapsed) {
            // Opening: reset to directory view, defer heavy mount
            setActiveId(undefined);
            setCollapsed(false);
            scheduleDockMount();
          } else {
            // Closing: instant hide
            setCollapsed(true);
          }
        }}
        onFocusDirectory={() => setActiveId(undefined)}
        onPopOut={() => navigate('/chat')}
      />
    </ChatRealtimeProvider>
  );
}
