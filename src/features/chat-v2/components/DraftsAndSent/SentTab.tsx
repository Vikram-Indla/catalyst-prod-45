import React, { useEffect, useMemo, useRef } from 'react';
import { useMySentMessages, type SentMessage } from '../../hooks/useMySentMessages';
import { dayKey, formatDateSeparator } from '../../lib/formatTimestamp';
import { SentRow } from './SentRow';
import type { ChatConversation } from '@/types/chat';

interface SentTabProps {
  conversationById: Map<string, ChatConversation>;
  onSelectSent: (msg: SentMessage) => void;
}

interface DayGroup {
  key: string;
  label: string;
  rows: SentMessage[];
}

export function SentTab({ conversationById, onSelectSent }: SentTabProps) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMySentMessages();

  const allRows = useMemo<SentMessage[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(p => p.rows);
  }, [data]);

  const groups = useMemo<DayGroup[]>(() => {
    const todayKey = dayKey(new Date().toISOString());
    const out: DayGroup[] = [];
    let current: DayGroup | null = null;
    for (const row of allRows) {
      const key = dayKey(row.deliveredAt);
      const label = key === todayKey ? 'Today' : labelFor(row.deliveredAt);
      if (!current || current.key !== key) {
        current = { key, label, rows: [] };
        out.push(current);
      }
      current.rows.push(row);
    }
    return out;
  }, [allRows]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasNextPage || isFetchingNextPage) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: '160px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return null;

  if (allRows.length === 0) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--cv2-text-muted)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 14,
        }}
      >
        You haven&rsquo;t sent any messages yet.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
      }}
    >
      {groups.map(group => (
        <section key={group.key} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '4px 4px 8px',
              fontFamily: 'var(--cv2-font)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--cv2-text-subtle)',
            }}
          >
            {group.label}
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              border: '1px solid var(--cv2-border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {group.rows.map((row, idx) => (
              <li key={row.id}>
                <SentRow
                  message={row}
                  conversation={conversationById.get(row.conversationId)}
                  onClick={() => onSelectSent(row)}
                  isLastInGroup={idx === group.rows.length - 1}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasNextPage && <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />}
    </div>
  );
}

function labelFor(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return formatDateSeparator(iso);
  }
  return `${d.toLocaleDateString([], { month: 'long' })} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
