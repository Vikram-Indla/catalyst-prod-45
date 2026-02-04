// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CompletedDetailModal
// Purpose: Modal showing items from a completed week
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { X, Check, Circle, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT10WeekItemsView } from '../../hooks/useTask10ListCards';
import type { T10CompletedWeekView } from '../../types/listCards';

interface T10CompletedDetailModalProps {
  week: T10CompletedWeekView;
  onClose: () => void;
}

export function T10CompletedDetailModal({ week, onClose }: T10CompletedDetailModalProps) {
  const { data: items = [], isLoading } = useT10WeekItemsView(week.week_id);

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-white">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </div>
        );
      case 'carried_forward':
        return (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500 text-white">
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
          </div>
        );
      case 'dropped':
        return (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-red-400 text-white">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-300 text-slate-300">
            <Circle className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="t10-key-badge t10-key-badge--small">{week.list_key}</span>
              <span className="text-base font-semibold text-slate-900">{week.list_name}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatDateRange(week.week_start, week.week_end)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-12 h-12 flex items-center justify-center rounded-xl text-lg font-bold",
              week.completion_rate === 100 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
            )}>
              {week.completion_rate}%
            </div>
            <div>
              <div className="text-xs text-slate-400">Completion Rate</div>
              <div className="text-sm font-semibold text-slate-900">
                {week.completed_count} of {week.total_count} done
              </div>
            </div>
          </div>
          
          {week.carried_forward_count > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-sm text-amber-600">
              <ArrowRight className="w-4 h-4" />
              {week.carried_forward_count} carried
            </div>
          )}
          
          {week.dropped_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-red-500">
              <Trash2 className="w-4 h-4" />
              {week.dropped_count} dropped
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-slate-400">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400">No items in this week</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-md flex-shrink-0",
                        item.rank <= 3 ? "bg-blue-100 text-blue-600" :
                        item.rank <= 6 ? "bg-green-100 text-green-600" :
                        item.rank <= 10 ? "bg-orange-100 text-orange-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {item.rank}
                      </span>
                      <span className={cn(
                        "text-sm font-medium truncate",
                        item.status === 'done' ? "text-slate-900" : 
                        item.status === 'dropped' ? "text-slate-400 line-through" :
                        "text-slate-600"
                      )}>
                        {item.title}
                      </span>
                    </div>
                    {item.description && (
                      <div className="text-xs text-slate-400 mt-1 ml-8 line-clamp-2">
                        {item.description}
                      </div>
                    )}
                    {item.taskhub_key && (
                      <div className="mt-1 ml-8">
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-600 bg-blue-50 rounded">
                          {item.taskhub_key}
                        </span>
                      </div>
                    )}
                  </div>
                  {item.completed_at && (
                    <div className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(item.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
