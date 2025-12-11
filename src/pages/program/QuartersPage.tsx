/**
 * Program Quarters Page - Group Epics by Quarter
 * Phase II Step 3: Time & Roadmap Alignment
 * 
 * Displays Epics grouped by their target_completion_date quarter.
 * NO PI/Portfolio dependencies.
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Search, Calendar, Star } from 'lucide-react';
import { EpicTimeBadges } from '@/components/items/epics/EpicTimeBadges';
import { groupEpicsByQuarter, getQuarterLabel, getCurrentQuarter } from '@/lib/epic-time-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EpicQuarterData {
  id: string;
  epic_key: string | null;
  name: string;
  status: string | null;
  state: string | null;
  health: string | null;
  target_completion_date: string | null;
  initiation_date: string | null;
  estimate: number | null;
  strategic_value_score: number | null;
  owner_name: string | null;
}

export default function QuartersPage() {
  const { programId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const currentQuarter = getCurrentQuarter();

  // Fetch Epics for the program
  const { data: epics, isLoading } = useQuery({
    queryKey: ['program-epics-quarters', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name, status, state, health, target_completion_date, initiation_date, estimate, strategic_value_score, owner_name')
        .eq('primary_program_id', programId)
        .is('deleted_at', null)
        .order('target_completion_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as EpicQuarterData[];
    },
    enabled: !!programId,
  });

  // Filter and group epics
  const groupedEpics = useMemo(() => {
    if (!epics) return new Map();

    let filtered = epics;

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(q) || 
        (e.epic_key || '').toLowerCase().includes(q)
      );
    }

    // Apply health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter(e => e.health === healthFilter);
    }

    return groupEpicsByQuarter(filtered);
  }, [epics, searchQuery, healthFilter]);

  // Toggle quarter expansion
  const toggleQuarter = (quarterKey: string) => {
    setExpandedQuarters(prev => {
      const next = new Set(prev);
      if (next.has(quarterKey)) {
        next.delete(quarterKey);
      } else {
        next.add(quarterKey);
      }
      return next;
    });
  };

  // Expand current quarter by default
  useMemo(() => {
    const currentKey = `${currentQuarter.year}-Q${currentQuarter.quarter}`;
    if (!expandedQuarters.has(currentKey)) {
      setExpandedQuarters(new Set([currentKey]));
    }
  }, [currentQuarter.quarter, currentQuarter.year]);

  const healthColor = (health: string | null) => {
    switch (health) {
      case 'green': return 'bg-success';
      case 'yellow': return 'bg-warning';
      case 'red': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Quarters</h1>
            <span className="text-sm text-muted-foreground">
              Epics grouped by target quarter
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
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Health" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="red">Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : groupedEpics.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>No epics found</p>
              <p className="text-sm">Epics with target completion dates will appear here grouped by quarter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedEpics.entries()).map(([quarterKey, quarterEpics]) => {
                const isExpanded = expandedQuarters.has(quarterKey);
                const displayLabel = quarterKey === 'Unscheduled' 
                  ? 'Unscheduled' 
                  : quarterKey.replace('-', ' ').replace('Q', 'Q');
                const isCurrentQuarter = quarterKey === `${currentQuarter.year}-Q${currentQuarter.quarter}`;

                return (
                  <Card key={quarterKey} className={cn(isCurrentQuarter && 'ring-2 ring-primary/30')}>
                    <CardHeader className="py-3 cursor-pointer" onClick={() => toggleQuarter(quarterKey)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <CardTitle className="text-base font-semibold">
                            {displayLabel}
                          </CardTitle>
                          {isCurrentQuarter && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                              Current Quarter
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            ({quarterEpics.length} epic{quarterEpics.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {/* Quarter summary */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {quarterEpics.length} Epic{quarterEpics.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="border rounded-lg divide-y">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                            <div className="col-span-1">ID</div>
                            <div className="col-span-5">Name</div>
                            <div className="col-span-1 text-center">Health</div>
                            <div className="col-span-2 text-center">Value Score</div>
                            <div className="col-span-2">Target Date</div>
                            <div className="col-span-1">Status</div>
                          </div>
                          
                          {/* Epic Rows */}
                          {quarterEpics.map((epic) => (
                            <div 
                              key={epic.id} 
                              className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer items-center"
                            >
                            <div className="col-span-1 font-mono text-xs text-muted-foreground">
                                {epic.epic_key || epic.id.slice(0, 8)}
                              </div>
                              <div className="col-span-5">
                                <div className="font-medium text-sm truncate">{epic.name}</div>
                                <EpicTimeBadges 
                                  targetCompletionDate={epic.target_completion_date}
                                  status={epic.status}
                                  className="mt-1"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <div className={cn('h-3 w-3 rounded-full', healthColor(epic.health))} />
                              </div>
                              <div className="col-span-2 text-center">
                                {epic.strategic_value_score !== null ? (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                                    {epic.strategic_value_score.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                              <div className="col-span-2 text-xs text-muted-foreground">
                                {epic.target_completion_date 
                                  ? format(new Date(epic.target_completion_date), 'MMM d, yyyy')
                                  : '—'}
                              </div>
                              <div className="col-span-1">
                                <span className="px-2 py-1 text-xs bg-muted rounded capitalize">
                                  {epic.status?.replace('_', ' ') || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProgramPageLayout>
  );
}
