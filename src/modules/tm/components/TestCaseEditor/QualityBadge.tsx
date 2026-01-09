/**
 * Quality Badge - Compact quality indicator with popover
 * Replaces inline checklist to save vertical space
 */

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

interface QualityBadgeProps {
  items: ChecklistItem[];
  onFix?: (itemId: string) => void;
}

export function QualityBadge({ items, onFix }: QualityBadgeProps) {
  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const incompleteRequired = items.filter((i) => i.required && !i.completed);
  const hasBlocker = incompleteRequired.length > 0;

  const getBadgeStyle = () => {
    if (percentage === 100) return 'bg-[#d1fae5] text-[#059669] border-[#059669]';
    if (hasBlocker) return 'bg-[#fee2e2] text-[#dc2626] border-[#dc2626]';
    if (percentage >= 50) return 'bg-[#fef3c7] text-[#d97706] border-[#d97706]';
    return 'bg-[#f5f5f5] text-[#737373] border-[#e5e5e5]';
  };

  const getIcon = () => {
    if (percentage === 100) return <CheckCircle2 className="h-3.5 w-3.5" />;
    if (hasBlocker) return <XCircle className="h-3.5 w-3.5" />;
    return <AlertCircle className="h-3.5 w-3.5" />;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="focus:outline-none focus:ring-2 focus:ring-brand-primary-light rounded">
          <Badge
            className={cn(
              'px-2 py-1 font-medium rounded cursor-pointer hover:opacity-90 transition-all flex items-center gap-1.5 border',
              getBadgeStyle()
            )}
            style={{ fontSize: '11px' }}
          >
            {getIcon()}
            Quality {percentage}%
            {hasBlocker && (
              <span className="ml-1 px-1 py-0 rounded bg-white/30 text-[10px]">
                {incompleteRequired.length} blocker{incompleteRequired.length > 1 ? 's' : ''}
              </span>
            )}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0"
        style={{ boxShadow: '0 8px 24px hsl(0 0% 0% / 0.12)' }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-[var(--text-1)]" style={{ fontSize: '14px' }}>
              Quality Checklist
            </h4>
            <Badge
              className={cn(
                'px-2 py-0.5 font-semibold rounded',
                percentage === 100
                  ? 'bg-[#059669] text-white'
                  : percentage >= 50
                  ? 'bg-[#d97706] text-white'
                  : 'bg-[#dc2626] text-white'
              )}
              style={{ fontSize: '11px' }}
            >
              {completedCount}/{totalCount}
            </Badge>
          </div>

          {/* Progress bar */}
          <Progress value={percentage} className="h-1.5 mb-4" />

          {/* Blocker warning */}
          {hasBlocker && (
            <div className="mb-3 p-2 rounded bg-[#fee2e2] text-[#dc2626] text-xs">
              {incompleteRequired.length} required item(s) must be completed before marking as Ready
            </div>
          )}

          {/* Checklist items */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between py-2 px-2 rounded text-sm',
                  !item.completed && item.required && 'bg-[#fee2e2]/50'
                )}
              >
                <div className="flex items-center gap-2">
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
                  ) : item.required ? (
                    <XCircle className="h-4 w-4 text-[#dc2626] shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-[#d97706] shrink-0" />
                  )}
                  <span className={cn(
                    item.completed ? 'text-[var(--text-3)]' : 'text-[var(--text-1)]'
                  )}>
                    {item.label}
                    {item.required && !item.completed && (
                      <span className="text-[#dc2626] ml-0.5">*</span>
                    )}
                  </span>
                </div>
                {!item.completed && (
                  <button
                    onClick={() => onFix?.(item.id)}
                    className="text-xs text-brand-primary hover:text-brand-primary-hover font-medium transition-colors"
                  >
                    Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default QualityBadge;
