/**
 * Traceability Tab Component
 * Shows hierarchy (Feature → Story → TC) and acceptance criteria coverage
 */

import React from 'react';
import {
  Layers,
  FileText,
  CheckCircle2,
  Link2,
  Bug,
  Clock,
  AlertTriangle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TraceableItem {
  id: string;
  key: string;
  title: string;
  type: 'feature' | 'story' | 'test_case';
  status?: string;
  isCurrent?: boolean;
}

interface CoverageItem {
  id: string;
  label: string;
  text: string;
  isCovered: boolean;
}

interface LinkedItem {
  id: string;
  key: string;
  title: string;
  type: 'defect' | 'cycle' | 'test_case' | 'requirement';
  status?: string;
  meta?: string;
}

interface TraceabilityTabProps {
  hierarchy?: TraceableItem[];
  coverage?: CoverageItem[];
  linkedItems?: LinkedItem[];
  onLinkItem?: () => void;
  onViewItem?: (item: LinkedItem) => void;
}

const HIERARCHY_COLORS: Record<string, { dot: string; icon: string; key: string; bg: string }> = {
  feature: {
    dot: 'bg-purple-500',
    icon: 'bg-purple-100 text-purple-600',
    key: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
  story: {
    dot: 'bg-primary',
    icon: 'bg-primary/10 text-primary',
    key: 'text-primary',
    bg: 'bg-primary/5 border-primary/20',
  },
  test_case: {
    dot: 'bg-success',
    icon: 'bg-success/10 text-success',
    key: 'text-success',
    bg: 'bg-success/5 border-success/20',
  },
};

const LINK_COLORS: Record<string, { icon: string; key: string }> = {
  defect: { icon: 'bg-destructive/10 text-destructive', key: 'text-destructive' },
  cycle: { icon: 'bg-warning/10 text-warning', key: 'text-warning' },
  test_case: { icon: 'bg-success/10 text-success', key: 'text-success' },
  requirement: { icon: 'bg-primary/10 text-primary', key: 'text-primary' },
};

function getIcon(type: string) {
  switch (type) {
    case 'feature':
      return <Layers className="h-4 w-4" />;
    case 'story':
      return <FileText className="h-4 w-4" />;
    case 'test_case':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'defect':
      return <Bug className="h-4 w-4" />;
    case 'cycle':
      return <Clock className="h-4 w-4" />;
    case 'requirement':
      return <FileText className="h-4 w-4" />;
    default:
      return <Link2 className="h-4 w-4" />;
  }
}

export function TraceabilityTab({
  hierarchy = [],
  coverage = [],
  linkedItems = [],
  onLinkItem,
  onViewItem,
}: TraceabilityTabProps) {
  return (
    <div className="space-y-5">
      {/* Hierarchy Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Trace Hierarchy
          </h3>
        </div>
        
        {hierarchy.length > 0 ? (
          <div className="relative pl-3.5">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-4 bottom-4 w-0.5 bg-border" />
            
            <div className="space-y-2.5">
              {hierarchy.map((item) => {
                const colors = HIERARCHY_COLORS[item.type] || HIERARCHY_COLORS.test_case;
                
                return (
                  <div key={item.id} className="relative">
                    {/* Horizontal connector */}
                    <div className="absolute left-[-10px] top-3.5 w-2 h-0.5 bg-border" />
                    
                    {/* Dot */}
                    <div className={cn(
                      'absolute left-[-14px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm',
                      colors.dot
                    )} />
                    
                    {/* Card */}
                    <div
                      className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150',
                        'hover:bg-background hover:shadow-sm',
                        item.isCurrent ? colors.bg : 'bg-muted/50 border-border'
                      )}
                    >
                      <div className={cn('flex items-center justify-center w-7 h-7 rounded-md shrink-0', colors.icon)}>
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn('text-[11px] font-bold font-mono', colors.key)}>
                            {item.key}
                          </span>
                          {item.status && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              {item.status}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate">
                          {item.title}
                        </div>
                        {item.isCurrent && (
                          <div className="text-[10px] font-medium text-success mt-1">
                            ← Current test case
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border">
            No hierarchy defined
          </div>
        )}
      </div>

      {/* AC Coverage Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            AC Coverage
          </h3>
          {coverage.some(c => !c.isCovered) && (
            <span className="text-[10px] font-medium text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {coverage.filter(c => !c.isCovered).length} missing
            </span>
          )}
        </div>
        
        {coverage.length > 0 ? (
          <div className="space-y-1.5">
            {coverage.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors',
                  item.isCovered ? 'bg-success/5' : 'bg-destructive/5 cursor-pointer hover:bg-destructive/10'
                )}
              >
                {item.isCovered ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className={cn(
                  'text-[10px] font-bold shrink-0',
                  item.isCovered ? 'text-success' : 'text-destructive'
                )}>
                  {item.label}
                </span>
                <span className="flex-1 text-[11px] text-muted-foreground truncate">
                  {item.text}
                </span>
                {!item.isCovered && (
                  <span className="text-[10px] font-medium text-primary shrink-0">
                    + Add step
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border">
            No acceptance criteria linked
          </div>
        )}
      </div>

      {/* Linked Items Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Linked Items
          </h3>
          <button
            onClick={onLinkItem}
            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            + Link
          </button>
        </div>
        
        {linkedItems.length > 0 ? (
          <div className="space-y-2">
            {linkedItems.map((item) => {
              const colors = LINK_COLORS[item.type] || LINK_COLORS.requirement;
              
              return (
                <div
                  key={item.id}
                  onClick={() => onViewItem?.(item)}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg',
                    'bg-muted/50 border border-border',
                    'cursor-pointer transition-all duration-150',
                    'hover:bg-background hover:border-primary/20 hover:shadow-sm'
                  )}
                >
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-md shrink-0', colors.icon)}>
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[11px] font-bold font-mono', colors.key)}>
                        {item.key}
                      </span>
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        item.type === 'defect' ? 'bg-destructive' : 
                        item.type === 'cycle' ? 'bg-warning' : 'bg-success'
                      )} />
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.title}
                    </div>
                    {item.meta && (
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {item.meta}
                      </div>
                    )}
                  </div>
                  {item.status && (
                    <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">
                      {item.status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <button
            onClick={onLinkItem}
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3',
              'bg-muted/30 border border-dashed border-border rounded-lg',
              'text-xs text-muted-foreground',
              'hover:border-primary/30 hover:text-primary hover:bg-primary/5',
              'transition-colors cursor-pointer'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Link to defect, story, or test case
          </button>
        )}
      </div>
    </div>
  );
}
