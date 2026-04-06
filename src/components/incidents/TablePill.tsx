/**
 * TablePill — Incident table status/severity/SLA visuals (Catalyst-compliant)
 * GUARDRAIL: StatusPill uses StatusLozenge from @/components/ui/StatusLozenge
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { StatusLozenge } from '@/components/ui/StatusLozenge';

export interface TablePillProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Catalyst V5 tokens — reference CSS variables for theme consistency
const catalyst = {
  // Status colors (using CSS variables)
  success: 'var(--success-fg, #22c55e)',
  successBg: 'var(--success-bg, rgba(34, 197, 94, 0.12))',
  successBorder: 'var(--success-bd, rgba(34, 197, 94, 0.22))',
  
  warning: 'var(--warning-fg, #f59e0b)',
  warningBg: 'var(--warning-bg, rgba(245, 158, 11, 0.12))',
  warningBorder: 'var(--warning-bd, rgba(245, 158, 11, 0.22))',
  
  danger: 'var(--danger-fg, #ef4444)',
  dangerBg: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
  dangerBorder: 'var(--danger-bd, rgba(239, 68, 68, 0.22))',
  
  info: 'var(--info-fg, #3b82f6)',
  infoBg: 'var(--info-bg, rgba(59, 130, 246, 0.12))',
  infoBorder: 'var(--info-bd, rgba(59, 130, 246, 0.22))',
  
  // Brand (teal accent - V5)
  gold: 'var(--brand-teal, #0d9488)',
  goldBg: 'var(--accent-teal-soft, rgba(13, 148, 136, 0.14))',
  goldBorder: 'var(--accent-teal-border, rgba(13, 148, 136, 0.30))',
  
  // Neutral (using CSS variables)
  muted: 'var(--fg-3, #8a8a8a)',
  mutedBg: 'var(--neutral-bg, #292929)',
  mutedBorder: 'var(--neutral-bd, #2E2E2E)',
  
  // Text (using CSS variables)
  text1: 'var(--fg-1, #f5f5f5)',
  text2: 'var(--fg-2, #d4d4d4)',
  text4: 'var(--fg-4, #8a8a8a)',
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
  return <StatusLozenge status={status} />;
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
