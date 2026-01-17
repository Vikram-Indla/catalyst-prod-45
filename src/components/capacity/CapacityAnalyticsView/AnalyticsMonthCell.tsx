/**
 * Analytics Month Cell - V7 Design with assignment segments
 * Uses Catalyst V5 workstream colors
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WORKSTREAM_COLORS, DEFAULT_WORKSTREAM_COLOR } from '@/lib/workstream-colors';
import type { MonthCell, MonthSegment } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
}

// Vibrant color palette for assignments
const ASSIGNMENT_COLORS = [
  { hex: '#6366f1', hexLight: '#eef2ff' }, // indigo
  { hex: '#06b6d4', hexLight: '#ecfeff' }, // cyan
  { hex: '#0d9488', hexLight: '#f0fdfa' }, // teal
  { hex: '#2563eb', hexLight: '#eff6ff' }, // blue
  { hex: '#8b5cf6', hexLight: '#f5f3ff' }, // violet
  { hex: '#d97706', hexLight: '#fffbeb' }, // amber
  { hex: '#dc2626', hexLight: '#fef2f2' }, // red
  { hex: '#16a34a', hexLight: '#f0fdf4' }, // green
  { hex: '#db2777', hexLight: '#fdf2f8' }, // pink
  { hex: '#ea580c', hexLight: '#fff7ed' }, // orange
];

// Map assignment names to workstream tracks for color lookup
function getWorkstreamColor(assignmentName: string) {
  const lower = assignmentName.toLowerCase();
  
  // Match assignment to workstream based on keywords
  if (lower.includes('senaie') || lower.includes('senaei') || lower.includes('bau')) {
    return WORKSTREAM_COLORS['Senaie Track'];
  }
  if (lower.includes('tahom')) {
    return WORKSTREAM_COLORS['Tahommona Track'];
  }
  if (lower.includes('catalyst')) {
    return WORKSTREAM_COLORS['Catalyst Track'];
  }
  if (lower.includes('delivery')) {
    return WORKSTREAM_COLORS['Delivery Track'];
  }
  if (lower.includes('mim') || lower.includes('website')) {
    return WORKSTREAM_COLORS['MIM Website'];
  }
  if (lower.includes('data') || lower.includes('platform')) {
    return WORKSTREAM_COLORS['Data & AI Track'];
  }
  if (lower.includes('digital') || lower.includes('transformation')) {
    return { ...WORKSTREAM_COLORS['Delivery Track'], hex: '#2563eb' }; // blue
  }
  if (lower.includes('icp') || lower.includes('inspection')) {
    return { ...WORKSTREAM_COLORS['Catalyst Track'], hex: '#0d9488' }; // teal
  }
  if (lower.includes('is13') || lower.includes('sectorial')) {
    return { ...WORKSTREAM_COLORS['Senaie Track'], hex: '#6366f1' }; // indigo
  }
  if (lower.includes('international')) {
    return { ...WORKSTREAM_COLORS['Data & AI Track'], hex: '#8b5cf6' }; // violet
  }
  
  // Hash-based color for unknown assignments - always get a vibrant color
  const hash = assignmentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % ASSIGNMENT_COLORS.length;
  return { ...DEFAULT_WORKSTREAM_COLOR, ...ASSIGNMENT_COLORS[colorIndex] };
}

export function AnalyticsMonthCell({ cell, contractEndDate }: AnalyticsMonthCellProps) {
  const { totalPercent, isEnded, segments } = cell;

  // Check if contract ends this month
  const monthStart = new Date(cell.year, cell.month - 1, 1);
  const monthEnd = new Date(cell.year, cell.month, 0);
  const contractDate = contractEndDate ? new Date(contractEndDate) : null;
  const contractEndsThisMonth = contractDate && contractDate >= monthStart && contractDate <= monthEnd;

  // Contract ended (past end date) - show dotted fill
  if (isEnded) {
    return (
      <td className="p-1 min-w-[120px]">
        <div 
          className="h-12 flex items-center justify-center rounded-lg"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(156,163,175,0.3) 4px, rgba(156,163,175,0.3) 8px)',
            backgroundColor: 'rgba(156,163,175,0.1)',
          }}
        >
          <span className="text-xs font-medium text-muted-foreground/60 bg-background/80 px-2 py-0.5 rounded">END</span>
        </div>
      </td>
    );
  }

  // Contract ends this month - show dotted fill with END label
  if (contractEndsThisMonth && (segments.length === 0 || totalPercent === 0)) {
    return (
      <td className="p-1 min-w-[120px]">
        <div 
          className="h-12 flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/40"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(156,163,175,0.2) 4px, rgba(156,163,175,0.2) 8px)',
            backgroundColor: 'rgba(156,163,175,0.05)',
          }}
        >
          <span className="text-xs font-medium text-muted-foreground/70 bg-background/80 px-2 py-0.5 rounded">END</span>
        </div>
      </td>
    );
  }

  // Empty/no allocation
  if (segments.length === 0 || totalPercent === 0) {
    return (
      <td className="p-1 min-w-[120px]">
        <div className="h-12 flex items-center justify-center rounded-lg bg-muted/30" />
      </td>
    );
  }

  // Over-allocated - striped background on additional segment
  const isOverAllocated = totalPercent > 100;

  // Render segments
  const renderSegments = () => {
    // Calculate widths proportionally
    const totalWidth = segments.reduce((sum, s) => sum + s.percent, 0);
    
    return segments.map((seg, idx) => {
      const wsColor = getWorkstreamColor(seg.assignment.name);
      const width = `${(seg.percent / totalWidth) * 100}%`;
      const isForecast = seg.status === 'forecast';
      
      // Check if this segment is the "extra" over 100%
      const isExtraOver = idx > 0 && segments.slice(0, idx).reduce((s, x) => s + x.percent, 0) >= 100;
      
      return (
        <div
          key={idx}
          className={cn(
            'h-full flex flex-col items-center justify-center',
            idx === 0 && 'rounded-l-lg',
            idx === segments.length - 1 && 'rounded-r-lg',
          )}
          style={{ 
            width,
            backgroundColor: isExtraOver ? undefined : wsColor.hex,
            opacity: isForecast ? 0.4 : 1,
            backgroundImage: isExtraOver 
              ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(244,63,94,0.3) 3px, rgba(244,63,94,0.3) 6px)' 
              : undefined,
          }}
        >
          <span className={cn(
            'text-xs font-bold',
            isExtraOver ? 'text-rose-600' : 'text-white'
          )}>
            {seg.percent > 100 ? `+${seg.percent - 100}%` : `${seg.percent}%`}
          </span>
          <span className={cn(
            'text-[9px] font-medium truncate max-w-full px-1',
            isExtraOver ? 'text-rose-600' : 'text-white/90'
          )}>
            {seg.assignment.name}
          </span>
        </div>
      );
    });
  };

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-1 text-xs">
      {segments.map((seg, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span>{seg.assignment.name}</span>
          <span className="font-mono font-medium">{seg.percent}%</span>
        </div>
      ))}
      <div className="border-t pt-1 flex justify-between font-medium">
        <span>Total</span>
        <span className={cn('font-mono', isOverAllocated && 'text-rose-500')}>
          {totalPercent}%
        </span>
      </div>
    </div>
  );

  return (
    <td className="p-1 min-w-[120px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'h-12 flex rounded-lg overflow-hidden cursor-default',
            isOverAllocated && 'ring-2 ring-rose-400'
          )}>
            {renderSegments()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
