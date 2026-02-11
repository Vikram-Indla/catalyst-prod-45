import { AlertTriangle, Clock } from 'lucide-react';
import { DefectStats } from '@/types/defects';
import { cn } from '@/lib/utils';

export function DefectStatsBar({ stats }: { stats: DefectStats }) {
  const items = [
    { label: 'Open', value: stats.open, color: 'text-blue-600' },
    { label: 'In Progress', value: stats.in_progress, color: 'text-purple-600' },
    { label: 'Resolved', value: stats.resolved, color: 'text-teal-600' },
    { label: 'Critical', value: stats.critical, color: 'text-red-600', icon: AlertTriangle },
    { label: 'Overdue', value: stats.overdue, color: 'text-red-500', icon: Clock },
    { label: 'Unassigned', value: stats.unassigned, color: 'text-muted-foreground' },
  ];

  return (
    <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-semibold">{stats.total}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.icon && <item.icon className={cn("h-3.5 w-3.5", item.color)} />}
          <span className="text-muted-foreground">{item.label}:</span>
          <span className={cn("font-semibold", item.color)}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
