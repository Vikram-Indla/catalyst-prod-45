// ============================================================
// HISTORY SLIDE-OVER COMPONENT
// Right-side panel showing generation history
// ============================================================

import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, subDays } from 'date-fns';
import { type Generation } from '@/stores/requirementAssistStore';

interface HistorySlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (generation: Generation) => void;
  generations: Generation[];
  loading?: boolean;
}

function StatusBadge({ status, publishedCount, totalCount }: { 
  status: string; 
  publishedCount?: number; 
  totalCount?: number;
}) {
  if (status === 'published' || (publishedCount && publishedCount === totalCount)) {
    return (
      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
        Published
      </span>
    );
  }

  if (publishedCount && publishedCount > 0 && totalCount && publishedCount < totalCount) {
    return (
      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
        {publishedCount}/{totalCount}
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
      Draft
    </span>
  );
}

function groupByDate(generations: Generation[]): Record<string, Generation[]> {
  const groups: Record<string, Generation[]> = {};
  
  generations.forEach(gen => {
    const date = new Date(gen.createdAt);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else if (isThisWeek(date)) {
      key = 'This Week';
    } else {
      key = format(date, 'MMMM yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(gen);
  });
  
  return groups;
}

export function HistorySlideOver({ isOpen, onClose, onSelect, generations, loading }: HistorySlideOverProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGenerations = useMemo(() => {
    if (!searchQuery.trim()) return generations;
    const query = searchQuery.toLowerCase();
    return generations.filter(gen => 
      gen.displayId?.toLowerCase().includes(query) ||
      gen.inputText?.toLowerCase().includes(query) ||
      gen.title?.toLowerCase().includes(query)
    );
  }, [generations, searchQuery]);

  const grouped = useMemo(() => groupByDate(filteredGenerations), [filteredGenerations]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Generation History</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search generations..."
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-600" />
            </div>
          ) : filteredGenerations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <span className="text-sm">No generations found</span>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([date, gens]) => (
                <div key={date} className="mb-4">
                  <div className="px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {date}
                  </div>
                  {gens.map(gen => (
                    <button
                      key={gen.id}
                      onClick={() => onSelect(gen)}
                      className="w-full px-6 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {gen.displayId}
                        </span>
                        <StatusBadge 
                          status={gen.status} 
                          publishedCount={0} 
                          totalCount={gen.totalCount} 
                        />
                      </div>
                      <p className="text-sm text-slate-500 truncate mb-2">
                        {gen.inputText?.substring(0, 50)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{gen.epicCount} Epics</span>
                        <span>•</span>
                        <span>{gen.featureCount} Features</span>
                        <span>•</span>
                        <span>{gen.storyCount} Stories</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {filteredGenerations.length} generations
          </span>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
