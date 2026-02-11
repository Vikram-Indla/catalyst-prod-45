import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const config: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', className: 'bg-green-100 text-green-700' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const c = config[priority] || config.medium;
  return <Badge className={cn('text-xs gap-1', c.className)}><Zap className="h-3 w-3" />{c.label}</Badge>;
}
