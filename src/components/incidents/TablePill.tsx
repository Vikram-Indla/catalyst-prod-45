/**
 * TablePill — Incident table status/severity/SLA visuals (Catalyst-compliant)
 *
 * CATALYST PURE ONYX DESIGN SYSTEM
 * - Success: #22c55e (green)
 * - Warning: #f59e0b (amber)
 * - Danger: #ef4444 (red)
 * - Info: #3b82f6 (blue)
 * - Brand Gold: #c69c6d
 * - Muted: #8a8a8a
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface TablePillProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Catalyst Pure Onyx tokens
const catalyst = {
  // Status colors
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  successBorder: 'rgba(34, 197, 94, 0.3)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
  
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  infoBorder: 'rgba(59, 130, 246, 0.3)',
  
  // Brand
  gold: '#c69c6d',
  goldBg: 'rgba(198, 156, 109, 0.15)',
  goldBorder: 'rgba(198, 156, 109, 0.3)',
  
  // Neutral
  muted: '#8a8a8a',
  mutedBg: '#2d2d2d',
  mutedBorder: '#404040',
  
  // Text
  text1: '#f5f5f5',
  text2: '#d4d4d4',
  text4: '#8a8a8a',
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
 * SEV1 = Red (Danger), SEV2 = Amber (Warning), SEV3 = Blue (Info), SEV4 = Gray (Muted)
 */
export function SeverityPill({ severity }: { severity: string }) {
  const dotColor: Record<string, string> = {
    SEV1: catalyst.danger,
    SEV2: catalyst.warning,
    SEV3: catalyst.info,
    SEV4: catalyst.muted,
  };

  const dot = dotColor[severity] || catalyst.muted;

  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      <span className="text-[12px] font-medium" style={{ color: catalyst.text2 }}>
        {severity}
      </span>
    </div>
  );
}

/**
 * Status — Catalyst semantic mapping:
 * - Open = Amber (Warning - needs action)
 * - Triaging = Blue (Info - investigating)
 * - In Progress = Gold (Brand - active work)
 * - Resolved = Green (Success - complete)
 * - Closed = Gray (Muted - archived)
 */
export function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase().replace(/[\s-]/g, '_');

  const styles: Record<
    string,
    { label: string; bg: string; border: string; text: string; dot: string }
  > = {
    open: {
      label: 'Open',
      bg: catalyst.warningBg,
      border: catalyst.warningBorder,
      text: catalyst.warning,
      dot: catalyst.warning,
    },
    triage: {
      label: 'Triaging',
      bg: catalyst.infoBg,
      border: catalyst.infoBorder,
      text: catalyst.info,
      dot: catalyst.info,
    },
    triaging: {
      label: 'Triaging',
      bg: catalyst.infoBg,
      border: catalyst.infoBorder,
      text: catalyst.info,
      dot: catalyst.info,
    },
    to_committee: {
      label: 'Committee',
      bg: catalyst.mutedBg,
      border: catalyst.mutedBorder,
      text: catalyst.muted,
      dot: catalyst.muted,
    },
    committee: {
      label: 'Committee',
      bg: catalyst.mutedBg,
      border: catalyst.mutedBorder,
      text: catalyst.muted,
      dot: catalyst.muted,
    },
    in_progress: {
      label: 'In Progress',
      bg: catalyst.goldBg,
      border: catalyst.goldBorder,
      text: catalyst.gold,
      dot: catalyst.gold,
    },
    resolved: {
      label: 'Resolved',
      bg: catalyst.successBg,
      border: catalyst.successBorder,
      text: catalyst.success,
      dot: catalyst.success,
    },
    converted: {
      label: 'Converted',
      bg: catalyst.mutedBg,
      border: catalyst.mutedBorder,
      text: catalyst.muted,
      dot: catalyst.muted,
    },
    closed: {
      label: 'Closed',
      bg: catalyst.mutedBg,
      border: catalyst.mutedBorder,
      text: catalyst.muted,
      dot: catalyst.muted,
    },
  };

  const cfg = styles[normalized] || {
    label: status || '—',
    bg: catalyst.mutedBg,
    border: catalyst.mutedBorder,
    text: catalyst.muted,
    dot: catalyst.muted,
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
 * SLA — Green (On Track) / Amber (At Risk) / Red (Breached)
 */
export function SlaPill({ status }: { status: string }) {
  if (status === 'breached') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ 
          backgroundColor: catalyst.dangerBg, 
          color: catalyst.danger,
          border: `1px solid ${catalyst.dangerBorder}`,
        }}
      >
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Breached</span>
      </span>
    );
  }

  if (status === 'at_risk') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ 
          backgroundColor: catalyst.warningBg, 
          color: catalyst.warning,
          border: `1px solid ${catalyst.warningBorder}`,
        }}
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
        style={{ 
          backgroundColor: catalyst.successBg, 
          color: catalyst.success,
          border: `1px solid ${catalyst.successBorder}`,
        }}
      >
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        <span>On Track</span>
      </span>
    );
  }

  return <span className="text-[11px] leading-5" style={{ color: catalyst.text4 }}>—</span>;
}

// Major — red emphasis for urgent items
export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) return <span className="text-[11px] leading-5" style={{ color: catalyst.text4 }}>—</span>;
  return (
    <TablePill
      style={{
        backgroundColor: catalyst.dangerBg,
        color: catalyst.danger,
        border: `1px solid ${catalyst.dangerBorder}`,
      }}
    >
      Major
    </TablePill>
  );
}

export function CommitteePill({ status, label }: { status: string; label: string }) {
  if (status === 'n/a' || status === 'none' || !status || label === 'N/A') {
    return <span className="text-[11px] leading-5" style={{ color: catalyst.text4 }}>—</span>;
  }
  return <span className="text-[11px] font-medium whitespace-nowrap leading-5 truncate" style={{ color: catalyst.text2 }}>{label}</span>;
}
