import { cn } from '@/lib/utils';

type IncidentStatus = 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed' | 'implementing' | 'analysis' | 'reopened' | 'cancelled';
type ReleaseStatus = 'unreleased' | 'released' | 'overdue';

interface StatusBadgeProps {
  status: IncidentStatus | ReleaseStatus;
  className?: string;
}

// Pure Onyx compliant status styles with dark mode support
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
  'resolved': { 
    light: { bg: 'bg-green-100', text: 'text-green-700' },
    dark: { bg: 'dark:bg-green-900/30', text: 'dark:text-green-400' },
    label: 'Resolved' 
  },
  'closed': { 
    light: { bg: 'bg-gray-100', text: 'text-gray-600' },
    dark: { bg: 'dark:bg-gray-800', text: 'dark:text-gray-400' },
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
    light: { bg: 'bg-gray-100', text: 'text-gray-600' },
    dark: { bg: 'dark:bg-gray-800', text: 'dark:text-gray-400' },
    label: 'Cancelled' 
  },
  // Release statuses
  'unreleased': { 
    light: { bg: 'bg-blue-100', text: 'text-blue-700' },
    dark: { bg: 'dark:bg-blue-900/30', text: 'dark:text-blue-400' },
    label: 'Unreleased' 
  },
  'released': { 
    light: { bg: 'bg-green-100', text: 'text-green-700' },
    dark: { bg: 'dark:bg-green-900/30', text: 'dark:text-green-400' },
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
