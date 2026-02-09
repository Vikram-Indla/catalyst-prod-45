/**
 * Analytics Resource Row - V10 Design with Unified CapacityAvatar
 */

import { cn } from '@/lib/utils';
import { AnalyticsMonthCell } from './AnalyticsMonthCell';
import { CapacityAvatar } from '@/components/capacity/CapacityAvatar';
import type { CapacityRow } from './types';

interface AnalyticsResourceRowProps {
  row: CapacityRow;
  onResourceClick?: (resourceId: string) => void;
}

export function AnalyticsResourceRow({ row, onResourceClick }: AnalyticsResourceRowProps) {
  const { resource, months, committedPercent } = row;

  // Location badge styling
  const locationName = resource.location?.name?.toLowerCase() || '';
  const isOnsite = locationName.includes('onsite') || locationName.includes('riyadh');
  const isOffshore = locationName.includes('offshore');
  const isHybrid = locationName.includes('hybrid');
  
  // Enterprise Clean: All badges neutralized to gray
  const getLocationBadge = () => {
    if (isOnsite) return { label: 'ONSITE' };
    if (isOffshore) return { label: 'OFFSHORE' };
    if (isHybrid) return { label: 'HYBRID' };
    return { label: locationName.toUpperCase() || '-' };
  };
  
  const badge = getLocationBadge();
  const deptName = resource.department?.name || 'BMC';

  // Avatar styling - Enterprise Clean: Neutralized to gray
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  
  // Country flag - use flag_svg from database (same as admin/users)
  const countryName = resource.country?.name;
  const flagUrl = resource.country?.flag_svg || null;

  // Utilization color - colored borders based on percentage
  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-green-500 border-2 font-bold';
    if (percent >= 75) return 'text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border-amber-500 border-2 font-bold';
    if (percent >= 50) return 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-red-500 border-2 font-bold';
    return 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-400 font-bold';
  };

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
      {/* Resource Info Cell with Avatar */}
      <td className="sticky left-0 z-10 bg-card py-3 px-4 min-w-[280px] max-w-[280px] w-[280px] border-r border-border">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onResourceClick?.(resource.id)}
        >
          {/* Avatar with flag overlay - V10 Style: Unified CapacityAvatar */}
          <CapacityAvatar
            initials={initials}
            avatarUrl={(resource as any).avatar_url}
            flagUrl={flagUrl}
            countryName={countryName}
            size="md"
          />
          
          {/* Name, Role, Department - match original structure */}
          <div className="flex flex-col min-w-0">
            <div className="font-bold text-sm text-slate-800 truncate resource-name">
              {resource.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {resource.role_name || 'No role'}
            </div>
            <div className="text-xs font-medium text-primary truncate">
              {deptName}
              {resource.vendor?.name && (
                <span className="text-muted-foreground font-normal"> - {resource.vendor.name}</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Location Badge Cell - Enterprise Clean: Neutralized */}
      <td className="py-3 px-3 min-w-[100px] max-w-[100px] w-[100px] border-r border-border text-center">
        <span 
          className="inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide"
          style={{ 
            backgroundColor: 'transparent', 
            color: '#64748b',
            border: 'none'
          }}
        >
          {badge.label}
        </span>
      </td>

      {/* Utilization Cell */}
      <td className="py-3 px-3 min-w-[100px] max-w-[100px] w-[100px] border-r border-border text-center">
        <span className={cn(
          'inline-block px-2 py-1 text-xs font-bold rounded border',
          getUtilizationColor(committedPercent)
        )}>
          {committedPercent}%
        </span>
      </td>
      
      {/* Monthly cells */}
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

// Department group header row - Blue text to match reference
export function DepartmentGroupHeader({ name }: { name: string }) {
  return (
    <tr>
      <td colSpan={100} className="sticky left-0 bg-card pt-4 pb-2 px-4">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          {name}
        </span>
      </td>
    </tr>
  );
}
