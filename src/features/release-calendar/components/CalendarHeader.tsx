/**
 * Calendar Header Component
 * Navigation and scale controls
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimeScale } from '../types';

interface CalendarHeaderProps {
  title: string;
  scale: TimeScale;
  onScaleChange: (scale: TimeScale) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const SCALE_OPTIONS: { value: TimeScale; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

export function CalendarHeader({
  title,
  scale,
  onScaleChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Release Calendar</h1>
          <p className="text-sm text-slate-500">Plan and visualize release timelines across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-[#2563eb] hover:bg-[#2563eb]/90">
            <Plus className="w-4 h-4 mr-2" />
            New Release
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={onPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 min-w-[200px]">{title}</h2>
          <Button variant="outline" size="sm" onClick={onToday}>
            <Calendar className="w-4 h-4 mr-1" />
            Today
          </Button>
        </div>

        {/* Scale Toggle */}
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
          {SCALE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onScaleChange(value)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                scale === value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
