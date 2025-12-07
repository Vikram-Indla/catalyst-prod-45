import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PIFilterSidebar } from '@/components/roadmaps/PIFilterSidebar';
import { 
  Star, Settings, Filter, RefreshCw, Download, ChevronRight, ChevronDown,
  Flag, StarIcon, Calendar, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Roadmaps() {
  const [selectedPIIds, setSelectedPIIds] = useState<string[]>([]);
  const [view, setView] = useState<'work' | 'pi' | 'release'>('work');
  const [showMilestonesObjectives, setShowMilestonesObjectives] = useState(true);
  const [briefingMode, setBriefingMode] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch selected PIs with sprints
  const { data: programIncrements } = useQuery({
    queryKey: ['roadmap-pis', selectedPIIds],
    queryFn: async () => {
      if (selectedPIIds.length === 0) return [];
      const { data, error } = await supabase
        .from('program_increments')
        .select('*, iterations(*)')
        .in('id', selectedPIIds)
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIIds.length > 0,
  });

  // Fetch features for selected PIs
  const { data: features } = useQuery({
    queryKey: ['roadmap-features', selectedPIIds],
    queryFn: async () => {
      if (selectedPIIds.length === 0) return [];
      const { data, error } = await supabase
        .from('features')
        .select(`
          *,
          epics(id, name),
          teams(id, name),
          milestones(*),
          objective_work_items!inner(objectives(*))
        `)
        .in('pi_id', selectedPIIds)
        .order('planned_start_date');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIIds.length > 0,
  });

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate timeline positioning
  const getTimelinePosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate || !programIncrements || programIncrements.length === 0) return null;

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const timelineStart = parseISO(programIncrements[0].start_date);
    const timelineEnd = parseISO(programIncrements[programIncrements.length - 1].end_date);

    if (start > timelineEnd || end < timelineStart) return null;

    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const startOffset = Math.max(0, differenceInDays(start, timelineStart));
    const duration = differenceInDays(end, start);

    return {
      left: (startOffset / totalDays) * 100,
      width: Math.max((duration / totalDays) * 100, 2),
    };
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'accepted':
        return 'bg-success';
      case 'in_progress':
      case 'implementing':
        return 'bg-primary';
      case 'funnel':
      case 'analyzing':
        return 'bg-muted-foreground';
      default:
        return 'bg-warning';
    }
  };

  // Get progress percentage color
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-success';
    if (progress >= 25) return 'bg-warning';
    return 'bg-destructive';
  };

  // Render feature bar on timeline
  const renderFeatureBar = (feature: any) => {
    const position = getTimelinePosition(feature.planned_start_date, feature.planned_end_date);
    if (!position) return null;

    const objectives = feature.objective_work_items?.map((link: any) => link.objectives) || [];
    const milestones = feature.milestones || [];

    return (
      <div
        key={feature.id}
        className={cn(
          'absolute h-8 rounded-sm flex items-center px-2 text-xs font-medium text-white cursor-pointer hover:shadow-lg transition-shadow',
          getStatusColor(feature.status),
          feature.blocked && 'border-2 border-[#FF5630]'
        )}
        style={{
          left: `${position.left}%`,
          width: `${position.width}%`,
          minWidth: '60px',
          top: '4px',
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate flex-1">
                {feature.id.toString().slice(0, 4)} - {feature.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover text-popover-foreground p-3 max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">{feature.name}</p>
                <p className="text-xs">{feature.description}</p>
                <div className="flex items-center gap-2 text-xs pt-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(parseISO(feature.planned_start_date), 'MM/dd/yyyy')} - 
                    {format(parseISO(feature.planned_end_date), 'MM/dd/yyyy')}
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Render milestones as star icons */}
        {showMilestonesObjectives && milestones.map((milestone: any) => {
          const milestonePos = getTimelinePosition(milestone.due_date, milestone.due_date);
          if (!milestonePos) return null;

          return (
            <TooltipProvider key={milestone.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <StarIcon
                    className={`absolute ${milestone.milestone_type === 'start_date' ? 'fill-info' : 'fill-warning'} stroke-background`}
                    style={{
                      left: `${milestonePos.left - position.left}%`,
                      top: '-8px',
                    }}
                    size={20}
                    strokeWidth={2}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground p-3">
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">{milestone.title}</p>
                    {milestone.start_date && (
                      <p>Start date: {format(parseISO(milestone.start_date), 'MM/dd/yyyy')}</p>
                    )}
                    <p>Due date: {format(parseISO(milestone.due_date), 'MM/dd/yyyy')}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Render objective flags */}
        {showMilestonesObjectives && objectives.map((objective: any, idx: number) => {
          if (!objective) return null;
          
          return (
            <TooltipProvider key={objective.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Flag
                    className="absolute fill-destructive stroke-background"
                    style={{
                      right: `${idx * 24}px`,
                      top: '-8px',
                    }}
                    size={18}
                    strokeWidth={2}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground p-3 max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">{objective.name}</p>
                    {objective.end_date && (
                      <p>{format(parseISO(objective.end_date), 'MM/dd/yyyy')}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Progress indicator overlay */}
        {feature.progress_pct > 0 && (
          <div
            className={cn(
              'absolute left-0 top-0 h-full opacity-50 rounded-sm',
              getProgressColor(feature.progress_pct)
            )}
            style={{ width: `${feature.progress_pct}%` }}
          />
        )}

        {/* Blocked indicator */}
        {feature.blocked && (
          <AlertTriangle className="absolute -right-1 -top-1 fill-destructive stroke-background" size={14} />
        )}
      </div>
    );
  };

  // Empty state
  if (selectedPIIds.length === 0) {
    return (
      <div className="h-full flex">
        {/* Left PI Selector */}
        <div className="w-64 border-r bg-card">
          <PIFilterSidebar 
            selectedPIIds={selectedPIIds}
            onSelectionChange={setSelectedPIIds}
          />
        </div>

        {/* Main content - empty state */}
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-6">
            <div className="mb-6">
              <svg className="mx-auto h-32 w-32 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Select a program increment</h3>
            <p className="text-sm text-muted-foreground">
              To view and edit the roadmap, you must have at least one program increment selected in the sidebar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate today line position
  const todayPosition = programIncrements && programIncrements.length > 0
    ? (() => {
        const timelineStart = parseISO(programIncrements[0].start_date);
        const timelineEnd = parseISO(programIncrements[programIncrements.length - 1].end_date);
        const today = startOfDay(new Date());
        
        if (today < timelineStart || today > timelineEnd) return null;
        
        const totalDays = differenceInDays(timelineEnd, timelineStart);
        const daysSinceStart = differenceInDays(today, timelineStart);
        return (daysSinceStart / totalDays) * 100;
      })()
    : null;

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background">
      {/* Left PI Selector */}
      <div className="w-full lg:w-64 border-b lg:border-r lg:border-b-0 bg-card">
        <PIFilterSidebar 
          selectedPIIds={selectedPIIds}
          onSelectionChange={setSelectedPIIds}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="h-[72px] border-b bg-card flex-shrink-0">
          <div className="h-full px-3 sm:px-4 md:px-6 flex items-center">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Live Roadmap</h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Settings className="h-4 w-4 mr-2" />
                  View Configuration
                </Button>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Controls */}
        <div className="border-b bg-card px-3 sm:px-4 md:px-6 py-2 sm:py-3">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Select value={view} onValueChange={(v: any) => setView(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="pi">PI View</SelectItem>
                  <SelectItem value="release">Release Vehicle</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="capability">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Feature by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capability">Feature by Cap...</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="program">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Program R..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">Program R...</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {features?.length || 0} items loaded
              </span>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={showMilestonesObjectives ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowMilestonesObjectives(!showMilestonesObjectives)}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Milestones and objectives
                </Button>
                <Button
                  variant={briefingMode ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setBriefingMode(!briefingMode)}
                >
                  Briefing
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Scroll Bar */}
        <div className="border-b bg-card px-6 py-2">
          <div className="relative h-2 bg-foreground/80 rounded-full">
            <div className="absolute inset-0 bg-foreground/80 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-foreground rounded-full border-2 border-background cursor-pointer" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-foreground rounded-full border-2 border-background cursor-pointer" />
          </div>
        </div>

        {/* Roadmap Grid */}
        <ScrollArea className="flex-1">
          <div className="min-w-[1200px]">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 bg-card border-b">
              <div className="flex">
                {/* Left sticky columns headers */}
                <div className="flex border-r bg-background">
                  <div className="w-16 px-3 py-3 text-xs font-semibold text-muted-foreground border-r">Items</div>
                  <div className="w-24 px-3 py-3 text-xs font-semibold text-muted-foreground border-r text-center">Story Points</div>
                  <div className="w-32 px-3 py-3 text-xs font-semibold text-muted-foreground text-center">State</div>
                </div>

                {/* Timeline headers */}
                <div className="flex-1 flex">
                  {programIncrements?.map((pi) => {
                    const iterations = pi.iterations || [];
                    return (
                      <div key={pi.id} className="flex-1 min-w-[300px]">
                        <div className="px-3 py-2 text-center font-semibold text-sm border-b bg-muted/50">
                          {pi.name}
                        </div>
                        <div className="flex border-b bg-muted/30">
                          {iterations.map((iteration: any) => (
                            <div key={iteration.id} className="flex-1 px-2 py-1 text-center text-xs text-muted-foreground border-r last:border-r-0">
                              S{iteration.name.slice(-2)}
                            </div>
                          ))}
                          {iterations.length === 0 && (
                            <div className="flex-1 px-2 py-1 text-center text-xs text-muted-foreground">
                              PI{pi.name.slice(-1)}1-{pi.name.slice(-1)}6
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Feature Rows */}
            <div className="relative">
              {features?.map((feature, idx) => (
                <div key={feature.id} className={cn(
                  'flex border-b hover:bg-accent/50 transition-colors',
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                )}>
                  {/* Left sticky columns */}
                  <div className="flex border-r bg-inherit sticky left-0 z-10">
                    <div className="w-16 px-2 py-2 flex items-center border-r">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleRowExpand(feature.id)}
                      >
                        {expandedRows.has(feature.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      {feature.milestones && feature.milestones.length > 0 && (
                        <AlertTriangle className="h-3 w-3 text-[#FFAB00] ml-1" />
                      )}
                    </div>
                    <div className="w-24 px-3 py-4 text-sm text-center border-r">
                      {feature.estimate_points || 0}
                    </div>
                    <div className="w-32 px-3 py-2 flex flex-col items-center justify-center gap-1">
                      <Badge variant="secondary" className="text-xs uppercase">
                        {feature.status?.replace('_', ' ')}
                      </Badge>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1.5 h-4',
                              i < Math.floor((feature.progress_pct || 0) / 20) ? 'bg-primary' : 'bg-muted'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Timeline area */}
                  <div className="flex-1 relative min-h-[48px]">
                    {renderFeatureBar(feature)}
                    
                    {/* Today line */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-destructive z-10"
                        style={{ left: `${todayPosition}%` }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}