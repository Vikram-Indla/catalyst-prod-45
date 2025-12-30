import { cn } from '@/lib/utils';

type IncidentStatus = 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed' | 'implementing' | 'analysis' | 'reopened' | 'cancelled';
type ReleaseStatus = 'unreleased' | 'released' | 'overdue';

interface StatusBadgeProps {
  status: IncidentStatus | ReleaseStatus;
  className?: string;
}

// Design System V2 compliant status styles
// SUCCESS states use TEAL (not green) per spec
const statusStyles: Record<string, { light: { bg: string; text: string }; dark: { bg: string; text: string }; label: string }> = {
  // Incident statuses
  'open': { 
    light: { bg: 'bg-blue-100', text: 'text-blue-700' },
    dark: { bg: 'dark:bg-blue-900/30', text: 'dark:text-blue-400' },
    label: 'Open' 
  },
  'in-progress': { 
    light: { bg: 'bg-amber-100', text: 'text-amber-700' },
    dark: { bg: 'dark:bg-amber-900/30', text: 'dark:text-amber-400' },
    label: 'In Progress' 
  },
  'pending': { 
    light: { bg: 'bg-amber-100', text: 'text-amber-700' },
    dark: { bg: 'dark:bg-amber-900/30', text: 'dark:text-amber-400' },
    label: 'Pending' 
  },
  // TEAL for success states per design spec v2
  'resolved': { 
    light: { bg: 'bg-[rgba(13,148,136,0.1)]', text: 'text-[#0d9488]' },
    dark: { bg: 'dark:bg-[rgba(20,184,166,0.15)]', text: 'dark:text-[#14b8a6]' },
    label: 'Resolved' 
  },
  'closed': { 
    light: { bg: 'bg-muted', text: 'text-muted-foreground' },
    dark: { bg: 'dark:bg-muted', text: 'dark:text-muted-foreground' },
    label: 'Closed' 
  },
  'implementing': { 
    light: { bg: 'bg-blue-100', text: 'text-blue-700' },
    dark: { bg: 'dark:bg-blue-900/30', text: 'dark:text-blue-400' },
    label: 'Implementing' 
  },
  'analysis': { 
    light: { bg: 'bg-amber-100', text: 'text-amber-700' },
    dark: { bg: 'dark:bg-amber-900/30', text: 'dark:text-amber-400' },
    label: 'Analysis' 
  },
  'reopened': { 
    light: { bg: 'bg-red-100', text: 'text-red-700' },
    dark: { bg: 'dark:bg-red-900/30', text: 'dark:text-red-400' },
    label: 'Reopened' 
  },
  'cancelled': { 
    light: { bg: 'bg-muted', text: 'text-muted-foreground' },
    dark: { bg: 'dark:bg-muted', text: 'dark:text-muted-foreground' },
    label: 'Cancelled' 
  },
  // Release statuses
  'unreleased': { 
    light: { bg: 'bg-blue-100', text: 'text-blue-700' },
    dark: { bg: 'dark:bg-blue-900/30', text: 'dark:text-blue-400' },
    label: 'Unreleased' 
  },
  // TEAL for success states per design spec v2
  'released': { 
    light: { bg: 'bg-[rgba(13,148,136,0.1)]', text: 'text-[#0d9488]' },
    dark: { bg: 'dark:bg-[rgba(20,184,166,0.15)]', text: 'dark:text-[#14b8a6]' },
    label: 'Released' 
  },
  'overdue': { 
    light: { bg: 'bg-red-100', text: 'text-red-700' },
    dark: { bg: 'dark:bg-red-900/30', text: 'dark:text-red-400' },
    label: 'Overdue' 
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles['open'];
  
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide",
        style.light.bg, style.light.text,
        style.dark.bg, style.dark.text,
        className
      )}
    >
      {style.label}
    </span>
  );
}
