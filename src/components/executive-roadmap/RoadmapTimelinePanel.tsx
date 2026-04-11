// RoadmapTimelinePanel.tsx — Scrollable timeline panel with bars and milestones

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Check } from 'lucide-react';
import { BusinessRequestRoadmapItem } from '@/types/roadmapTypes';
import { STAGE_NAMES, STAGE_NAMES_AR } from '@/types/roadmapTypes';
import { MONTH_NAMES, MONTH_NAMES_AR, ROW_HEIGHT, HEADER_HEIGHT, STATUS_BAR_GRADIENTS } from './roadmapConstants';
import { formatDisplayKey } from './roadmapTimeUtils';

interface TimelineColumn {
  label: string;
  subLabel?: string;
  date: Date;
}

interface BarPosition {
  left: string;
  width: string;
  continuesLeft: boolean;
  continuesRight: boolean;
  originalStart: Date;
  originalEnd: Date;
}

interface RoadmapTimelinePanelProps {
  timelineScrollRef: React.RefObject<HTMLDivElement>;
  filteredItems: BusinessRequestRoadmapItem[];
  timelineColumns: TimelineColumn[];
  getColumnMinWidth: () => number;
  getBarPosition: (item: BusinessRequestRoadmapItem) => BarPosition | null;
  getMilestonePosition: (milestoneDate: string, startDate: string, endDate: string) => number;
  todayPosition: number | null;
  visibleRange: { start: Date; end: Date };
  selectedRow: string | null;
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
  setSelectedRequestId: (id: string | null) => void;
  showMilestones: boolean;
  isRTL: boolean;
}

export function RoadmapTimelinePanel({
  timelineScrollRef,
  filteredItems,
  timelineColumns,
  getColumnMinWidth,
  getBarPosition,
  getMilestonePosition,
  todayPosition,
  visibleRange,
  selectedRow,
  hoveredItem,
  setHoveredItem,
  setSelectedRequestId,
  showMilestones,
  isRTL,
}: RoadmapTimelinePanelProps) {
  return (
    <div ref={timelineScrollRef} className="flex-1 overflow-x-auto overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
      <div style={{ minWidth: Math.max(600, timelineColumns.length * getColumnMinWidth()) }}>
        {/* Timeline Header */}
        <div
          className="sticky top-0 z-30 border-b"
          style={{
            backgroundColor: 'white',
            borderColor: 'hsl(var(--roadmap-sandstone))',
            height: `${HEADER_HEIGHT}px`,
            minHeight: `${HEADER_HEIGHT}px`
          }}
        >
          {/* Today indicator in header */}
          {todayPosition !== null && (
            <div className="absolute pointer-events-none z-20" style={{ left: `${todayPosition}%`, top: '6px', transform: 'translateX(-50%)' }}>
              <div className="px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap" style={{ backgroundColor: 'rgba(184,148,79,0.2)', color: 'hsl(var(--roadmap-status-new))', border: '1px solid rgba(184,148,79,0.4)' }}>
                {isRTL ? 'اليوم' : 'Today'}
              </div>
            </div>
          )}
          <div className="flex h-full">
            {timelineColumns.map((col, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 px-2 text-center flex flex-col justify-center",
                  i < timelineColumns.length - 1 && "border-r"
                )}
                style={{ borderColor: 'hsl(var(--roadmap-driftwood))', minWidth: getColumnMinWidth(), backgroundColor: 'white' }}
              >
                <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>{col.label}</div>
                {col.subLabel && <div className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--roadmap-fossil))' }}>{col.subLabel}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Rows */}
        {filteredItems.map((item) => {
          const barPos = getBarPosition(item);
          const isSelected = selectedRow === item.id;

          return (
            <div
              key={item.id}
              className="relative border-b shrink-0"
              style={{
                height: `${ROW_HEIGHT}px`,
                minHeight: `${ROW_HEIGHT}px`,
                borderColor: 'hsl(var(--roadmap-sandstone))',
                backgroundColor: isSelected ? 'hsla(var(--roadmap-status-new) / 0.08)' : hoveredItem === item.id ? 'hsla(var(--roadmap-status-new) / 0.04)' : 'white'
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Vertical grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {timelineColumns.map((_, i) => (
                  <div
                    key={i}
                    className={cn("flex-1", i < timelineColumns.length - 1 && "border-r")}
                    style={{ borderColor: 'hsl(var(--roadmap-sandstone) / 0.4)', minWidth: getColumnMinWidth() }}
                  />
                ))}
              </div>

              {/* Today line */}
              {todayPosition !== null && (
                <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${todayPosition}%`, width: '1px', borderLeft: '1px dashed rgba(184,148,79,0.6)', zIndex: 5 }} />
              )}

              {/* Timeline Bar */}
              {barPos && (() => {
                const formatShortDate = (date: Date) => {
                  const day = date.getDate();
                  const monthShort = isRTL
                    ? MONTH_NAMES_AR[date.getMonth()].slice(0, 3)
                    : MONTH_NAMES[date.getMonth()];
                  return `${day} ${monthShort}`;
                };

                const startDate = new Date(item.startDate);
                const endDate = new Date(item.endDate);
                const displayStartDate = barPos.continuesLeft ? visibleRange.start : startDate;
                const displayEndDate = barPos.continuesRight ? visibleRange.end : endDate;

                const barWidthPercent = parseFloat(barPos.width);
                const isNarrowBar = barWidthPercent < 15;
                const isVeryNarrowBar = barWidthPercent < 8;

                return (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute flex flex-col cursor-pointer"
                          style={{
                            left: barPos.left,
                            width: barPos.width,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedRequestId(item.id); }}
                        >
                          {/* Labels Row */}
                          <div
                            className={cn(
                              "mb-1 px-1 relative",
                              isVeryNarrowBar ? "flex justify-center" : "flex justify-between items-center"
                            )}
                            style={{ zIndex: 20 }}
                          >
                            {isVeryNarrowBar ? (
                              <span
                                className="text-[9px] font-bold whitespace-nowrap"
                                style={{ color: 'hsl(var(--roadmap-charcoal))' }}
                              >
                                {formatShortDate(displayStartDate)}
                              </span>
                            ) : isNarrowBar ? (
                              <>
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: 'hsl(var(--roadmap-charcoal))' }}
                                >
                                  {formatShortDate(displayStartDate)}
                                </span>
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: 'hsl(var(--roadmap-charcoal))' }}
                                >
                                  {formatShortDate(displayEndDate)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: 'hsl(var(--roadmap-charcoal))' }}
                                >
                                  {formatShortDate(displayStartDate)}
                                </span>
                                <span
                                  className="text-[10px] font-semibold whitespace-nowrap truncate px-2 max-w-[60px]"
                                  style={{ color: 'hsl(var(--roadmap-charcoal))' }}
                                >
                                  {isRTL ? STAGE_NAMES_AR[item.status] : STAGE_NAMES[item.status]}
                                </span>
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: 'hsl(var(--roadmap-charcoal))' }}
                                >
                                  {formatShortDate(displayEndDate)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* The Bar */}
                          <div
                            className={cn(
                              "h-5 w-full overflow-hidden transition-all hover:shadow-md",
                              barPos.continuesLeft ? "rounded-l-none" : "rounded-l-full",
                              barPos.continuesRight ? "rounded-r-none" : "rounded-r-full"
                            )}
                            style={{ background: STATUS_BAR_GRADIENTS[item.status] || 'linear-gradient(90deg, var(--cp-blue), color-mix(in srgb, var(--cp-blue) 70%, transparent))', position: 'relative', zIndex: 5 }}
                          >
                            {/* Milestones */}
                            {showMilestones && item.milestones.length > 0 && item.milestones.map((ms, index) => {
                              const pos = getMilestonePosition(ms.date, item.startDate, item.endDate);
                              const msDate = new Date(ms.date);
                              if (msDate < displayStartDate || msDate > displayEndDate) return null;

                              return (
                                <div
                                  key={`${item.id}-ms-${index}`}
                                  className="absolute w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold shadow-sm"
                                  style={{
                                    left: `${pos}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : 'white',
                                    borderColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : ms.state === 'current' ? 'hsl(var(--roadmap-milestone-current))' : 'hsl(var(--roadmap-milestone-pending))',
                                    color: ms.state === 'complete' ? 'white' : ms.state === 'current' ? 'hsl(var(--roadmap-milestone-current))' : 'hsl(var(--roadmap-fossil))',
                                    zIndex: 15
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {ms.state === 'complete' ? <Check className="w-2.5 h-2.5" /> : (index + 1)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="center"
                        sideOffset={12}
                        className="max-w-[380px] px-4 py-3.5 rounded-lg shadow-2xl z-[9999] animate-in fade-in-0 zoom-in-95"
                        style={{
                          backgroundColor: '#373432',
                          color: 'white',
                          border: 'none',
                          boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.4)'
                        }}
                      >
                        {/* Header - ID */}
                        <div
                          className="text-xs font-medium mb-1.5"
                          style={{ color: '#B5A48A' }}
                        >
                          {formatDisplayKey(item)}
                        </div>

                        {/* Title/Summary */}
                        <div
                          className="font-medium text-sm mb-3 leading-snug"
                          style={{ color: 'white' }}
                        >
                          {isRTL ? item.titleAr : item.titleEn}
                        </div>

                        {/* Status Row */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="text-[10px] font-medium uppercase tracking-wide"
                            style={{ color: '#A89778' }}
                          >
                            STATUS:
                          </span>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'rgba(166,144,94,0.3)',
                              color: '#DED6CA'
                            }}
                          >
                            {isRTL ? STAGE_NAMES_AR[item.status] : STAGE_NAMES[item.status]}
                          </span>
                        </div>

                        {/* Date Range */}
                        <div
                          className="flex items-center gap-2 py-2 px-3 rounded-md mb-3"
                          style={{ backgroundColor: 'rgba(166,144,94,0.15)' }}
                        >
                          <Calendar className="w-3.5 h-3.5" style={{ color: '#A89778' }} />
                          <span className="text-xs" style={{ color: '#D4CABC' }}>
                            {startDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span style={{ color: '#A6905E' }}>&rarr;</span>
                          <span className="text-xs" style={{ color: '#D4CABC' }}>
                            {endDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Milestones Section */}
                        {showMilestones && item.milestones.length > 0 && (
                          <div>
                            <div
                              className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                              style={{ color: '#A89778' }}
                            >
                              MILESTONES ({item.milestones.length})
                            </div>
                            <div className="space-y-1.5">
                              {item.milestones.slice(0, 5).map((ms, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <div
                                    className="w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0"
                                    style={{
                                      backgroundColor: ms.state === 'complete' ? 'hsl(var(--roadmap-milestone-complete))' : 'transparent',
                                      borderColor: ms.state === 'complete'
                                        ? 'hsl(var(--roadmap-milestone-complete))'
                                        : ms.state === 'current'
                                          ? 'hsl(var(--roadmap-milestone-current))'
                                          : '#957F51',
                                      color: ms.state === 'complete' ? 'white' : '#BFB097'
                                    }}
                                  >
                                    {ms.state === 'complete' ? <Check className="w-2 h-2" /> : (idx + 1)}
                                  </div>
                                  <span style={{ color: '#D4CABC' }}>
                                    {new Date(ms.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                                    style={{
                                      backgroundColor: ms.state === 'complete'
                                        ? 'rgba(59,163,98,0.25)'
                                        : ms.state === 'current'
                                          ? 'rgba(191,149,64,0.25)'
                                          : 'rgba(166,144,94,0.2)',
                                      color: ms.state === 'complete'
                                        ? '#6BC98F'
                                        : ms.state === 'current'
                                          ? '#CCB27A'
                                          : '#B5A48A'
                                    }}
                                  >
                                    {ms.state === 'complete' ? 'Complete' : ms.state === 'current' ? 'Current' : 'Pending'}
                                  </span>
                                </div>
                              ))}
                              {item.milestones.length > 5 && (
                                <div className="text-[10px] italic" style={{ color: '#A6905E' }}>
                                  +{item.milestones.length - 5} more milestones
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
