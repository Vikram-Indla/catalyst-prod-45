/**
 * TablePill — Incident table status/severity/SLA visuals (theme-aware)
 *
 * Rules:
 * - Use semantic tokens (CSS vars) so dark mode stays correct
 * - Brand colors exposed as HSL vars in index.css:
 *   --catalyst-gold / --catalyst-olive / --catalyst-bronze / --catalyst-champagne / --catalyst-grey
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export interface TablePillProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const brand = {
  gold: 'hsl(var(--catalyst-gold))',
  goldBg: 'hsl(var(--catalyst-gold) / 0.12)',
  olive: 'hsl(var(--catalyst-olive))',
  oliveBg: 'hsl(var(--catalyst-olive) / 0.12)',
  bronze: 'hsl(var(--catalyst-bronze))',
  bronzeBg: 'hsl(var(--catalyst-bronze) / 0.12)',
  champagneBg: 'hsl(var(--catalyst-champagne) / 0.14)',
  grey: 'hsl(var(--catalyst-grey))',
  greyBg: 'hsl(var(--catalyst-grey) / 0.22)',
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
 */
export function SeverityPill({ severity }: { severity: string }) {
  const dotColor: Record<string, string> = {
    SEV1: brand.gold,
    SEV2: brand.bronze,
    SEV3: brand.olive,
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
 * Status — subtle pill with dot (Catalyst mapping)
 */
export function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase().replace(/[\s-]/g, '_');

  const styles: Record<
    string,
    { label: string; bg: string; border: string; text: string; dot: string }
  > = {
    open: {
      label: 'Open',
      bg: brand.surface,
      border: brand.gold,
      text: brand.gold,
      dot: brand.gold,
    },
    triage: {
      label: 'Triaging',
      bg: brand.goldBg,
      border: 'transparent',
      text: brand.bronze,
      dot: brand.gold,
    },
    triaging: {
      label: 'Triaging',
      bg: brand.goldBg,
      border: 'transparent',
      text: brand.bronze,
      dot: brand.gold,
    },
    to_committee: {
      label: 'Committee',
      bg: brand.greyBg,
      border: 'transparent',
      text: brand.mutedFg,
      dot: brand.grey,
    },
    committee: {
      label: 'Committee',
      bg: brand.greyBg,
      border: 'transparent',
      text: brand.mutedFg,
      dot: brand.grey,
    },
    in_progress: {
      label: 'In Progress',
      bg: brand.oliveBg,
      border: 'transparent',
      text: brand.olive,
      dot: brand.olive,
    },
    resolved: {
      label: 'Resolved',
      bg: 'hsl(var(--catalyst-olive) / 0.16)',
      border: 'transparent',
      text: brand.olive,
      dot: brand.olive,
    },
    converted: {
      label: 'Converted',
      bg: 'hsl(var(--catalyst-grey) / 0.16)',
      border: 'transparent',
      text: brand.mutedFg,
      dot: brand.grey,
    },
    closed: {
      label: 'Closed',
      bg: 'hsl(var(--catalyst-grey) / 0.12)',
      border: 'transparent',
      text: brand.mutedFg,
      dot: brand.grey,
    },
  };

  const cfg = styles[normalized] || {
    label: status || '—',
    bg: 'hsl(var(--catalyst-grey) / 0.12)',
    border: 'transparent',
    text: brand.mutedFg,
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
 * SLA — Olive (On Track) / Bronze (Breached)
 */
export function SlaPill({ status }: { status: string }) {
  if (status === 'breached') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-5"
        style={{ backgroundColor: brand.bronzeBg, color: brand.bronze }}
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
        style={{ backgroundColor: brand.oliveBg, color: brand.olive }}
      >
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        <span>On Track</span>
      </span>
    );
  }

  return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
}

// Major — bronze emphasis (theme-aware)
export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  return (
    <TablePill
      style={{
        backgroundColor: brand.bronzeBg,
        color: brand.bronze,
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
