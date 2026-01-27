/**
 * Workstream Select - Per V4 Spec
 * Dropdown with color indicators - fetches from database
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Workstream {
  id: string;
  name: string;
  color: string;
}

interface WorkstreamSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function WorkstreamSelect({ value, onChange, error, className }: WorkstreamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch workstreams from database
  const { data: workstreams = [], isLoading } = useQuery({
    queryKey: ['planner-workstreams-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_workstreams')
        .select('id, name, color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Workstream[];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const selected = workstreams.find(w => w.id === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (workstream: Workstream) => {
    onChange(workstream.id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Workstream <span className="text-red-500">*</span>
      </label>
      
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "w-full h-[42px] flex items-center gap-2 px-3",
          "text-sm bg-white dark:bg-slate-900 border rounded-lg",
          "cursor-pointer transition-all",
          isLoading && "opacity-50 cursor-wait",
          isOpen
            ? "border-blue-600 ring-2 ring-blue-600/10"
            : error
              ? "border-red-500"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={!!error}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span className="text-slate-400 flex-1 text-left">Loading...</span>
          </>
        ) : selected ? (
          <>
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: selected.color }}
            />
            <span className="text-slate-900 dark:text-slate-100 flex-1 text-left">{selected.name}</span>
          </>
        ) : (
          <span className="text-slate-400 flex-1 text-left">Select workstream...</span>
        )}
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {error && (
        <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 right-0 mt-1 z-[1000]",
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg",
            "shadow-lg shadow-black/10 dark:shadow-black/30",
            "overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          )}
          role="listbox"
        >
          <div className="p-1.5 max-h-[280px] overflow-y-auto">
            {workstreams.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                No workstreams available
              </div>
            ) : (
              workstreams.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleSelect(ws)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md",
                    "text-left transition-colors",
                    ws.id === value
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                  role="option"
                  aria-selected={ws.id === value}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: ws.color }}
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1">
                    {ws.name}
                  </span>
                  {ws.id === value && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
