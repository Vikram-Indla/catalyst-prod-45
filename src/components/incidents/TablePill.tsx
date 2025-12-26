/**
 * TablePill — Incident table status/severity/SLA visuals (theme-aware)
 *
 * Rules:
 * - Use semantic tokens (CSS vars) so dark mode stays correct
 * - Brand colors: Blue #2563eb | Teal #0d9488 | Amber #f59e0b | Red #ef4444 | Gray #6b7280
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export interface TablePillProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Updated brand colors - Blue + Teal palette
const brand = {
  blue: '#2563eb',
  blueBg: 'rgba(37, 99, 235, 0.1)',
  teal: '#0d9488',
  tealBg: 'rgba(13, 148, 136, 0.1)',
  amber: '#f59e0b',
  amberBg: 'rgba(245, 158, 11, 0.1)',
  amberText: '#b45309',
  red: '#ef4444',
  redBg: 'rgba(239, 68, 68, 0.1)',
  grey: '#6b7280',
  greyBg: 'rgba(107, 114, 128, 0.1)',
  border: 'hsl(var(--border))',
  foreground: 'hsl(var(--foreground))',
  mutedFg: 'hsl(var(--muted-foreground))',
  surface: 'hsl(var(--secondary))',
} as const;

export function TablePill({ children, className, style }: TablePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-5 px-2 rounded-full',
        'text-[11px] font-semibold leading-5',
        'max-w-full overflow-hidden whitespace-nowrap',
        className
      )}
      style={style}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Severity — dot + text only (no background pill)
 * Red (SEV1), Amber (SEV2), Blue (SEV3), Gray (SEV4)
 */
export function SeverityPill({ severity }: { severity: string }) {
  const dotColor: Record<string, string> = {
    SEV1: brand.red,
    SEV2: brand.amber,
    SEV3: brand.blue,
    SEV4: brand.grey,
  };

  const dot = dotColor[severity] || brand.grey;
  const text = severity === 'SEV4' ? brand.mutedFg : brand.foreground;

  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      <span className="text-[12px] font-medium" style={{ color: text }}>
        {severity}
      </span>
    </div>
  );
}

/**
 * Status — subtle pill with dot (Blue + Teal mapping)
 */
export function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase().replace(/[\s-]/g, '_');

  const styles: Record<
    string,
    { label: string; bg: string; border: string; text: string; dot: string }
  > = {
    open: {
      label: 'Open',
      bg: brand.blueBg,
      border: brand.blue,
      text: brand.blue,
      dot: brand.blue,
    },
    triage: {
      label: 'Triaging',
      bg: brand.amberBg,
      border: 'transparent',
      text: brand.amberText,
      dot: brand.amber,
    },
    triaging: {
      label: 'Triaging',
      bg: brand.amberBg,
      border: 'transparent',
      text: brand.amberText,
      dot: brand.amber,
    },
    to_committee: {
      label: 'Committee',
      bg: brand.greyBg,
      border: 'transparent',
      text: brand.grey,
      dot: brand.grey,
    },
    committee: {
      label: 'Committee',
      bg: brand.greyBg,
      border: 'transparent',
      text: brand.grey,
      dot: brand.grey,
    },
    in_progress: {
      label: 'In Progress',
      bg: brand.blueBg,
      border: 'transparent',
      text: brand.blue,
      dot: brand.blue,
    },
    resolved: {
      label: 'Resolved',
      bg: brand.tealBg,
      border: 'transparent',
      text: brand.teal,
      dot: brand.teal,
    },
    converted: {
      label: 'Converted',
      bg: brand.greyBg,
      border: 'transparent',
      text: brand.grey,
      dot: brand.grey,
    },
    closed: {
      label: 'Closed',
      bg: brand.tealBg,
      border: 'transparent',
      text: brand.teal,
      dot: brand.teal,
    },
  };

  const cfg = styles[normalized] || {
    label: status || '—',
    bg: brand.greyBg,
    border: 'transparent',
    text: brand.grey,
    dot: brand.grey,
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      <span className="truncate">{cfg.label}</span>
    </span>
  );
}

/**
 * SLA — Teal (On Track) / Amber (At Risk) / Red (Breached)
 */
export function SlaPill({ status }: { status: string }) {
  if (status === 'breached') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ backgroundColor: brand.redBg, color: brand.red }}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Breached</span>
      </span>
    );
  }

  if (status === 'at_risk') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ backgroundColor: brand.amberBg, color: brand.amberText }}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>At Risk</span>
      </span>
    );
  }

  if (status === 'on_track') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ backgroundColor: brand.tealBg, color: brand.teal }}
      >
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        <span>On Track</span>
      </span>
    );
  }

  return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
}

// Major — red emphasis for urgent items
export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  return (
    <TablePill
      style={{
        backgroundColor: brand.redBg,
        color: brand.red,
        border: `1px solid ${brand.border}`,
      }}
    >
      Major
    </TablePill>
  );
}

export function CommitteePill({ status, label }: { status: string; label: string }) {
  if (status === 'n/a' || status === 'none' || !status || label === 'N/A') {
    return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  }
  return <span className="text-[11px] font-medium whitespace-nowrap leading-5 truncate">{label}</span>;
}