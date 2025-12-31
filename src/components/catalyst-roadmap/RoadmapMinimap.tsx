/**
 * Roadmap Minimap - Bottom-right minimap with draggable viewport
 */

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { RoadmapGroup, TimelineConfig } from '@/types/roadmap';
import { STATUS_COLORS } from '@/types/roadmap';
import { dateToPosition } from '@/lib/roadmap-utils';

interface RoadmapMinimapProps {
  groups: RoadmapGroup[];
  timelineConfig: TimelineConfig;
  todayPosition: number;
  viewport: { scrollLeft: number; scrollWidth: number; clientWidth: number };
  onViewportDrag: (scrollPercent: number) => void;
}

export function RoadmapMinimap({
  groups,
  timelineConfig,
  todayPosition,
  viewport,
  onViewportDrag,
}: RoadmapMinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; viewportLeft: number }>({ mouseX: 0, viewportLeft: 0 });

  // Calculate bar positions
  const bars = useMemo(() => {
    const allBars: { left: number; width: number; row: number; status: string }[] = [];
    let row = 0;
    
    groups.forEach((group) => {
      group.objs.forEach((obj) => {
        const left = dateToPosition(obj.start, timelineConfig);
        const right = dateToPosition(obj.end, timelineConfig);
        allBars.push({
          left,
          width: Math.max(right - left, 1),
          row,
          status: obj.status,
        });
        row++;
      });
    });
    
    return allBars;
  }, [groups, timelineConfig]);

  // Calculate viewport rectangle
  const viewportRect = useMemo(() => {
    if (viewport.scrollWidth <= 0) return { left: 0, width: 100 };
    
    const left = (viewport.scrollLeft / viewport.scrollWidth) * 100;
    const width = (viewport.clientWidth / viewport.scrollWidth) * 100;
    
    return {
      left: Math.max(0, Math.min(100 - width, left)),
      width: Math.min(100, width),
    };
  }, [viewport]);

  // Handle mouse down on viewport
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      viewportLeft: viewportRect.left,
    };
  }, [viewportRect.left]);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width - 8; // Account for padding
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const newLeft = Math.max(0, Math.min(100 - viewportRect.width, dragStartRef.current.viewportLeft + deltaPercent));
      onViewportDrag(newLeft);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, viewportRect.width, onViewportDrag]);

  // Handle click on minimap background to jump
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - 4; // Account for padding
    const containerWidth = rect.width - 8;
    const clickPercent = (clickX / containerWidth) * 100;
    
    // Center viewport on click position
    const newLeft = Math.max(0, Math.min(100 - viewportRect.width, clickPercent - viewportRect.width / 2));
    onViewportDrag(newLeft);
  }, [viewportRect.width, onViewportDrag]);

  // Scale rows to fit
  const maxRows = bars.length;
  const availableHeight = 48; // 56 - 8 padding
  const rowHeight = maxRows > 0 ? Math.min(4, availableHeight / maxRows) : 4;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "absolute bottom-4 right-4 bg-surface-0 border border-border rounded-lg shadow-lg overflow-hidden z-50 cursor-crosshair",
        // Hide on mobile (< 768px)
        "hidden md:block",
        // Tablet size (768px - 1024px): smaller
        "md:w-[120px] md:h-10",
        // Desktop (>= 1024px): full size
        "lg:w-40 lg:h-14"
      )}
      onClick={handleBackgroundClick}
    >
      {/* Bars representing objectives */}
      <div className="absolute inset-1 pointer-events-none">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${bar.left}%`,
              width: `${Math.max(bar.width, 2)}%`,
              top: bar.row * rowHeight,
              height: Math.max(rowHeight - 1, 2),
              backgroundColor: STATUS_COLORS[bar.status as keyof typeof STATUS_COLORS] || '#737373',
            }}
          />
        ))}
      </div>

      {/* Today line */}
      <div 
        className="absolute top-1 bottom-1 w-px bg-brand-primary pointer-events-none"
        style={{ left: `calc(${todayPosition}% + 4px)` }}
      />

      {/* Draggable viewport rectangle */}
      <div 
        className="absolute top-1 bottom-1 bg-brand-primary/10 border-2 border-brand-primary rounded-sm cursor-move hover:bg-brand-primary/20 transition-colors"
        style={{
          left: `calc(${viewportRect.left}% + 4px)`,
          width: `${viewportRect.width}%`,
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
