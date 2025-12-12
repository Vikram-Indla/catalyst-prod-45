import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface RoadmapLegendProps {
  isVisible: boolean;
  onToggle: () => void;
  isRTL?: boolean;
}

const STATUS_ITEMS = [
  { key: 'NEW', label: 'New', labelAr: 'جديد', color: 'hsl(var(--roadmap-status-new))' },
  { key: 'ANALYSE', label: 'Analyse', labelAr: 'تحليل', color: 'hsl(var(--roadmap-status-analyse))' },
  { key: 'APPROVED', label: 'Approved', labelAr: 'موافق', color: 'hsl(var(--roadmap-status-approved))' },
  { key: 'IMPLEMENT', label: 'Implement', labelAr: 'تنفيذ', color: 'hsl(var(--roadmap-status-implement))' },
  { key: 'CLOSED', label: 'Closed', labelAr: 'مغلق', color: 'hsl(var(--roadmap-status-closed))' },
];

export function RoadmapLegend({ isVisible, onToggle, isRTL = false }: RoadmapLegendProps) {
  if (!isVisible) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-40 print:hidden">
      {/* Legend Panel - Matching Production Screenshot */}
      <div
        className="w-64 bg-white rounded-lg shadow-lg border overflow-hidden"
        style={{ 
          fontFamily: 'Inter, -apple-system, sans-serif',
          borderColor: 'hsl(var(--roadmap-sandstone))'
        }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 border-b"
          style={{ 
            borderColor: 'hsl(var(--roadmap-sandstone))',
            backgroundColor: 'hsl(var(--roadmap-parchment))'
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
            {isRTL ? 'دليل الألوان' : 'Legend'}
          </h3>
        </div>

        <div className="p-4 space-y-5">
          {/* Status Section */}
          <div>
            <div 
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'hsl(var(--roadmap-fossil))' }}
            >
              {isRTL ? 'الحالة' : 'STATUS'}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {STATUS_ITEMS.map((status) => (
                <div key={status.key} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-xs" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                    {isRTL ? status.labelAr : status.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Section */}
          <div>
            <div 
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'hsl(var(--roadmap-fossil))' }}
            >
              {isRTL ? 'الجدول الزمني' : 'TIMELINE'}
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-14 h-4 rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(35, 46%, 60%), hsl(35, 42%, 75%))' }}
                />
                <span className="text-xs" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {isRTL ? 'شريط الجدول' : 'Timeline Bar'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 flex items-center justify-center">
                  <div 
                    className="w-0.5 h-4 rounded-full"
                    style={{ backgroundColor: 'hsl(var(--roadmap-today))' }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {isRTL ? 'خط اليوم' : 'Today Line'}
                </span>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div>
            <div 
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'hsl(var(--roadmap-fossil))' }}
            >
              {isRTL ? 'المراحل' : 'MILESTONES'}
            </div>
            <div className="space-y-2.5">
              {/* Complete */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--roadmap-milestone-complete))' }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {isRTL ? 'مكتمل' : 'Complete'}
                </span>
              </div>
              {/* Current */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-[18px] h-[18px] rounded-full bg-white border-2 flex items-center justify-center text-[9px] font-bold"
                  style={{ 
                    borderColor: 'hsl(var(--roadmap-milestone-current))',
                    color: 'hsl(var(--roadmap-milestone-current))'
                  }}
                >
                  3
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {isRTL ? 'الحالي' : 'Current'}
                </span>
              </div>
              {/* Pending */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-[18px] h-[18px] rounded-full bg-white border-2 flex items-center justify-center text-[9px] font-medium"
                  style={{ 
                    borderColor: 'hsl(var(--roadmap-milestone-pending))',
                    color: 'hsl(var(--roadmap-fossil))'
                  }}
                >
                  5
                </div>
                <span className="text-xs" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                  {isRTL ? 'قيد الانتظار' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}