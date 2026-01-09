/**
 * Quality Checklist - Matches design exactly
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

interface QualityChecklistProps {
  items: ChecklistItem[];
  onFix?: (itemId: string) => void;
}

export function QualityChecklist({ items, onFix }: QualityChecklistProps) {
  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const incompleteRequired = items.filter((i) => i.required && !i.completed).length;

  return (
    <div
      className="rounded-lg border bg-white"
      style={{ borderColor: '#e5e5e5' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-neutral-900" style={{ fontSize: '14px' }}>
            Quality Checklist
          </h3>
          <Badge
            className={cn(
              'px-2 py-0.5 text-xs font-semibold rounded',
              percentage === 100
                ? 'bg-[#059669] text-white'
                : percentage >= 50
                ? 'bg-[#d97706] text-white'
                : 'bg-[#dc2626] text-white'
            )}
          >
            {percentage}%
          </Badge>
        </div>

        {/* Subtitle */}
        {incompleteRequired > 0 && (
          <p className="text-[#d97706] text-sm mb-4">
            {incompleteRequired} required item(s) incomplete - cannot mark as Ready
          </p>
        )}

        {/* Checklist Items */}
        <div className="space-y-0">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between py-2.5 px-3 -mx-3 rounded',
                !item.completed && item.required && 'bg-[#fef2f2]'
              )}
            >
              <div className="flex items-center gap-2.5">
                {item.completed ? (
                  <div className="w-5 h-5 rounded-full bg-[#059669] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : item.required ? (
                  <XCircle className="w-5 h-5 text-[#dc2626]" />
                ) : (
                  <Clock className="w-5 h-5 text-[#d97706]" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    item.completed ? 'text-neutral-500' : 'text-neutral-900'
                  )}
                >
                  {item.label}
                  {item.required && !item.completed && (
                    <span className="text-[#dc2626] ml-0.5">*</span>
                  )}
                </span>
              </div>
              {!item.completed && (
                <button
                  onClick={() => onFix?.(item.id)}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Quality Score */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: '#e5e5e5' }}>
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
            <span>Quality Score</span>
            <span>{completedCount}/{totalCount}</span>
          </div>
          <Progress value={percentage} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}

export default QualityChecklist;
