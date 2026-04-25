/**
 * SyncBanner — Top banner for conflict warnings
 * C3: Full-width strip below project tab bar. Fades out 200ms on dismiss.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface SyncBannerProps {
  conflictCount: number;
  lastSyncedAt?: string | null;
  onReviewConflicts: () => void;
  onSyncNow: () => void;
  onDismiss: () => void;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SyncBanner({ conflictCount, lastSyncedAt, onReviewConflicts, onSyncNow, onDismiss }: SyncBannerProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!fading) return;
    const timer = setTimeout(() => onDismiss(), 200);
    return () => clearTimeout(timer);
  }, [fading, onDismiss]);

  if (conflictCount === 0 && !fading) return null;

  const handleDismiss = () => {
    setFading(true);
  };

  return (
    <div
      className="flex items-center w-full"
      style={{
        background: 'var(--sem-warning-bg)',
        borderBottom: '0.75px solid #FDE68A',
        padding: '8px 28px',
        fontFamily: 'var(--cp-font-body)',
        fontSize: 12,
        color: 'var(--sem-warning-fg)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle size={14} style={{ color: 'var(--sem-warning-fg)', flexShrink: 0 }} />
        <span>
          <strong>{conflictCount}</strong> Jira issue{conflictCount > 1 ? 's have' : ' has'} conflicts — local edits differ from Jira.
          {' '}Last full sync: {relativeTime(lastSyncedAt)}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <button
          onClick={onReviewConflicts}
          style={{
            border: '0.75px solid var(--sem-warning)',
            background: 'none',
            color: 'var(--sem-warning-fg)',
            borderRadius: 4,
            height: 26,
            padding: '0 10px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--cp-font-body)',
            cursor: 'pointer',
          }}
        >
          Review Conflicts
        </button>
        <button
          onClick={onSyncNow}
          style={{
            border: '0.75px solid var(--sem-warning)',
            background: 'none',
            color: 'var(--sem-warning-fg)',
            borderRadius: 4,
            height: 26,
            padding: '0 10px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--cp-font-body)',
            cursor: 'pointer',
          }}
        >
          Sync Now
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--sem-warning-fg)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--cp-font-body)',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
