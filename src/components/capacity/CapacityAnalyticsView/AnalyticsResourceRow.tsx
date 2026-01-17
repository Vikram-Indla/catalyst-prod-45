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
  const { resource, months } = row;

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

      {/* Month Cells */}
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
