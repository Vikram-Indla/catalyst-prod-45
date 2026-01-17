/**
 * Analytics Resource Row - Resource info + monthly cells
 */

import { cn } from '@/lib/utils';
import { AnalyticsMonthCell } from './AnalyticsMonthCell';
import type { CapacityRow } from './types';

interface AnalyticsResourceRowProps {
  row: CapacityRow;
  onResourceClick?: (resourceId: string) => void;
}

export function AnalyticsResourceRow({ row, onResourceClick }: AnalyticsResourceRowProps) {
  const { resource, months } = row;

  // Get initials
  const initials = resource.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Location styling
  const locationName = resource.location?.name || '';
  const isOnsite = locationName.toLowerCase().includes('onsite');
  const isOffshore = locationName.toLowerCase().includes('offshore');
  const avatarBgClass = isOnsite ? 'bg-brand-teal' : isOffshore ? 'bg-brand-primary' : 'bg-muted';
  const locLabel = isOnsite ? 'Onsite' : isOffshore ? 'Offshore' : locationName;
  const locLabelClass = isOnsite ? 'text-brand-teal' : isOffshore ? 'text-brand-primary' : 'text-muted-foreground';

  return (
    <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors">
      {/* Resource Info Cell */}
      <td className="sticky left-0 z-10 bg-card p-3 min-w-[260px] border-r border-border">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onResourceClick?.(resource.id)}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white',
              avatarBgClass
            )}>
              {initials}
            </div>
            {/* Country flag */}
            {resource.country?.code && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card border border-border overflow-hidden flex items-center justify-center text-[10px]">
                {resource.country.code}
              </div>
            )}
          </div>

          {/* Name & Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">
                {resource.name}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {resource.role_name || 'No role'}
            </div>
            {locLabel && (
              <span className={cn('text-[10px] font-medium tracking-wide uppercase', locLabelClass)}>
                {locLabel}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Month Cells */}
      {months.map((cell, idx) => (
        <AnalyticsMonthCell 
          key={`${cell.year}-${cell.month}`}
          cell={cell}
          contractEndDate={resource.contract_end_date}
          resourceName={resource.name}
        />
      ))}
    </tr>
  );
}
