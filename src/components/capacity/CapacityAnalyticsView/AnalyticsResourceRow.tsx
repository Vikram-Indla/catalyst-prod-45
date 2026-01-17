/**
 * Analytics Resource Row - V7 Design with Location column
 */

import { cn } from '@/lib/utils';
import { AnalyticsMonthCell } from './AnalyticsMonthCell';
import type { CapacityRow } from './types';

interface AnalyticsResourceRowProps {
  row: CapacityRow;
  onResourceClick?: (resourceId: string) => void;
}

export function AnalyticsResourceRow({ row, onResourceClick }: AnalyticsResourceRowProps) {
  const { resource, months, committedPercent } = row;

  // Location badge styling
  const locationName = resource.location?.name?.toLowerCase() || '';
  const isOnsite = locationName.includes('onsite');
  const isOffshore = locationName.includes('offshore');
  const isHybrid = locationName.includes('hybrid');
  
  const getLocationBadge = () => {
    if (isOnsite) return { label: 'ONSITE', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    if (isOffshore) return { label: 'OFFSHORE', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (isHybrid) return { label: 'HYBRID', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
    return { label: locationName.toUpperCase() || '-', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
  };
  
  const badge = getLocationBadge();
  const deptName = resource.department?.name || 'BMC';

  // Utilization color based on percentage
  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percent >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percent >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
      {/* Resource Info Cell */}
      <td className="sticky left-0 z-10 bg-card py-3 px-4 min-w-[180px] border-r border-border">
        <div 
          className="cursor-pointer"
          onClick={() => onResourceClick?.(resource.id)}
        >
          <div className="font-semibold text-sm text-[#0a0a0a] dark:text-white truncate">
            {resource.name}
          </div>
          <div className="text-xs text-[#737373] dark:text-gray-400">
            {resource.role_name || 'No role'}
          </div>
          <div className="text-xs text-[#2563eb] dark:text-blue-400 font-medium">
            {deptName}
          </div>
        </div>
      </td>

      {/* Location Badge Cell */}
      <td className="py-3 px-3 min-w-[100px] border-r border-border">
        <span className={cn(
          'inline-block px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wide border',
          badge.bg, badge.text, badge.border
        )}>
          {badge.label}
        </span>
      </td>

      {/* Utilization Cell */}
      <td className="py-3 px-3 min-w-[80px] border-r border-border text-center">
        <span className={cn(
          'inline-block px-2 py-1 text-xs font-bold rounded border',
          getUtilizationColor(committedPercent)
        )}>
          {committedPercent}%
        </span>
      </td>
      {months.map((cell) => (
        <AnalyticsMonthCell 
          key={`${cell.year}-${cell.month}`}
          cell={cell}
          contractEndDate={resource.contract_end_date}
        />
      ))}
    </tr>
  );
}

// Department group header row
export function DepartmentGroupHeader({ name }: { name: string }) {
  return (
    <tr>
      <td colSpan={100} className="sticky left-0 bg-card pt-4 pb-2 px-4">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          {name}
        </span>
      </td>
    </tr>
  );
}
