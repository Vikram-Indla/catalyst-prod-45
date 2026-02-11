import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const config: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', className: 'bg-green-100 text-green-700 border-green-200' },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const c = config[severity] || config.medium;
  return <Badge variant="outline" className={cn('text-xs', c.className)}>{c.label}</Badge>;
}
