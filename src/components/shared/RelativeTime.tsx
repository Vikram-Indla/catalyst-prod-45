/**
 * RelativeTime — relative timestamp with an absolute-date tooltip on hover.
 *
 * Body shows "3d", "12h", "45m" — the compact form Jira uses on dashboards
 * and activity feeds. Tooltip shows the absolute datetime (locale-formatted)
 * for users who need precision.
 *
 * Wraps Atlaskit Tooltip — the canonical primitive for hover-revealed
 * supplemental information. Renders nothing when `iso` is null/undefined
 * (caller decides what placeholder to show).
 */
import { type CSSProperties } from 'react';
import Tooltip from '@atlaskit/tooltip';

interface RelativeTimeProps {
  iso: string | null | undefined;
  /** When true, prefix with "Started " or similar. Caller-controlled. */
  prefix?: string;
  style?: CSSProperties;
  className?: string;
}

export function relativeFromIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

function absoluteFromIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function RelativeTime({ iso, prefix, style, className }: RelativeTimeProps) {
  if (!iso) {
    return <span style={style} className={className}>—</span>;
  }
  const rel = relativeFromIso(iso);
  const abs = absoluteFromIso(iso);
  return (
    <Tooltip content={abs} position="top">
      {(tooltipProps) => (
        <span {...tooltipProps} style={style} className={className}>
          {prefix ? `${prefix}${rel}` : rel}
        </span>
      )}
    </Tooltip>
  );
}
