import { cn } from '@/lib/utils';

type IncidentStatus = 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed' | 'implementing' | 'analysis';
type ReleaseStatus = 'unreleased' | 'released' | 'overdue';

interface StatusBadgeProps {
  status: IncidentStatus | ReleaseStatus;
  className?: string;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  // Incident statuses
  'open': { bg: '#E3F2FD', text: '#1565C0', label: 'Open' },
  'in-progress': { bg: '#FFF3E0', text: '#E65100', label: 'In Progress' },
  'pending': { bg: '#FFF3E0', text: '#E65100', label: 'Pending' },
  'resolved': { bg: '#E6F4EA', text: '#1E7E34', label: 'Resolved' },
  'closed': { bg: '#F5F5F5', text: '#616161', label: 'Closed' },
  'implementing': { bg: '#F3E5F5', text: '#7B1FA2', label: 'Implementing' },
  'analysis': { bg: '#FFF8E1', text: '#F57F17', label: 'Analysis' },
  // Release statuses
  'unreleased': { bg: '#E3F2FD', text: '#1565C0', label: 'Unreleased' },
  'released': { bg: '#E8F5E9', text: '#2E7D32', label: 'Released' },
  'overdue': { bg: '#FFEBEE', text: '#C62828', label: 'Overdue' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles['open'];
  
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide",
        className
      )}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
