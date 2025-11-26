import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigation } from '@/contexts/NavigationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfQuarter, endOfQuarter, addQuarters, differenceInDays, parseISO, isSameQuarter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, Filter, ChevronRight, Layers, Target, TrendingUp, AlertCircle } from 'lucide-react';

export default function PortfolioRoadmap() {
  const { selectedPortfolioId, selectedProgramId } = useNavigation();
  const [viewMode, setViewMode] = useState<'quarters' | 'months'>('quarters');
  const [swimlaneBy, setSwimlaneBy] = useState<'theme' | 'program' | 'epic'>('theme');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const today = new Date();
  const quarters = Array.from({ length: 6 }, (_, i) => {
    const quarterStart = startOfQuarter(addQuarters(today, i - 2));
    return {
      start: quarterStart,
      end: endOfQuarter(quarterStart),
      label: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
    };
  });

  // Fetch epics with relationships
  const { data: epics } = useQuery({
    queryKey: ['roadmap-epics', selectedPortfolioId, selectedProgramId],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*, strategic_themes(id, name, color_tag), programs(id, name, portfolio_id)');
      
      if (selectedProgramId) {
        query = query.eq('primary_program_id', selectedProgramId);
      } else if (selectedPortfolioId) {
        query = query.eq('programs.portfolio_id', selectedPortfolioId);
      }
      
      const { data, error } = await query.order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId || !!selectedProgramId,
  });

  // Fetch features for Work View
  const { data: features } = useQuery({
    queryKey: ['roadmap-features', selectedPortfolioId, selectedProgramId],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select(`
          *,
          epics(id, name, strategic_themes(id, name)),
          programs(id, name, portfolio_id)
        `);
      
      if (selectedProgramId) {
        query = query.eq('program_id', selectedProgramId);
      } else if (selectedPortfolioId) {
        query = query.eq('programs.portfolio_id', selectedPortfolioId);
      }
      
      const { data, error } = await query.order('planned_start_date');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId || !!selectedProgramId,
  });

  // Calculate timeline position
  const getTimelinePosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const timelineStart = quarters[0].start;
    const timelineEnd = quarters[quarters.length - 1].end;

    if (start > timelineEnd || end < timelineStart) return null;

    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const startOffset = Math.max(0, differenceInDays(start, timelineStart));
    const duration = differenceInDays(end, start);

    return {
      left: (startOffset / totalDays) * 100,
      width: Math.min((duration / totalDays) * 100, 100),
    };
  };

  // Group items by swimlane
  const groupBySwimlane = (items: any[], type: 'epic' | 'feature') => {
    const groups: Record<string, any[]> = {};

    items?.forEach(item => {
      let key = 'Unassigned';
      
      if (swimlaneBy === 'theme') {
        if (type === 'epic') {
          key = item.strategic_themes?.name || 'Unassigned';
        } else {
          key = item.epics?.strategic_themes?.name || 'Unassigned';
        }
      } else if (swimlaneBy === 'program') {
        key = item.programs?.name || 'Unassigned';
      } else if (swimlaneBy === 'epic' && type === 'feature') {
        key = item.epics?.name || 'Unassigned';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return groups;
  };

  const renderItemBar = (item: any, type: 'epic' | 'feature') => {
    const position = getTimelinePosition(
      type === 'epic' ? item.start_date : item.planned_start_date,
      type === 'epic' ? item.end_date : item.planned_end_date
    );
    
    if (!position) return null;

    return (
      <Popover key={item.id}>
        <PopoverTrigger asChild>
          <div className="relative h-10 w-full">
            <div
              className={cn(
                "absolute h-8 rounded-md border-2 flex items-center px-2 gap-2 cursor-pointer transition-all hover:shadow-md hover:z-10",
                item.status === 'done' ? "bg-success/10 border-success hover:bg-success/20" :
                item.status === 'implementing' || item.status === 'in_progress' ? "bg-primary/10 border-primary hover:bg-primary/20" :
                item.blocked ? "bg-destructive/10 border-destructive hover:bg-destructive/20" :
                "bg-muted/50 border-border hover:bg-muted"
              )}
              style={{
                left: `${position.left}%`,
                width: `${Math.max(position.width, 5)}%`,
                minWidth: '80px',
              }}
              onClick={() => setSelectedItem(item)}
            >
              <span className="text-xs font-medium truncate flex-1">
                {item.name}
              </span>
              <HealthBadge health={item.health} />
              {type === 'feature' && item.wsjf_score && (
                <Badge variant="outline" className="text-xs shrink-0">
                  WSJF: {item.wsjf_score}
                </Badge>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-base mb-1">{item.name}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.status}</Badge>
                <HealthBadge health={item.health} />
                {item.blocked && <Badge variant="destructive">Blocked</Badge>}
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}

            <div className="space-y-2">
              {type === 'feature' && item.epics && (
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Epic:</span>
                  <span className="font-medium">{item.epics.name}</span>
                </div>
              )}

              {(item.start_date || item.planned_start_date) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Timeline:</span>
                  <span className="font-medium">
                    {format(parseISO(type === 'epic' ? item.start_date : item.planned_start_date), 'MMM d, yyyy')} - 
                    {format(parseISO(type === 'epic' ? item.end_date : item.planned_end_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              {type === 'feature' && (
                <>
                  {item.estimate_points && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Estimate:</span>
                      <span className="font-medium">{item.estimate_points} pts</span>
                    </div>
                  )}
                  
                  {item.wsjf_score && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">WSJF Score:</span>
                      <span className="font-medium">{item.wsjf_score}</span>
                    </div>
                  )}

                  <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{item.progress_pct || 0}%</span>
                    </div>
                    <Progress value={item.progress_pct || 0} className="h-2" />
                  </div>
                </>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  if (!selectedPortfolioId && !selectedProgramId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Select a Portfolio or Program to view roadmap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Portfolio Roadmap</h1>
            <p className="text-sm text-muted-foreground">
              Strategic timeline view of initiatives, epics, and features
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="work-view">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="work-view">Work View</TabsTrigger>
              <TabsTrigger value="epics">Epics Timeline</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={swimlaneBy} onValueChange={(v: any) => setSwimlaneBy(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theme">By Theme</SelectItem>
                    <SelectItem value="program">By Program</SelectItem>
                    <SelectItem value="epic">By Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarters">Quarters</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="work-view" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Features by {swimlaneBy === 'theme' ? 'Strategic Theme' : swimlaneBy === 'program' ? 'Program' : 'Epic'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6 min-w-[1000px] pr-4">
                    {/* Timeline Headers */}
                    <div className="flex gap-1 sticky top-0 bg-card z-10 pb-2 border-b">
                      {quarters.map((quarter, i) => (
                        <div
                          key={i}
                          className="flex-1 text-center"
                        >
                          <div className={cn(
                            "text-sm font-semibold rounded px-2 py-1",
                            isSameQuarter(quarter.start, today) ? "bg-primary/20" : "bg-muted"
                          )}>
                            {quarter.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(quarter.start, 'MMM d')} - {format(quarter.end, 'MMM d')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Swimlanes */}
                    {Object.entries(groupBySwimlane(features || [], 'feature')).map(([swimlane, items]) => (
                      <div key={swimlane} className="space-y-2">
                        <div className="flex items-center gap-2 sticky left-0 bg-card">
                          <div className="text-sm font-semibold text-muted-foreground min-w-[200px]">
                            {swimlane}
                          </div>
                          <div className="h-px flex-1 bg-border" />
                          <Badge variant="secondary" className="text-xs">
                            {items.length} features
                          </Badge>
                        </div>

                        <div className="relative space-y-1 min-h-[40px]">
                          {items.map(item => renderItemBar(item, 'feature'))}
                        </div>
                      </div>
                    ))}

                    {(!features || features.length === 0) && (
                      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded">
                        No features with dates in selected scope
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary/10 border-2 border-primary" />
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-success/10 border-2 border-success" />
                    <span>Done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-destructive/10 border-2 border-destructive" />
                    <span>Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted/50 border-2 border-border" />
                    <span>Planned</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="epics" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Epics by {swimlaneBy === 'theme' ? 'Strategic Theme' : 'Program'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6 min-w-[1000px] pr-4">
                    {/* Timeline Headers */}
                    <div className="flex gap-1 sticky top-0 bg-card z-10 pb-2 border-b">
                      {quarters.map((quarter, i) => (
                        <div
                          key={i}
                          className="flex-1 text-center"
                        >
                          <div className={cn(
                            "text-sm font-semibold rounded px-2 py-1",
                            isSameQuarter(quarter.start, today) ? "bg-primary/20" : "bg-muted"
                          )}>
                            {quarter.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(quarter.start, 'MMM d')} - {format(quarter.end, 'MMM d')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Swimlanes */}
                    {Object.entries(groupBySwimlane(epics || [], 'epic')).map(([swimlane, items]) => (
                      <div key={swimlane} className="space-y-2">
                        <div className="flex items-center gap-2 sticky left-0 bg-card">
                          <div className="text-sm font-semibold text-muted-foreground min-w-[200px]">
                            {swimlane}
                          </div>
                          <div className="h-px flex-1 bg-border" />
                          <Badge variant="secondary" className="text-xs">
                            {items.length} epics
                          </Badge>
                        </div>

                        <div className="relative space-y-1 min-h-[40px]">
                          {items.map(item => renderItemBar(item, 'epic'))}
                        </div>
                      </div>
                    ))}

                    {(!epics || epics.length === 0) && (
                      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded">
                        No epics with dates in selected scope
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t mt-4">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
