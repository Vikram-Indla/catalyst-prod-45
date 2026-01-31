/**
 * Analytics Month Cell - Strategy D: Horizontal Bar
 * White cells with thin colored progress bar at bottom
 * Microsoft Project style - clean enterprise look
 * 
 * REBUILT: Uses fully inline styles to bypass any CSS overrides
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonthCell } from './types';

interface AnalyticsMonthCellProps {
  cell: MonthCell;
  contractEndDate?: string | null;
}

// Project color mapping for horizontal bars
const PROJECT_BAR_COLORS: Record<string, string> = {
  sectorial: '#3b82f6',      // BLUE
  dataplatform: '#10b981',   // GREEN  
  senaei: '#f59e0b',         // AMBER
  tahommena: '#ec4899',      // PINK
  inspection: '#8b5cf6',     // PURPLE
  irplatform: '#06b6d4',     // CYAN
};

function getProjectSlug(name: string): keyof typeof PROJECT_BAR_COLORS {
  const lowerName = name.toLowerCase().trim();
  if (lowerName.includes('sectorial')) return 'sectorial';
  if (lowerName.includes('data platform') || lowerName.includes('dataplatform')) return 'dataplatform';
  if (lowerName.includes('senaei')) return 'senaei';
  if (lowerName.includes('tahommena')) return 'tahommena';
  if (lowerName.includes('inspection')) return 'inspection';
  if (lowerName.includes('ir platform') || lowerName.includes('irplatform') || lowerName.includes('ir-platform')) return 'irplatform';
  return 'sectorial'; // default
}

export function AnalyticsMonthCell({ cell, contractEndDate }: AnalyticsMonthCellProps) {
  const { totalPercent, isEnded, segments } = cell;

  // Check if contract ends this month
  const monthStart = new Date(cell.year, cell.month - 1, 1);
  const monthEnd = new Date(cell.year, cell.month, 0);
  const contractDate = contractEndDate ? new Date(contractEndDate) : null;
  const contractEndsThisMonth = contractDate && contractDate >= monthStart && contractDate <= monthEnd;

  // Shared cell styles
  const cellStyle: React.CSSProperties = {
    padding: '4px',
    minWidth: '120px',
    maxWidth: '120px',
    width: '120px',
  };

  // Contract ended (past end date) - show diagonal striped END cell
  if (isEnded) {
    return (
      <td style={cellStyle} data-status="end">
        <div 
          style={{
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundImage: 'repeating-linear-gradient(-45deg, #f8fafc, #f8fafc 4px, #f1f5f9 4px, #f1f5f9 8px)',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: '4px', letterSpacing: '0.5px' }}>END</span>
        </div>
      </td>
    );
  }

  // Contract ends this month - show dotted fill with END label
  if (contractEndsThisMonth && (segments.length === 0 || totalPercent === 0)) {
    return (
      <td style={cellStyle} data-status="end">
        <div 
          style={{
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            backgroundImage: 'repeating-linear-gradient(-45deg, #f8fafc, #f8fafc 4px, #f1f5f9 4px, #f1f5f9 8px)',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: '4px', letterSpacing: '0.5px' }}>END</span>
        </div>
      </td>
    );
  }

  // Empty/no allocation - show as Available (white cell, no bar)
  if (segments.length === 0 || totalPercent === 0) {
    return (
      <td style={cellStyle}>
        <div style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>Available</span>
        </div>
      </td>
    );
  }

  // Get primary segment (first one) for color and project name
  const primarySegment = segments[0];
  const projectSlug = getProjectSlug(primarySegment.assignment.name);
  const barColor = PROJECT_BAR_COLORS[projectSlug] || '#3b82f6';
  const isOverAllocated = totalPercent > 100;

  // Calculate bar width as percentage (capped at 100% for display)
  const barWidth = Math.min(totalPercent, 100);

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
    <td style={cellStyle} data-project={projectSlug}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="allocation-cell"
            style={{
              position: 'relative',
              height: '56px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: '#ffffff',
              border: isOverAllocated ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              boxShadow: isOverAllocated ? '0 0 0 1px #fca5a5' : '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'default',
              transition: 'all 150ms ease, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Text content - dark on white - POLISH: Larger percent text */}
            <span className="alloc-percent" style={{
              fontSize: '14px',
              fontWeight: 700,
              color: isOverAllocated ? '#dc2626' : '#1e293b',
              letterSpacing: '-0.01em',
              zIndex: 10,
            }}>
              {totalPercent}%
            </span>
            {/* POLISH: Larger project text (11px) */}
            <span className="alloc-project" style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#64748b',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 4px',
              marginTop: '3px',
              zIndex: 10,
            }}>
              {primarySegment.assignment.name}
            </span>
            
            {/* Horizontal progress bar at bottom (Strategy D) - POLISH: 5px height */}
            <span
              className="allocation-bar"
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '4px',
                left: '6px',
                right: '6px',
                height: '5px',
                borderRadius: '2.5px',
                background: '#e2e8f0',
                display: 'block',
                overflow: 'hidden',
              }}
            >
              {/* Fill bar - POLISH: Gradient colors */}
              <span
                className={`alloc-bar-fill ${projectSlug}`}
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${barWidth}%`,
                  borderRadius: '2.5px',
                  background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}dd 100%)`,
                  transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
