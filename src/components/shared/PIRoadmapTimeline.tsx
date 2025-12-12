import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, User, TrendingUp, Target, Layers, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PIRoadmapTimelineProps {
  portfolioId: string;
  selectedPIs: string[];
}

export function PIRoadmapTimeline({ portfolioId, selectedPIs }: PIRoadmapTimelineProps) {
  const [selectedEpic, setSelectedEpic] = useState<any>(null);
  const navigate = useNavigate();
  
  // Fetch Program Increments
  const { data: pis, isLoading: pisLoading } = useQuery({
    queryKey: ['pis-timeline', portfolioId, selectedPIs],
    queryFn: async () => {
      // Cast to break type recursion
      const query = (supabase.from('program_increments') as any)
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('start_date');

      const result = selectedPIs.length > 0 
        ? await query.in('id', selectedPIs)
        : await query;
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!portfolioId,
  });

  // Fetch epics with their themes
  const { data: epics, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-timeline', selectedPIs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*, strategic_themes(name, color_tag)')
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Fetch features for the selected epic
  const { data: epicFeatures } = useQuery({
    queryKey: ['epic-features', selectedEpic?.id],
    queryFn: async () => {
      if (!selectedEpic?.id) return [];
      const { data, error } = await supabase
        .from('features')
        .select('id, name, status, health, estimate_points, progress_pct')
        .eq('epic_id', selectedEpic.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEpic?.id,
  });

  if (pisLoading || epicsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PI Roadmap Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pis || pis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PI Roadmap Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            Select a portfolio and PI to view the timeline
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate timeline dimensions
  const earliestPI = pis[0];
  const latestPI = pis[pis.length - 1];
  const timelineStart = parseISO(earliestPI.start_date);
  const timelineEnd = parseISO(latestPI.end_date);
  const totalDays = differenceInDays(timelineEnd, timelineStart);

  // Calculate position for each epic, constrained to timeline boundaries
  const getEpicPosition = (epic: any) => {
    if (!epic.start_date || !epic.end_date) return null;
    
    const epicStart = parseISO(epic.start_date);
    const epicEnd = parseISO(epic.end_date);
    
    // Clip epic to timeline boundaries
    const clippedStart = epicStart < timelineStart ? timelineStart : epicStart;
    const clippedEnd = epicEnd > timelineEnd ? timelineEnd : epicEnd;
    
    // If epic is completely outside timeline, don't show it
    if (clippedStart > timelineEnd || clippedEnd < timelineStart) return null;
    
    const startOffset = differenceInDays(clippedStart, timelineStart);
    const duration = differenceInDays(clippedEnd, clippedStart);

    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return {
      left: Math.max(0, Math.min(left, 100)),
      width: Math.max(0, Math.min(width, 100 - left)),
    };
  };

  // Group epics by theme
  const epicsByTheme = epics?.reduce((acc, epic) => {
    const themeName = epic.strategic_themes?.name || 'Unassigned';
    if (!acc[themeName]) {
      acc[themeName] = [];
    }
    acc[themeName].push(epic);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">PI Roadmap Timeline</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="space-y-4 min-w-[800px]">
          {/* PI Headers */}
          <div className="flex gap-1 mb-4">
            {pis.map((pi) => {
              const piStart = parseISO(pi.start_date);
              const piEnd = parseISO(pi.end_date);
              const piDuration = differenceInDays(piEnd, piStart);
              const widthPercent = (piDuration / totalDays) * 100;

              return (
                <div
                  key={pi.id}
                  className="text-center"
                  style={{ width: `${widthPercent}%` }}
                >
                  <div className="text-xs font-semibold bg-primary/10 rounded px-2 py-1">
                    {pi.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(piStart, 'MMM d')} - {format(piEnd, 'MMM d')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Grid */}
          <div className="relative border-t pt-4 space-y-3 min-h-[200px] overflow-visible">
            {epicsByTheme && Object.entries(epicsByTheme).map(([themeName, themeEpics], themeIdx) => (
              <div key={themeName} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span>{themeName}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                {themeEpics.map((epic, epicIdx) => {
                  const position = getEpicPosition(epic);
                  if (!position) return null;

                  return (
                    <Popover key={epic.id}>
                      <PopoverTrigger asChild>
                        <div className="relative h-10 w-full">
                          <div
                            className={cn(
                              "absolute h-8 rounded-md border-2 flex items-center px-2 gap-2 cursor-pointer transition-all hover:shadow-md hover:z-10",
                              epic.status === 'done' ? "bg-success/10 border-success hover:bg-success/20" :
                              epic.status === 'in_progress' ? "bg-primary/10 border-primary hover:bg-primary/20" :
                              epic.status === 'cancelled' ? "bg-muted border-muted-foreground" :
                              "bg-muted/50 border-border hover:bg-muted"
                            )}
                            style={{
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                            }}
                            onClick={() => setSelectedEpic(epic)}
                          >
                            <span className="text-xs font-medium truncate flex-1">
                              {epic.name}
                            </span>
                            <HealthBadge health={epic.health} />
                            <Badge variant="outline" className="text-xs shrink-0">
                              {epic.status}
                            </Badge>
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-96" align="start">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-base mb-1">{epic.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{epic.status}</Badge>
                              <HealthBadge health={epic.health} />
                            </div>
                          </div>

                          {epic.description && (
                            <>
                              <Separator />
                              <div>
                                <p className="text-sm text-muted-foreground">{epic.description}</p>
                              </div>
                            </>
                          )}

                          <Separator />

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Theme:</span>
                              <span className="font-medium">{epic.strategic_themes?.name || 'None'}</span>
                            </div>

                            {epic.start_date && epic.end_date && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Timeline:</span>
                                <span className="font-medium">
                                  {format(parseISO(epic.start_date), 'MMM d, yyyy')} - {format(parseISO(epic.end_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}

                            {epic.estimate && (
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Estimate:</span>
                                <span className="font-medium">{epic.estimate} points</span>
                              </div>
                            )}

                            {epic.owner_id && (
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Owner:</span>
                                <span className="font-medium">Assigned</span>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Features Breakdown */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-semibold">Features ({epicFeatures?.length || 0})</h5>
                              {epicFeatures && epicFeatures.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round((epicFeatures.filter(f => f.status === 'done').length / epicFeatures.length) * 100)}% Complete
                                </Badge>
                              )}
                            </div>
                            
                            {epicFeatures && epicFeatures.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {epicFeatures.map((feature) => (
                                  <div
                                    key={feature.id}
                                    onClick={() => navigate(`/features?selected=${feature.id}`)}
                                    className="p-3 rounded border bg-card hover:bg-primary/5 transition-colors space-y-2 cursor-pointer group"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium truncate">{feature.name}</p>
                                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          {feature.estimate_points && (
                                            <span className="text-xs text-muted-foreground">
                                              {feature.estimate_points} pts
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <HealthBadge health={feature.health} />
                                        <Badge 
                                          variant={
                                            feature.status === 'done' ? 'default' :
                                            feature.status === 'implementing' ? 'secondary' :
                                            'outline'
                                          }
                                          className="text-xs"
                                        >
                                          {feature.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{feature.progress_pct || 0}%</span>
                                      </div>
                                      <Progress 
                                        value={feature.progress_pct || 0} 
                                        className="h-2"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded">
                                No features in this epic
                              </div>
                            )}
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Duration: {epic.start_date && epic.end_date ? differenceInDays(parseISO(epic.end_date), parseISO(epic.start_date)) : 0} days</span>
                            <span>ID: {epic.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            ))}

            {(!epics || epics.length === 0) && (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                No epics with dates in selected PIs
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10 border-2 border-primary" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/10 border-2 border-success" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted/50 border-2 border-border" />
              <span>Planned</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
