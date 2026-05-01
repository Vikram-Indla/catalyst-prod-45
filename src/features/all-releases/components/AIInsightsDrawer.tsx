/**
 * AI Insights Drawer — Blue theme (no purple)
 */

import { useEffect, useCallback } from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AIReleaseInsight } from '../types';

interface AIInsightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  insights: AIReleaseInsight[];
  onActionClick?: (insight: AIReleaseInsight) => void;
}

function InsightItem({ insight, onActionClick }: { insight: AIReleaseInsight; onActionClick?: (i: AIReleaseInsight) => void }) {
  const config = {
    critical: {
      icon: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
      bg: 'bg-red-50 border-red-200',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #64748B))] flex-shrink-0" />,
      bg: 'bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F1F5F9))] border-[rgba(15,23,42,0.12)]',
    },
    positive: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
      bg: 'bg-emerald-50 border-emerald-200',
    },
  }[insight.type];

  return (
    <div className={cn("p-3 rounded-lg border", config.bg)}>
      <div className="flex items-start gap-2.5">
        {config.icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700">{insight.message}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{insight.releaseName}</p>
        </div>
      </div>
      <button
        onClick={() => onActionClick?.(insight)}
        className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))] hover:text-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1D4ED8))] transition-colors"
      >
        {insight.action}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export function AIInsightsDrawer({ isOpen, onClose, insights, onActionClick }: AIInsightsDrawerProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const criticalCount = insights.filter(i => i.type === 'critical').length;
  const warningCount = insights.filter(i => i.type === 'warning').length;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-50 transition-opacity" onClick={onClose} />
      )}
      
      <div
        role="dialog"
        aria-label="AI Insights Panel"
        aria-modal="true"
        className={cn(
          "fixed right-0 w-[400px] bg-white border-l border-slate-200 z-[500]",
          "shadow-2xl transition-transform duration-250 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ top: 'var(--app-top-offset, 56px)', height: 'calc(100dvh - var(--app-top-offset, 56px))' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: '#DBEAFE' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }} />
            </div>
            <h2 className="font-semibold text-sm text-slate-900">AI Insights</h2>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: '#DBEAFE', color: 'var(--ds-text-inverse, #FFFFFF)' }}>
                {warningCount} warnings
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3" style={{ height: 'calc(100% - 57px)' }}>
          {insights.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">All Clear</p>
              <p className="text-xs text-slate-500 mt-1">No insights at this time.</p>
            </div>
          ) : (
            insights.map((insight, idx) => (
              <InsightItem key={`${insight.releaseId}-${idx}`} insight={insight} onActionClick={onActionClick} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
