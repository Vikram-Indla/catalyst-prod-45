/**
 * Program Epic Roadmap - Time-based timeline view for Epics
 * Phase II Step 3: Time & Roadmap Alignment
 * 
 * Renders Epics on a timeline using:
 * - Start = initiation_date
 * - End = target_completion_date
 * 
 * NO PI-based groupings or swimlanes.
 */

import { useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { ZoomIn, ZoomOut, Search, Filter, Calendar, Star } from 'lucide-react';
import { EpicOverdueIndicator } from '@/components/items/epics/EpicTimeBadges';
import { getQuarterLabel, isEpicOverdue, isEpicDueThisQuarter, getEpicDuration } from '@/lib/epic-time-utils';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

interface EpicRoadmapData {
  id: string;
  epic_key: string | null;
  name: string;
  status: string | null;
  state: string | null;
  health: string | null;
  initiation_date: string | null;
  target_completion_date: string | null;
  estimate: number | null;
  strategic_value_score: number | null;
  owner_name: string | null;
}

const MONTH_WIDTH = 120;
const ROW_HEIGHT = 40;
const ROW_GAP = 8;

export function ProgramEpicRoadmap() {
  const { programId } = useParams();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'health' | 'owner'>('none');
  const [selectedEpic, setSelectedEpic] = useState<EpicRoadmapData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Epics with date fields
  const { data: epics, isLoading } = useQuery({
    queryKey: ['program-epics-roadmap', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name, status, state, health, initiation_date, target_completion_date, estimate, strategic_value_score, owner_name')
        .eq('primary_program_id', programId)
        .is('deleted_at', null)
        .not('initiation_date', 'is', null)
        .not('target_completion_date', 'is', null)
        .order('initiation_date', { ascending: true });

      if (error) throw error;
      return (data || []) as EpicRoadmapData[];
    },
    enabled: !!programId,
  });

  // Calculate timeline bounds
  const { timelineStart, timelineEnd, months } = useMemo(() => {
    if (!epics || epics.length === 0) {
      const today = new Date();
      const start = startOfMonth(addMonths(today, -1));
      const end = endOfMonth(addMonths(today, 6));
      return {
        timelineStart: start,
        timelineEnd: end,
        months: eachMonthOfInterval({ start, end }),
      };
    }

    // Find min/max dates from epics
    let minDate = new Date();
    let maxDate = new Date();

    epics.forEach(epic => {
      if (epic.initiation_date) {
        const start = new Date(epic.initiation_date);
        if (start < minDate) minDate = start;
      }
      if (epic.target_completion_date) {
        const end = new Date(epic.target_completion_date);
        if (end > maxDate) maxDate = end;
      }
    });

    // Add padding
    const start = startOfMonth(addMonths(minDate, -1));
    const end = endOfMonth(addMonths(maxDate, 1));

    return {
      timelineStart: start,
      timelineEnd: end,
      months: eachMonthOfInterval({ start, end }),
    };
  }, [epics]);

  // Filter epics
  const filteredEpics = useMemo(() => {
    if (!epics) return [];
    
    let filtered = epics;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(q) || 
        (e.epic_key || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [epics, searchQuery]);

  // Calculate bar position and width
  const getBarStyle = (epic: EpicRoadmapData) => {
    if (!epic.initiation_date || !epic.target_completion_date) return null;

    const epicStart = new Date(epic.initiation_date);
    const epicEnd = new Date(epic.target_completion_date);
    
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const startOffset = differenceInDays(epicStart, timelineStart);
    const duration = differenceInDays(epicEnd, epicStart);

    const left = (startOffset / totalDays) * 100;
    const width = Math.max((duration / totalDays) * 100, 2); // Min 2% width

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(width, 100 - Math.max(0, left))}%`,
    };
  };

  const getHealthColor = (health: string | null) => {
    switch (health) {
      case 'green': return 'bg-success';
      case 'yellow': return 'bg-warning';
      case 'red': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const getBarColor = (epic: EpicRoadmapData) => {
    if (isEpicOverdue(epic.target_completion_date, epic.status)) {
      return 'bg-destructive/80';
    }
    if (isEpicDueThisQuarter(epic.target_completion_date)) {
      return 'bg-warning/80';
    }
    switch (epic.status) {
      case 'in_progress': return 'bg-primary/80';
      case 'accepted': return 'bg-success/80';
      case 'not_started': return 'bg-muted-foreground/60';
      default: return 'bg-primary/60';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-[72px] flex items-center justify-between px-6 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Epic Roadmap</h1>
          <span className="text-sm text-muted-foreground">
            {filteredEpics.length} epics
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search epics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="health">By Health</SelectItem>
              <SelectItem value="owner">By Owner</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredEpics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-50" />
            <p>No epics with dates found</p>
            <p className="text-sm">Set initiation and target dates on epics to see them on the roadmap</p>
          </div>
        ) : (
          <div className="p-6" style={{ minWidth: `${months.length * MONTH_WIDTH * zoomLevel}px` }}>
            {/* Month Headers */}
            <div className="flex border-b border-border mb-4 sticky top-0 bg-background z-10">
              <div className="w-64 shrink-0 px-4 py-2 font-medium text-sm">Epic</div>
              <div className="flex-1 flex">
                {months.map((month, i) => (
                  <div 
                    key={i}
                    className="text-center text-xs font-medium text-muted-foreground py-2 border-l border-border"
                    style={{ width: `${MONTH_WIDTH * zoomLevel}px` }}
                  >
                    {format(month, 'MMM yyyy')}
                  </div>
                ))}
              </div>
            </div>

            {/* Epic Rows */}
            <TooltipProvider>
              <div className="space-y-1">
                {filteredEpics.map((epic) => {
                  const barStyle = getBarStyle(epic);
                  
                  return (
                    <div 
                      key={epic.id}
                      className="flex items-center hover:bg-muted/30 rounded"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Epic Name */}
                      <div className="w-64 shrink-0 px-4 flex items-center gap-2 truncate">
                        <div className={cn('h-2 w-2 rounded-full shrink-0', getHealthColor(epic.health))} />
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {epic.epic_key || epic.id.slice(0, 8)}
                        </span>
                        <span className="text-sm truncate">{epic.name}</span>
                      </div>
                      
                      {/* Timeline Bar */}
                      <div className="flex-1 relative h-full">
                        {barStyle && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-2 h-6 rounded cursor-pointer transition-all hover:opacity-90',
                                  getBarColor(epic)
                                )}
                                style={{
                                  left: barStyle.left,
                                  width: barStyle.width,
                                  minWidth: '24px',
                                }}
                                onClick={() => setSelectedEpic(epic)}
                              >
                                <EpicOverdueIndicator 
                                  targetCompletionDate={epic.target_completion_date}
                                  status={epic.status}
                                />
                                {/* Progress overlay - removed as progress_pct not in schema */}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-2">
                                <div className="font-semibold">{epic.epic_key || 'Epic'}: {epic.name}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <span className="text-muted-foreground">Status:</span>
                                  <span className="capitalize">{epic.status?.replace('_', ' ') || '—'}</span>
                                  <span className="text-muted-foreground">Value Score:</span>
                                  <span>{epic.strategic_value_score?.toFixed(1) || '—'}</span>
                                  <span className="text-muted-foreground">Target:</span>
                                  <span>
                                    {epic.target_completion_date 
                                      ? format(new Date(epic.target_completion_date), 'MMM d, yyyy')
                                      : '—'}
                                  </span>
                                  <span className="text-muted-foreground">Quarter:</span>
                                  <span>{getQuarterLabel(epic.target_completion_date) || '—'}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}
