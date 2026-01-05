/**
 * Draggable Allocation Bar Component
 * Supports drag-resize for start/end dates and moving entire allocation
 * Snap to week boundaries by default, hold Shift for day precision
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAllocationMutation } from '@/hooks/useAllocationMutation';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { getTimelineBarStyle } from '@/lib/constants/catalyst-colors';
import styles from './Timeline.module.css';

interface DraggableAllocationBarProps {
  allocation: {
    id: string;
    start_date: string;
    end_date: string;
    allocation_percent: number;
    assignment_name?: string;
    profile_id?: string;
  };
  timelineStartDate: Date;
  timelineEndDate: Date;
  totalWidth: number;
  rowIndex: number;
  totalBars: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  snapToWeek?: boolean;
  onClick?: () => void;
}

type DragMode = 'none' | 'move' | 'resize-start' | 'resize-end';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function DraggableAllocationBar({
  allocation,
  timelineStartDate,
  timelineEndDate,
  totalWidth,
  rowIndex,
  totalBars,
  onDragStart,
  onDragEnd,
  snapToWeek = true,
  onClick,
}: DraggableAllocationBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStartX, setDragStartX] = useState(0);
  const [originalLeft, setOriginalLeft] = useState(0);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [currentLeft, setCurrentLeft] = useState(0);
  const [currentWidth, setCurrentWidth] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [tooltipDate, setTooltipDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  const { mutateAsync: updateAllocation } = useAllocationMutation();
  
  const projectName = allocation.assignment_name || 'Allocation';
  
  // Calculate pixels per day
  const totalDays = (timelineEndDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const pixelsPerDay = totalWidth / totalDays;
  
  // Calculate initial position
  const startDate = new Date(allocation.start_date);
  const endDate = new Date(allocation.end_date);
  const startDays = Math.max(0, (startDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const initialLeft = startDays * pixelsPerDay;
  const initialWidth = durationDays * pixelsPerDay;
  
  useEffect(() => {
    setCurrentLeft(initialLeft);
    setCurrentWidth(initialWidth);
  }, [initialLeft, initialWidth]);
  
  // Snap to week boundary (7 days)
  const snapToWeekBoundary = useCallback((pixels: number): number => {
    if (!snapToWeek) return pixels;
    const days = pixels / pixelsPerDay;
    const snappedDays = Math.round(days / 7) * 7;
    return snappedDays * pixelsPerDay;
  }, [pixelsPerDay, snapToWeek]);
  
  // Convert pixels to date
  const pixelsToDate = useCallback((pixels: number): Date => {
    const days = Math.round(pixels / pixelsPerDay);
    const date = new Date(timelineStartDate);
    date.setDate(date.getDate() + days);
    return date;
  }, [pixelsPerDay, timelineStartDate]);
  
  // Format date for tooltip
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate delta in weeks
  const calculateWeeksDelta = (originalPixels: number, newPixels: number): string => {
    const originalDays = originalPixels / pixelsPerDay;
    const newDays = newPixels / pixelsPerDay;
    const deltaDays = newDays - originalDays;
    const deltaWeeks = Math.round(deltaDays / 7);
    
    if (deltaWeeks === 0) return 'No change';
    if (deltaWeeks > 0) return `+${deltaWeeks} week${deltaWeeks !== 1 ? 's' : ''}`;
    return `${deltaWeeks} week${deltaWeeks !== -1 ? 's' : ''}`;
  };
  
  // Handle mouse down on bar
  const handleMouseDown = useCallback((e: React.MouseEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragMode(mode);
    setDragStartX(e.clientX);
    setOriginalLeft(currentLeft);
    setOriginalWidth(currentWidth);
    
    onDragStart?.();
    
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [currentLeft, currentWidth, onDragStart]);
  
  // Handle mouse move
  useEffect(() => {
    if (dragMode === 'none') return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const shiftHeld = e.shiftKey;
      
      let newLeft = currentLeft;
      let newWidth = currentWidth;
      
      if (dragMode === 'move') {
        newLeft = originalLeft + deltaX;
        if (!shiftHeld) {
          newLeft = snapToWeekBoundary(newLeft);
        }
        newLeft = Math.max(0, Math.min(newLeft, totalWidth - currentWidth));
        setCurrentLeft(newLeft);
        
        const newStartDate = pixelsToDate(newLeft);
        setTooltipDate(formatDate(newStartDate));
        
      } else if (dragMode === 'resize-start') {
        const maxDelta = originalWidth - (pixelsPerDay * 7);
        const clampedDelta = Math.min(deltaX, maxDelta);
        
        newLeft = originalLeft + clampedDelta;
        newWidth = originalWidth - clampedDelta;
        
        if (!shiftHeld) {
          newLeft = snapToWeekBoundary(newLeft);
          newWidth = originalLeft + originalWidth - newLeft;
        }
        
        newLeft = Math.max(0, newLeft);
        newWidth = Math.max(pixelsPerDay * 7, newWidth);
        setCurrentLeft(newLeft);
        setCurrentWidth(newWidth);
        
        const newStartDate = pixelsToDate(newLeft);
        setTooltipDate(formatDate(newStartDate));
        
      } else if (dragMode === 'resize-end') {
        newWidth = originalWidth + deltaX;
        
        if (!shiftHeld) {
          newWidth = snapToWeekBoundary(originalLeft + newWidth) - originalLeft;
        }
        
        newWidth = Math.max(pixelsPerDay * 7, newWidth);
        newWidth = Math.min(newWidth, totalWidth - currentLeft);
        setCurrentWidth(newWidth);
        
        const newEndDate = pixelsToDate(currentLeft + newWidth);
        setTooltipDate(formatDate(newEndDate));
      }
      
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = async () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      const wasMoving = true;
      const currentDragMode = dragMode;
      setDragMode('none');
      setTooltipDate(null);
      onDragEnd?.();
      
      if (!wasMoving) return;
      
      // Check if anything changed
      if (Math.abs(currentLeft - originalLeft) < 1 && Math.abs(currentWidth - originalWidth) < 1) {
        return;
      }
      
      // Calculate new dates
      const newStartDate = pixelsToDate(currentLeft);
      const newEndDate = pixelsToDate(currentLeft + currentWidth);
      
      // Save to database
      setSaveStatus('saving');
      
      try {
        await updateAllocation({
          id: allocation.id,
          start_date: newStartDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
        });
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
        
      } catch (error) {
        console.error('Failed to save allocation:', error);
        setSaveStatus('error');
        
        // Revert to original position
        setCurrentLeft(originalLeft);
        setCurrentWidth(originalWidth);
        
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragMode, dragStartX, originalLeft, originalWidth, currentLeft, currentWidth, snapToWeekBoundary, pixelsToDate, pixelsPerDay, totalWidth, allocation.id, updateAllocation, onDragEnd]);
  
  // Determine cursor based on position
  const getCursor = (e: React.MouseEvent): string => {
    if (!barRef.current) return 'pointer';
    
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const handleWidth = 12;
    
    if (x < handleWidth) return 'ew-resize';
    if (x > rect.width - handleWidth) return 'ew-resize';
    return 'grab';
  };
  
  const isDragging = dragMode !== 'none';
  const showGhost = isDragging && (Math.abs(currentLeft - originalLeft) > 1 || Math.abs(currentWidth - originalWidth) > 1);
  
  // Calculate vertical position
  const baseRowHeight = 72;
  const padding = 4;
  const gap = 2;
  
  let barHeight: number;
  let topPx: number;
  
  if (totalBars === 1) {
    barHeight = 32;
    topPx = (baseRowHeight - barHeight) / 2;
  } else if (totalBars === 2) {
    barHeight = 26;
    const totalNeeded = (barHeight * 2) + gap;
    const startOffset = (baseRowHeight - totalNeeded) / 2;
    topPx = startOffset + (rowIndex * (barHeight + gap));
  } else {
    barHeight = Math.max(18, Math.floor((baseRowHeight - padding * 2 - (gap * (totalBars - 1))) / totalBars));
    topPx = padding + (rowIndex * (barHeight + gap));
  }
  
  // Get bar class based on project name
  const getBarClass = () => {
    const name = projectName.toLowerCase();
    if (name.includes('bau') || name.includes('ops') || name.includes('platform')) {
      return styles.barPrimary;
    }
    if (name.includes('innovation') || name.includes('alpha') || name.includes('tahommena')) {
      return styles.barTeal;
    }
    if (name.includes('website') || name.includes('design') || name.includes('review')) {
      return styles.barWarning;
    }
    if (name.includes('inspection') || name.includes('international') || name.includes('mim')) {
      return styles.barTeal;
    }
    if (name.includes('sectorial') || name.includes('strategy')) {
      return styles.barSlate;
    }
    return styles.barPrimary;
  };

  return (
    <>
      {/* Ghost (original position) */}
      {showGhost && (
        <div
          className={cn(styles.allocationBar, 'opacity-30 border-2 border-dashed border-border-strong')}
          style={{
            left: originalLeft,
            width: Math.max(originalWidth, 80),
            top: topPx,
            height: barHeight,
            background: 'transparent',
            boxShadow: 'none',
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* Main Bar */}
      <div
        ref={barRef}
        data-allocation-id={allocation.id}
        className={cn(
          styles.allocationBar,
          getBarClass(),
          isDragging && 'z-20 shadow-xl scale-[1.02]',
          isHovered && !isDragging && 'shadow-lg'
        )}
        style={{
          left: currentLeft,
          width: Math.max(currentWidth, 80),
          top: topPx,
          height: barHeight,
          transition: isDragging ? 'none' : 'box-shadow 0.15s ease',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          const rect = barRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const x = e.clientX - rect.left;
          const handleWidth = 12;
          
          if (x < handleWidth) {
            handleMouseDown(e, 'resize-start');
          } else if (x > rect.width - handleWidth) {
            handleMouseDown(e, 'resize-end');
          } else {
            handleMouseDown(e, 'move');
          }
        }}
        onMouseMove={(e) => {
          if (!isDragging && barRef.current) {
            barRef.current.style.cursor = getCursor(e);
          }
        }}
        onClick={(e) => {
          if (!isDragging) {
            onClick?.();
          }
        }}
      >
        {/* Left resize handle */}
        <div 
          className={cn(
            'absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center rounded-l-md transition-opacity',
            isHovered || isDragging ? 'opacity-100' : 'opacity-0'
          )}
          style={{ cursor: 'ew-resize' }}
        >
          <div className="w-0.5 h-4 bg-white/40 rounded-full" />
        </div>
        
        {/* Bar content */}
        <span className="truncate px-2 flex-1">
          {projectName} ({allocation.allocation_percent}%)
        </span>
        
        {/* Save status indicator */}
        {saveStatus !== 'idle' && (
          <div className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
            {saveStatus === 'saving' && (
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
            )}
            {saveStatus === 'saved' && (
              <Check className="w-3 h-3 text-teal-500" />
            )}
            {saveStatus === 'error' && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </div>
        )}
        
        {/* Right resize handle */}
        <div 
          className={cn(
            'absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center rounded-r-md transition-opacity',
            isHovered || isDragging ? 'opacity-100' : 'opacity-0'
          )}
          style={{ cursor: 'ew-resize' }}
        >
          <div className="w-0.5 h-4 bg-white/40 rounded-full" />
        </div>
      </div>
      
      {/* Drag tooltip */}
      {isDragging && tooltipDate && (
        <div
          className="fixed z-50 pointer-events-none animate-in fade-in-0 zoom-in-95"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y - 40,
          }}
        >
          <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs">
            <div className="font-semibold">{tooltipDate}</div>
            <div className="text-slate-400 text-[10px] mt-0.5">
              {dragMode === 'move' 
                ? calculateWeeksDelta(originalLeft, currentLeft)
                : dragMode === 'resize-end'
                  ? calculateWeeksDelta(originalWidth, currentWidth)
                  : calculateWeeksDelta(originalLeft, currentLeft)
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}
