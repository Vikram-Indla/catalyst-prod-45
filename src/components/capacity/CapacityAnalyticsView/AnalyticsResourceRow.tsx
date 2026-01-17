/**
 * Analytics Resource Row - V8 Design with Avatar matching Resources tab
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const isOnsite = locationName.includes('onsite') || locationName.includes('riyadh');
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

  // Avatar styling (match Resources tab)
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  const avatarBgClass = 'bg-emerald-500';
  
  // Country flag - resource.country is an object with id, name, code
  const countryCode = resource.country?.code;
  const countryName = resource.country?.name;
  const flagUrl = countryCode 
    ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`
    : null;

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
      <td className="sticky left-0 z-10 bg-card py-3 px-4 min-w-[280px] border-r border-border">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onResourceClick?.(resource.id)}
        >
          {/* Avatar with flag overlay */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative flex-shrink-0">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white ring-2 ring-emerald-400",
                    avatarBgClass
                  )}
                >
                  {initials}
                </div>
                {/* Flag overlay */}
                {flagUrl && (
                  <span 
                    className="absolute -bottom-0.5 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                  >
                    <img 
                      src={flagUrl} 
                      alt={countryName || ''} 
                      className="w-3.5 h-3.5 object-cover rounded-sm"
                    />
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5">
              {countryName || 'Unknown Country'}
            </TooltipContent>
          </Tooltip>
          
          {/* Name, Role, Department - match original structure */}
          <div className="flex flex-col min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
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
