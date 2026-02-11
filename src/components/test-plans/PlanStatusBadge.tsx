import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlanStatus } from '@/types/testPlans';

const statusConfig: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const config = statusConfig[status] || statusConfig.draft;
  return <Badge className={cn('text-xs', config.className)}>{config.label}</Badge>;
}
