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

/**
 * ChatDockMount — always-on chat dock for the global app shell.
 *
 * Two-phase mount (2026-06-21 fix for FAB freeze):
 *   Phase 1 (synchronous on click): shellVisible=true → dock shell renders
 *     instantly with a spinner. Zero Atlaskit CSS-in-JS, zero DockDirectory hooks.
 *   Phase 2 (after shell paints, ~32ms): double rAF + startTransition →
 *     contentReady=true → DockDirectory mounts with all 8+ hooks.
 *
 * This eliminates the 45-second CDP freeze caused by React synchronously
 * reconciling DockDirectory's entire hook tree (+ Atlaskit CSS-in-JS injection)
 * during the FAB click handler.
 */
export default function ChatDockMount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [shellVisible, setShellVisible] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  // Presence heartbeat — upsert user_presence every 30s when dock is expanded
  useEffect(() => {
    if (collapsed || !user) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }
    const ping = () => {
      (supabase as any)
        .from('user_presence')
        .upsert({ user_id: user.id, last_seen_at: new Date().toISOString(), state: 'onsite' }, { onConflict: 'user_id' })
        .then(() => { /* fire-and-forget */ });
    };
    ping();
    heartbeatRef.current = setInterval(ping, 30_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [collapsed, user]);

  // Cancel pending timers on unmount
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  // Open dock: shell appears synchronously on this tick, heavy content mounts
  // ~50ms later so shell paints first.
  // Uses both rAF (visible tabs) and setTimeout fallback (hidden/CDP tabs — rAF
  // pauses when document.hidden=true, but setTimeout always fires).
  const openDock = useCallback(() => {
    setCollapsed(false);
    if (shellVisible) return; // already initialized, just uncollapse
    setShellVisible(true);
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      rafRef.current = null;
      timerRef.current = null;
      startTransition(() => setContentReady(true));
    };
    // rAF path: fires on next paint (~16ms) when tab is visible
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(settle);
    });
    // Fallback: fires at 50ms regardless of tab visibility
    timerRef.current = setTimeout(settle, 50);
  }, [shellVisible, startTransition]);

  const handleSelect = useCallback((id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    openDock();
  }, [openDock]);

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
        dockMounted={shellVisible}
        contentReady={contentReady}
        onToggleCollapsed={() => {
          if (collapsed) {
            setActiveId(undefined);
            openDock();
          } else {
            setCollapsed(true);
          }
        }}
        onFocusDirectory={() => setActiveId(undefined)}
        onPopOut={() => navigate('/chat')}
      />
    </ChatRealtimeProvider>
  );
}
