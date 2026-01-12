/**
 * StatusBadge — Test case workflow status badge
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type TestCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';

interface StatusBadgeProps {
  status: TestCaseStatus;
  size?: 'sm' | 'default';
  className?: string;
}

const statusVariants: Record<TestCaseStatus, 'draft' | 'ready' | 'approved' | 'deprecated'> = {
  draft: 'draft',
  ready: 'ready',
  approved: 'approved',
  deprecated: 'deprecated',
};

const statusLabels: Record<TestCaseStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  approved: 'Approved',
  deprecated: 'Deprecated',
};

export function StatusBadge({ status, size = 'default', className }: StatusBadgeProps) {
  return (
    <Badge 
      variant={statusVariants[status]} 
      size={size} 
      className={className}
    >
      {statusLabels[status]}
    </Badge>
  );
}
