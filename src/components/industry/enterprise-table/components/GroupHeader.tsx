// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — GROUP HEADER ROW
// Collapsible group header with aggregates
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalystColumn } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GroupHeaderProps<T> {
  groupKey: string;
  groupValue: string;
  rowCount: number;
  isExpanded: boolean;
  aggregates: Record<string, any>;
  columns: CatalystColumn<T>[];
  columnWidths: Record<string, number>;
  depth?: number;
  onToggle: () => void;
  renderCustomHeader?: (groupValue: string, rowCount: number) => React.ReactNode;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GroupHeader<T>({
  groupKey,
  groupValue,
  rowCount,
  isExpanded,
  aggregates,
  columns,
  columnWidths,
  depth = 0,
  onToggle,
  renderCustomHeader,
  className,
}: GroupHeaderProps<T>) {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  // Format aggregate value
  const formatAggregate = (value: any, columnId: string): string => {
    if (value === null || value === undefined) return '—';
    
    if (typeof value === 'number') {
      // Check if it's a currency-like column
      if (columnId.toLowerCase().includes('cost') || 
          columnId.toLowerCase().includes('price') ||
          columnId.toLowerCase().includes('amount')) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      }
      
      // Check if it's a percentage
      if (columnId.toLowerCase().includes('percent') || 
          columnId.toLowerCase().includes('rate')) {
        return `${value.toFixed(1)}%`;
      }
      
      // Default number formatting
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(value);
    }
    
    return String(value);
  };

  // Calculate total width of all visible columns
  const totalWidth = columns.reduce((sum, col) => {
    return sum + (columnWidths[col.id] || 150);
  }, 0);

  return (
    <tr
      className={cn(
        'bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer',
        'border-b border-border',
        className
      )}
      onClick={onToggle}
      role="row"
      aria-expanded={isExpanded}
    >
      {/* Group header cell spanning all columns */}
      <td
        colSpan={columns.length}
        className="p-0"
        style={{ minWidth: totalWidth }}
      >
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          {/* Expand/collapse icon */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              'flex items-center justify-center w-5 h-5 rounded',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors'
            )}
            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
          >
            <ChevronIcon className="h-4 w-4" />
          </button>

          {/* Folder icon */}
          <FolderIcon className="h-4 w-4 text-primary shrink-0" />

          {/* Custom or default header content */}
          {renderCustomHeader ? (
            renderCustomHeader(groupValue, rowCount)
          ) : (
            <>
              {/* Group value */}
              <span className="font-medium text-foreground">
                {groupValue || '(Empty)'}
              </span>

              {/* Row count badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {rowCount} {rowCount === 1 ? 'item' : 'items'}
              </span>
            </>
          )}

          {/* Aggregate values */}
          {Object.keys(aggregates).length > 0 && (
            <div className="flex items-center gap-4 ml-auto text-sm text-muted-foreground">
              {Object.entries(aggregates).map(([columnId, value]) => {
                const column = columns.find(c => c.id === columnId);
                const label = typeof column?.header === 'string' 
                  ? column.header 
                  : columnId;
                
                return (
                  <span key={columnId} className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wide opacity-70">
                      {label}:
                    </span>
                    <span className="font-medium text-foreground">
                      {formatAggregate(value, columnId)}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Compact Group Header ───────────────────────────────────────────────────

interface CompactGroupHeaderProps {
  groupValue: string;
  rowCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  depth?: number;
}

export function CompactGroupHeader({
  groupValue,
  rowCount,
  isExpanded,
  onToggle,
  depth = 0,
}: CompactGroupHeaderProps) {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 bg-muted/30 cursor-pointer',
        'hover:bg-muted/50 transition-colors text-sm'
      )}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <ChevronIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">{groupValue || '(Empty)'}</span>
      <span className="text-xs text-muted-foreground">({rowCount})</span>
    </div>
  );
}
