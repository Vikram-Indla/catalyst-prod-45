/**
 * TablePill — Incident table status/severity/SLA visuals (Catalyst compliant)
 *
 * Hard rules:
 * - No teal/cyan/blue/purple/pink/lime/orange/red UI states
 * - Use only Catalyst Golden Hour palette:
 *   Gold #c69c6d | Olive #5c7c5c | Bronze #8b7355 | Champagne #d4b896 | Grey #c8ccd0
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const CATALYST = {
  gold: '#c69c6d',
  olive: '#5c7c5c',
  bronze: '#8b7355',
  champagne: '#d4b896',
  grey: '#c8ccd0',
  cream: '#faf7f1',
  border: '#e5e0d8',
  onyx: '#1a1a1a',
  muted: '#6b7280',
} as const;

export interface TablePillProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

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
 */
export function SeverityPill({ severity }: { severity: string }) {
  const severityColors: Record<string, string> = {
    SEV1: CATALYST.gold,
    SEV2: CATALYST.bronze,
    SEV3: CATALYST.olive,
    SEV4: CATALYST.grey,
  };

  const dot = severityColors[severity] || CATALYST.grey;
  const text = severity === 'SEV4' ? CATALYST.muted : CATALYST.onyx;

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
 * Status — subtle pill with dot (Catalyst mapping)
 */
export function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase().replace(/[\s-]/g, '_');

  const styles: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
    open: {
      label: 'Open',
      bg: CATALYST.cream,
      border: CATALYST.gold,
      text: CATALYST.gold,
      dot: CATALYST.gold,
    },
    triage: {
      label: 'Triaging',
      bg: 'rgba(198, 156, 109, 0.10)',
      border: 'transparent',
      text: CATALYST.bronze,
      dot: CATALYST.gold,
    },
    triaging: {
      label: 'Triaging',
      bg: 'rgba(198, 156, 109, 0.10)',
      border: 'transparent',
      text: CATALYST.bronze,
      dot: CATALYST.gold,
    },
    to_committee: {
      label: 'Committee',
      bg: 'rgba(200, 204, 208, 0.30)',
      border: 'transparent',
      text: CATALYST.muted,
      dot: CATALYST.grey,
    },
    committee: {
      label: 'Committee',
      bg: 'rgba(200, 204, 208, 0.30)',
      border: 'transparent',
      text: CATALYST.muted,
      dot: CATALYST.grey,
    },
    in_progress: {
      label: 'In Progress',
      bg: 'rgba(92, 124, 92, 0.10)',
      border: 'transparent',
      text: CATALYST.olive,
      dot: CATALYST.olive,
    },
    resolved: {
      label: 'Resolved',
      bg: 'rgba(92, 124, 92, 0.15)',
      border: 'transparent',
      text: CATALYST.olive,
      dot: CATALYST.olive,
    },
    converted: {
      label: 'Converted',
      bg: 'rgba(200, 204, 208, 0.20)',
      border: 'transparent',
      text: CATALYST.muted,
      dot: CATALYST.grey,
    },
    closed: {
      label: 'Closed',
      bg: 'rgba(200, 204, 208, 0.15)',
      border: 'transparent',
      text: CATALYST.muted,
      dot: CATALYST.grey,
    },
  };

  const cfg = styles[normalized] || {
    label: status || '—',
    bg: 'rgba(200, 204, 208, 0.15)',
    border: 'transparent',
    text: CATALYST.muted,
    dot: CATALYST.grey,
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
 * SLA — Olive (On Track) / Bronze (Breached)
 */
export function SlaPill({ status }: { status: string }) {
  if (status === 'breached') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ backgroundColor: 'rgba(139, 115, 85, 0.12)', color: CATALYST.bronze }}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Breached</span>
      </span>
    );
  }

  if (status === 'on_track') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ backgroundColor: 'rgba(92, 124, 92, 0.12)', color: CATALYST.olive }}
      >
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        <span>On Track</span>
      </span>
    );
  }

  return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
}

// Major — bronze emphasis (no red)
export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  return (
    <TablePill
      style={{
        backgroundColor: 'rgba(139, 115, 85, 0.12)',
        color: CATALYST.bronze,
        border: `1px solid ${CATALYST.border}`,
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
