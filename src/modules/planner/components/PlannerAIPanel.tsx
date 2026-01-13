// ============================================================
// PLANNER AI PANEL
// Slide-in panel showing AI insights
// ============================================================

import { useEffect } from 'react';
import { X, Lightbulb, AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AIInsight } from '../types';
import { Button } from '@/components/ui/button';

interface PlannerAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  insights: AIInsight[];
  onViewAll: () => void;
  onInsightAction?: (insight: AIInsight) => void;
}

const INSIGHT_STYLES: Record<AIInsight['type'], {
  bg: string;
  border: string;
  icon: typeof AlertCircle;
  iconColor: string;
}> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
};

export function PlannerAIPanel({
  isOpen,
  onClose,
  insights,
  onViewAll,
  onInsightAction,
}: PlannerAIPanelProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const criticalCount = insights.filter(i => i.type === 'critical').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 bottom-0 w-[360px] max-w-full bg-surface-0 shadow-2xl z-30 flex flex-col border-l border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Lightbulb className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-text-primary">AI Insights</span>
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                  {criticalCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted transition-colors"
              title="Close panel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Insights List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {insights.slice(0, 4).map((insight) => {
              const style = INSIGHT_STYLES[insight.type];
              const Icon = style.icon;

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "p-3 rounded-lg border",
                    style.bg,
                    style.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", style.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-text-primary mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {insight.message}
                      </p>
                      {insight.taskId && (
                        <span className="inline-block mt-2 text-[10px] font-mono text-text-muted bg-surface-0 px-1.5 py-0.5 rounded">
                          {insight.taskId}
                        </span>
                      )}
                      {insight.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsightAction?.(insight)}
                          className="mt-2 text-xs h-7"
                        >
                          {insight.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {insights.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                <Lightbulb className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No insights available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {insights.length > 0 && (
            <div className="border-t border-border p-4">
              <Button
                variant="outline"
                onClick={() => {
                  onViewAll();
                  onClose();
                }}
                className="w-full justify-between"
              >
                <span>View All Insights</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
