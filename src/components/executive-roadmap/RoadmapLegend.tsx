import React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Check } from 'lucide-react';

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
    <div className="fixed bottom-6 right-6 z-40 print:hidden">
      {/* Legend Panel */}
      <div
        className="w-72 bg-white rounded-xl shadow-lg border border-[hsl(var(--roadmap-sandstone))] overflow-hidden"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[hsl(var(--roadmap-sandstone))] bg-[hsl(var(--roadmap-parchment))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--roadmap-charcoal))]">
            {isRTL ? 'دليل الألوان' : 'Legend'}
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Status Section */}
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--roadmap-fossil))] mb-2">
              {isRTL ? 'الحالة' : 'STATUS'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_ITEMS.map((status) => (
                <div key={status.key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-xs text-[hsl(var(--roadmap-graphite))]">
                    {isRTL ? status.labelAr : status.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Section */}
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--roadmap-fossil))] mb-2">
              {isRTL ? 'الجدول الزمني' : 'TIMELINE'}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-16 h-5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C69C6D, #E8D5C0)' }}
                />
                <span className="text-xs text-[hsl(var(--roadmap-graphite))]">
                  {isRTL ? 'شريط الجدول' : 'Timeline Bar'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 flex items-center justify-center">
                  <div className="w-0.5 h-5 bg-[hsl(var(--roadmap-today))]" />
                </div>
                <span className="text-xs text-[hsl(var(--roadmap-graphite))]">
                  {isRTL ? 'خط اليوم' : 'Today Line'}
                </span>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--roadmap-fossil))] mb-2">
              {isRTL ? 'المراحل' : 'MILESTONES'}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-[18px] h-[18px] rounded-full bg-[hsl(var(--roadmap-milestone-complete))] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs text-[hsl(var(--roadmap-graphite))]">
                  {isRTL ? 'مكتمل' : 'Complete'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-[18px] h-[18px] rounded-full bg-white border-2 flex items-center justify-center text-[10px] font-medium"
                  style={{ 
                    borderColor: 'hsl(var(--roadmap-milestone-current))',
                    color: 'hsl(var(--roadmap-milestone-current))',
                    boxShadow: '0 0 8px hsla(var(--roadmap-milestone-current) / 0.4)'
                  }}
                >
                  3
                </div>
                <span className="text-xs text-[hsl(var(--roadmap-graphite))]">
                  {isRTL ? 'الحالي' : 'Current'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-[18px] h-[18px] rounded-full bg-white border-2 flex items-center justify-center text-[10px] font-medium"
                  style={{ 
                    borderColor: 'hsl(var(--roadmap-milestone-pending))',
                    color: 'hsl(var(--roadmap-fossil))'
                  }}
                >
                  5
                </div>
                <span className="text-xs text-[hsl(var(--roadmap-graphite))]">
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
