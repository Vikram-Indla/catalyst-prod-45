// src/components/layout/HuddleAutoFilters.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHuddleStore } from '@/store/huddleStore';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';

/**
 * HuddleAutoFilters — ~5s after a call connects, navigates both participants to
 * the project filters page where their shared tickets are reviewed (replaces
 * the old floating tickets modal). Fires once per huddle.
 */
export function HuddleAutoFilters() {
  const active = useHuddleStore((s) => s.active);
  const autoOpened = useHuddleStore((s) => s.ticketsAutoOpened);
  const markAutoOpened = useHuddleStore((s) => s.markTicketsAutoOpened);
  const connected = active?.connectionState === 'connected';
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const userIds = (huddle?.participants ?? []).map((p) => p.userId).join(',');
  const navigate = useNavigate();

  useEffect(() => {
    if (!active || !connected || autoOpened) return;
    const t = setTimeout(() => {
      markAutoOpened();
      const qs = userIds ? `?huddle=1&users=${userIds}` : '?huddle=1';
      navigate(`/project-hub/BAU/filters${qs}`);
    }, 5000);
    return () => clearTimeout(t);
  }, [active, connected, autoOpened, userIds, markAutoOpened, navigate]);

  return null;
}
