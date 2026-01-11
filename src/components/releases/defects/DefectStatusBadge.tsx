import { cn } from "@/lib/utils";

interface DefectStatusBadgeProps {
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
}

export function DefectStatusBadge({ status }: DefectStatusBadgeProps) {
  const styles: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    reopened: 'bg-orange-100 text-orange-700'
  };
  
  const labels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    reopened: 'Reopened'
  };
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      styles[status]
    )}>
      {labels[status]}
    </span>
  );
}
