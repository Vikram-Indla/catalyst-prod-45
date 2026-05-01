/**
 * Calendar AI Insights Bar
 * Uses AI purple gradient (Catalyst V5 compliant)
 */

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, AlertCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarInsight, ConflictWarning, CATALYST_COLORS } from '../types';

interface CalendarAIInsightsProps {
  insights: CalendarInsight[];
  conflicts: ConflictWarning[];
  onInsightClick?: (releaseIds: string[]) => void;
}

export function CalendarAIInsights({ insights, conflicts, onInsightClick }: CalendarAIInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const allItems = [
    ...conflicts.map(c => ({ 
      type: c.severity === 'error' ? 'critical' as const : 'warning' as const, 
      message: c.message, 
      action: c.suggestion,
      releaseIds: c.releaseIds,
    })),
    ...insights.map(i => ({
      type: i.type === 'risk' || i.type === 'overdue' ? 'warning' as const : 'info' as const,
      message: i.message,
      action: i.action,
      releaseIds: i.releaseIds,
    })),
  ];

  if (allItems.length === 0) return null;

  const displayedItems = isExpanded ? allItems : allItems.slice(0, 2);
  const criticalCount = allItems.filter(i => i.type === 'critical').length;
  const warningCount = allItems.filter(i => i.type === 'warning').length;

  const getIcon = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-[var(--ds-text-danger, #ef4444)]" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[var(--ds-text-warning, #d97706)]" />;
      case 'info': return <Clock className="w-4 h-4 text-[var(--ds-text-brand, #2563eb)]" />;
    }
  };

  const getBgColor = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical': return 'bg-[#fee2e2] border-[#fecaca]';
      case 'warning': return 'bg-[#fef3c7] border-[#fde68a]';
      case 'info': return 'bg-[var(--ds-background-selected, #eff6ff)] border-[#bfdbfe]';
    }
  };

  return (
    <div 
      className="border rounded-xl p-4 mb-4"
      style={{
        background: `linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)`,
        borderColor: 'rgba(139, 92, 246, 0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg"
            style={{ background: `linear-gradient(135deg, ${CATALYST_COLORS.aiPurpleStart}, ${CATALYST_COLORS.aiPurpleEnd})` }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-800">AI Insights</span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-[#fee2e2] text-[#b91c1c] text-xs font-medium rounded-full">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 bg-[#fef3c7] text-[#92400e] text-xs font-medium rounded-full">
              {warningCount} warnings
            </span>
          )}
        </div>

        {allItems.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-600 hover:text-slate-900"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>
            ) : (
              <>Show All ({allItems.length}) <ChevronDown className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        )}
      </div>

      {/* Insights List */}
      <div className="space-y-2">
        {displayedItems.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              getBgColor(item.type)
            )}
          >
            <div className="flex items-center gap-3">
              {getIcon(item.type)}
              <span className="text-sm text-slate-700">{item.message}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInsightClick?.(item.releaseIds)}
              className="text-[var(--ds-text-brand, #2563eb)] hover:text-[var(--ds-text-brand, #2563eb)]/80 text-xs"
            >
              {item.action}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
