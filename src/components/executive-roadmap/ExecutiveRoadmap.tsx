import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { TimeScale, Language, ProcessStage } from './types';
import { useRoadmapData } from './hooks/useRoadmapData';
import { useRoadmapFilters } from './hooks/useRoadmapFilters';
import { KPIDashboard } from './components/KPIDashboard';
import { TimelineHeader } from './components/TimelineHeader';
import { RequestRow } from './components/RequestRow';
import { ControlsBar } from './components/ControlsBar';
import { MobileControlsPanel } from './components/MobileControlsPanel';
import { Legend } from './components/Legend';

interface ExecutiveRoadmapProps {
  className?: string;
}

export function ExecutiveRoadmap({ className }: ExecutiveRoadmapProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const roadmapRef = useRef<HTMLDivElement>(null);
  
  const [timeScale, setTimeScale] = useState<TimeScale>('monthly');
  const [showMilestones, setShowMilestones] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch roadmap data
  const { data: requests, isLoading, error } = useRoadmapData();

  // Filtering and sorting
  const {
    platform,
    setPlatform,
    status,
    setStatus,
    owner,
    setOwner,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    language,
    setLanguage,
    uniqueOwners,
    filteredData,
    stageCounts,
    handleKPIClick,
  } = useRoadmapFilters(requests);

  // Calculate today position for timeline marker
  const todayPosition = useMemo(() => {
    // Simplified calculation - would need adjustment based on actual timeline
    return 25; // Placeholder for demo
  }, [timeScale]);

  // Implementing count for legend
  const implementingCount = useMemo(() => {
    return filteredData.filter(r => r.stage === 4).length;
  }, [filteredData]);

  // Handle request click - navigate to detail
  const handleRequestClick = useCallback((requestId: string) => {
    // Navigate to the industry page with the request selected
    // Extract numeric ID from request key (e.g., MIM-030 -> find the actual DB ID)
    navigate(`/industry?requestId=${encodeURIComponent(requestId)}`);
  }, [navigate]);

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      roadmapRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Handle PDF export
  const handleExport = useCallback(async () => {
    toast({
      title: 'Generating PDF...',
      description: 'Please wait while we prepare your export.',
    });

    // For now, use browser print as a fallback
    // In production, would use html2pdf.js or similar
    setTimeout(() => {
      window.print();
      toast({
        title: 'Export Ready',
        description: 'Use your browser print dialog to save as PDF.',
      });
    }, 500);
  }, [toast]);

  // RTL support
  const isRTL = language === 'ar';

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <p>Error loading roadmap data: {error.message}</p>
      </div>
    );
  }

  return (
    <div 
      ref={roadmapRef}
      className={cn(
        "flex flex-col h-full bg-white",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-[#2C2825] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs tracking-[0.3em] text-[#9A9389] uppercase mb-1">
            <span>E X E C U T I V E</span>
            <span>R O A D M A P</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isRTL ? 'محفظة طلبات وزارة الصناعة' : 'MIM Industry Requests Portfolio'}
          </h1>
        </div>
      </div>

      {/* KPI Dashboard */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 px-4 py-4 bg-[#F5F2ED]">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <KPIDashboard
          stageCounts={stageCounts}
          activeStatus={status}
          onStatusClick={handleKPIClick}
          language={language}
        />
      )}

      {/* Controls Bar */}
      <ControlsBar
        timeScale={timeScale}
        onTimeScaleChange={setTimeScale}
        platform={platform}
        onPlatformChange={setPlatform}
        status={status}
        onStatusChange={setStatus}
        owner={owner}
        onOwnerChange={setOwner}
        uniqueOwners={uniqueOwners}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        showMilestones={showMilestones}
        onMilestonesToggle={() => setShowMilestones(!showMilestones)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
        onExport={handleExport}
        language={language}
        onLanguageChange={setLanguage}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="min-w-[600px]">
            {/* Timeline Header */}
            <TimelineHeader
              timeScale={timeScale}
              language={language}
              todayPosition={todayPosition}
            />

            {/* Request Rows */}
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 rounded" />
                ))}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#9A9389]">
                <p>{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E4DD]">
                {filteredData.map((request, index) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    index={index}
                    timeScale={timeScale}
                    language={language}
                    showMilestones={showMilestones}
                    onRequestClick={handleRequestClick}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Legend */}
      <Legend
        language={language}
        totalCount={filteredData.length}
        implementingCount={implementingCount}
      />

      {/* Mobile Controls Panel */}
      <MobileControlsPanel
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        timeScale={timeScale}
        onTimeScaleChange={setTimeScale}
        platform={platform}
        onPlatformChange={setPlatform}
        status={status}
        onStatusChange={setStatus}
        owner={owner}
        onOwnerChange={setOwner}
        uniqueOwners={uniqueOwners}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        showMilestones={showMilestones}
        onMilestonesToggle={() => setShowMilestones(!showMilestones)}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .executive-roadmap, .executive-roadmap * {
            visibility: visible;
          }
          .executive-roadmap {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A3 landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

export default ExecutiveRoadmap;
