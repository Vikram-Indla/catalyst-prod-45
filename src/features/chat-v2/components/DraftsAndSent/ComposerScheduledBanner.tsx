import React, { useEffect, useState } from 'react';

interface ComposerScheduledBannerProps {
  count: number;
  nextSendAt: string;
  onSeeAll: () => void;
}

export function ComposerScheduledBanner({
  count,
  nextSendAt,
  onSeeAll,
}: ComposerScheduledBannerProps) {
  // Re-render every 60 s so the relative day label stays accurate
  // across midnight rollover without a page reload.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        margin: '0 0 8px',
        background: 'var(--cv2-bg-row-hover)',
        borderRadius: 8,
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
        color: 'var(--cv2-text)',
      }}
    >
      <ClockGlyph />
      <span style={{ flex: 1, minWidth: 0 }}>
        {count > 1
          ? `${count} messages scheduled — next ${formatRelative(nextSendAt)}.`
          : `Your message will be sent ${formatRelative(nextSendAt)}.`}{' '}
        <button
          type="button"
          onClick={onSeeAll}
          style={{
            display: 'inline',
            padding: 0,
            margin: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--cv2-accent)',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.textDecoration = 'none';
          }}
        >
          See all scheduled messages
        </button>
      </span>
    </div>
  );
}

function ClockGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--cv2-text-subtle)', flex: '0 0 auto' }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const isSameDay = d.toDateString() === now.toDateString();
  if (isSameDay) return `today at ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays >= 0 && diffDays < 7) {
    return `${d.toLocaleDateString([], { weekday: 'long' })} at ${time}`;
  }
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
}
