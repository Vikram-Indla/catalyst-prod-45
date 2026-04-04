/**
 * SyncStatusDot — Coloured dot + label for sync health
 * C2: Only on Jira-sourced items. Radix tooltip on hover.
 */
import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

type SyncStatus = 'synced' | 'stale' | 'conflict' | 'syncing' | 'pending';

interface SyncStatusDotProps {
  status: SyncStatus;
  lastSyncedAt?: string | null;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function exactDateTime(iso?: string | null): string {
  if (!iso) return 'Never synced';
  const d = new Date(iso);
  return `Last synced: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

const DOT_COLORS: Record<SyncStatus, string> = {
  synced: '#16A34A',
  stale: '#D97706',
  conflict: '#DC2626',
  syncing: '#2563EB',
  pending: '#94A3B8',
};

export function SyncStatusDot({ status, lastSyncedAt }: SyncStatusDotProps) {
  const dotColor = DOT_COLORS[status] || '#94A3B8';

  let label: string;
  let labelColor: string;
  let fontWeight: number = 400;

  switch (status) {
    case 'synced':
      label = relativeTime(lastSyncedAt);
      labelColor = 'var(--cp-text-tertiary, #94A3B8)';
      break;
    case 'stale':
      label = relativeTime(lastSyncedAt);
      labelColor = 'var(--sem-warning)';
      break;
    case 'conflict':
      label = 'Conflict';
      labelColor = 'var(--sem-danger)';
      fontWeight = 500;
      break;
    case 'syncing':
      label = 'Syncing…';
      labelColor = 'var(--cp-blue)';
      break;
    default:
      label = 'Pending';
      labelColor = 'var(--cp-text-tertiary, #94A3B8)';
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="inline-flex items-center gap-[5px] shrink-0 cursor-default">
            <span
              className={status === 'syncing' ? 'sync-pulse-dot' : ''}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: dotColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                color: labelColor,
                fontWeight,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={4}
            style={{
              backgroundColor: 'var(--fg-1)',
              color: '#FFFFFF',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              zIndex: 100,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {exactDateTime(lastSyncedAt)}
            <Tooltip.Arrow style={{ fill: 'var(--fg-1)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <style>{`
        @keyframes syncPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .sync-pulse-dot {
          animation: syncPulse 1s ease-in-out infinite;
        }
      `}</style>
    </Tooltip.Provider>
  );
}
