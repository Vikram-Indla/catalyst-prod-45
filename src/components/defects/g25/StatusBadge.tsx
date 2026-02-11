import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const config: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-700' },
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700' },
  fixed: { label: 'Fixed', className: 'bg-teal-100 text-teal-700' },
  resolved: { label: 'Resolved', className: 'bg-teal-100 text-teal-700' },
  verified: { label: 'Verified', className: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-700' },
  reopened: { label: 'Reopened', className: 'bg-orange-100 text-orange-700' },
  deferred: { label: 'Deferred', className: 'bg-slate-100 text-slate-700' },
};

export function StatusBadge({ status }: { status: string }) {
  const c = config[status] || config.new;
  return <Badge className={cn('text-xs', c.className)}>{c.label}</Badge>;
}
