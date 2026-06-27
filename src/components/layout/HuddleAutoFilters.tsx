// src/components/layout/HuddleAutoFilters.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHuddleStore } from '@/store/huddleStore';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';
import { buildSharedTicketsPath } from '@/lib/chat/huddle/sharedTickets';

/**
 * HuddleAutoFilters — ~5s after a call connects, navigates both participants to
 * the project filters results page with an auto-applied JQL showing tickets
 * where BOTH participants are attached as assignee or reporter (shared tickets).
 * Watcher role is a follow-up (not yet in the JQL engine). Fires once per huddle.
 */
export function HuddleAutoFilters() {
  const active = useHuddleStore((s) => s.active);
  const autoOpened = useHuddleStore((s) => s.ticketsAutoOpened);
  const markAutoOpened = useHuddleStore((s) => s.markTicketsAutoOpened);
  const connected = active?.connectionState === 'connected';
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const names = (huddle?.participants ?? []).map((p) => p.name).filter(Boolean);
  const namesKey = names.join('|');
  const navigate = useNavigate();

  useEffect(() => {
    if (!active || !connected || autoOpened) return;
    const t = setTimeout(() => {
      markAutoOpened();
      navigate(buildSharedTicketsPath(names));
    }, 5000);
    return () => clearTimeout(t);
  }, [active, connected, autoOpened, namesKey, markAutoOpened, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
