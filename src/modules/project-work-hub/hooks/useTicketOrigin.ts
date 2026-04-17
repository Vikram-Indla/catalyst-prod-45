/**
 * useTicketOrigin — source-aware origin tracking for full-page ticket view.
 *
 * When a user opens a full-page ticket from a backlog (story / epic / feature),
 * the breadcrumb must reflect that entry point. This hook resolves origin in
 * priority order:
 *   1. router `location.state.ticketOrigin` (richest, survives in-app nav)
 *   2. sessionStorage `ticketOrigin` (survives page refresh)
 *   3. null (deep link — caller should render minimal fallback breadcrumb)
 *
 * Writers (backlog pages, "open full page" links) should call
 * `writeTicketOrigin()` before navigation to keep both stores in sync.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export type TicketOriginType =
  | 'story-backlog'
  | 'epic-backlog'
  | 'feature-backlog'
  | 'list'
  | 'search'
  | 'hierarchy';

export interface TicketOrigin {
  fromUrl: string;
  fromLabel: string;
  fromType: TicketOriginType;
}

const STORAGE_KEY = 'ticketOrigin';

function readSession(): TicketOrigin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketOrigin;
    if (!parsed.fromUrl || !parsed.fromLabel || !parsed.fromType) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTicketOrigin(origin: TicketOrigin): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(origin));
  } catch {
    /* quota / private mode — silently degrade */
  }
}

export function clearTicketOrigin(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Reads origin from router state first, sessionStorage second.
 * Writes the resolved origin back to sessionStorage so a refresh keeps context.
 */
export function useTicketOrigin(): TicketOrigin | null {
  const location = useLocation();
  const stateOrigin = (location.state as { ticketOrigin?: TicketOrigin } | null)?.ticketOrigin ?? null;
  const [origin, setOrigin] = useState<TicketOrigin | null>(() => stateOrigin ?? readSession());

  useEffect(() => {
    if (stateOrigin) {
      writeTicketOrigin(stateOrigin);
      setOrigin(stateOrigin);
      return;
    }
    const fallback = readSession();
    if (fallback) setOrigin(fallback);
  }, [stateOrigin]);

  return origin;
}

export const TICKET_ORIGIN_LABELS: Record<TicketOriginType, string> = {
  'story-backlog': 'Story backlog',
  'epic-backlog': 'Epic backlog',
  'feature-backlog': 'Feature backlog',
  list: 'All work',
  search: 'Search',
  hierarchy: 'Hierarchy',
};
