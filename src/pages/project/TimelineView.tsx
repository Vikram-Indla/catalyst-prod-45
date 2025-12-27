// =====================================================
// TIMELINE VIEW PAGE
// Main Gantt chart page component
// =====================================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineSidebar } from '@/components/timeline/TimelineSidebar';
import { TimelineHeader } from '@/components/timeline/TimelineHeader';
import { TimelineBar } from '@/components/timeline/TimelineBar';
import { DependencyLines } from '@/components/timeline/DependencyLines';
import { EmptyTimelineState } from '@/components/empty-states/EmptyTimelineState';
import { useTimelineData } from '@/hooks/useTimelineView';
import { TimelineRelease, calculateGridWidth } from '@/services/timelineService';
import { cn } from '@/lib/utils';

type ZoomLevel = 'week' | 'month' | 'quarter';

export default function TimelineView() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [releases, setReleases] = useState<TimelineRelease[]>([]);
  const [showDependencies, setShowDependencies] = useState(true);

  const { data, isLoading } = useTimelineData(projectId || '');

  // Initialize releases from data
  useEffect(() => {
    if (data?.releases) {
      setReleases(data.releases);
    }
  }, [data?.releases]);

  // Calculate pixel width per day based on zoom
  const pixelsPerDay = useMemo(() => {
    switch (zoom) {
      case 'week': return 30;
      case 'month': return 40 / 7; // ~5.7px per day
      case 'quarter': return 60 / 30; // 2px per day
      default: return 40 / 7;
    }
  }, [zoom]);

  // Calculate total grid width
  const gridWidth = useMemo(() => {
    if (!data?.dateRange) return 2000;
    return calculateGridWidth(data.dateRange.start, data.dateRange.end, zoom);
  }, [data?.dateRange, zoom]);

  // Calculate bar position
  const calculateBarPosition = (startDate: Date, endDate: Date) => {
    if (!data?.dateRange) return { left: 0, width: 100 };
    
    const rangeStart = data.dateRange.start.getTime();
    const featureStart = startDate.getTime();
    const featureEnd = endDate.getTime();
    
    const daysFromStart = (featureStart - rangeStart) / (1000 * 60 * 60 * 24);
    const duration = (featureEnd - featureStart) / (1000 * 60 * 60 * 24);
    
    return {
      left: daysFromStart * pixelsPerDay,
      width: Math.max(duration * pixelsPerDay, 50)
    };
  };

  // Calculate today marker position
  const todayPosition = useMemo(() => {
    if (!data?.dateRange) return 0;
    const rangeStart = data.dateRange.start.getTime();
    const today = new Date().getTime();
    const daysFromStart = (today - rangeStart) / (1000 * 60 * 60 * 24);
    return daysFromStart * pixelsPerDay;
  }, [data?.dateRange, pixelsPerDay]);

  // Calculate total content height for dependency lines
  const totalContentHeight = useMemo(() => {
    let rows = 0;
    for (const release of releases) {
      rows++; // Release header
      if (!release.isCollapsed) {
        rows += release.features.length;
      }
    }
    return 52 + rows * 48; // header + rows
  }, [releases]);

  // Toggle release collapse
  const handleToggleRelease = (releaseId: string) => {
    setReleases(prev => prev.map(r => 
      r.id === releaseId ? { ...r, isCollapsed: !r.isCollapsed } : r
    ));
  };

  // Scroll to today
  const scrollToToday = () => {
    if (gridRef.current) {
      gridRef.current.scrollLeft = todayPosition - gridRef.current.clientWidth / 2;
    }
  };

  // Navigate to feature detail
  const handleFeatureClick = (featureId: string) => {
    // Navigate based on current URL structure
    navigate(`/projects/${projectId}/features/${featureId}`);
  };

  const isEmpty = !releases || releases.every(r => r.features.length === 0);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Timeline</h1>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[rgba(92,124,92,0.15)] text-[#5c7c5c]">
                  Roadmap
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex border rounded-lg overflow-hidden">
                {(['week', 'month', 'quarter'] as ZoomLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setZoom(level)}
                    className={cn(
                      'px-3 py-1.5 text-xs border-r last:border-r-0 transition-colors',
                      zoom === level
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setShowDependencies(!showDependencies)}
                className={cn(showDependencies && 'border-[#2563eb] text-[#2563eb]')}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Dependencies
              </Button>

              <Button variant="outline" onClick={scrollToToday}>
                <Calendar className="w-4 h-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyTimelineState projectId={projectId} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <TimelineSidebar
            releases={releases}
            onToggleRelease={handleToggleRelease}
            onFeatureClick={handleFeatureClick}
          />

          {/* Timeline Grid */}
          <div 
            ref={gridRef}
            className="flex-1 overflow-x-auto overflow-y-auto relative"
          >
            {/* Header */}
            {data?.dateRange && (
              <TimelineHeader
                startDate={data.dateRange.start}
                endDate={data.dateRange.end}
                zoom={zoom}
              />
            )}

            {/* Grid Content */}
            <div className="relative" style={{ width: `${gridWidth}px`, minHeight: `${totalContentHeight}px` }}>
              {/* Today Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#ef4444] z-20"
                style={{ left: `${todayPosition}px`, height: `${totalContentHeight}px` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-[#ef4444] whitespace-nowrap">
                  Today
                </span>
              </div>

              {/* Release Groups */}
              {releases.map((release) => (
                <div key={release.id}>
                  {/* Release Header Row */}
                  <div
                    className="h-9 flex items-center px-3"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                    }}
                  >
                    <span className="text-white text-xs font-semibold">
                      {release.version}
                    </span>
                    <span className="text-white/70 text-xs ml-2">|</span>
                    <span className="text-white/70 text-xs ml-2">
                      Target: {release.target_date 
                        ? new Date(release.target_date).toLocaleDateString()
                        : 'Not set'}
                    </span>
                  </div>

                  {/* Feature Rows */}
                  {!release.isCollapsed && release.features.map((feature) => {
                    const { left, width } = calculateBarPosition(
                      feature.start_date,
                      feature.end_date
                    );

                    return (
                      <div
                        key={feature.id}
                        className="h-12 border-b relative"
                      >
                        <TimelineBar
                          feature={feature}
                          left={left}
                          width={width}
                          onClick={() => handleFeatureClick(feature.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Dependency Lines (SVG overlay) */}
              {showDependencies && data?.dependencies && data.dateRange && (
                <DependencyLines
                  dependencies={data.dependencies}
                  releases={releases}
                  pixelsPerDay={pixelsPerDay}
                  dateRangeStart={data.dateRange.start}
                  rowHeight={48}
                  headerHeight={52}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
