import { useBacklogState } from '../hooks/useBacklogState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Columns, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BacklogScope, BacklogType, BacklogViewType, TimeboxType } from '../types';

interface BacklogHeaderProps {
  onOpenFilters: () => void;
  onOpenColumns: () => void;
}

export function BacklogHeader({ onOpenFilters, onOpenColumns }: BacklogHeaderProps) {
  const {
    scope,
    type,
    timeboxType,
    timeboxId,
    view,
    setScope,
    setType,
    setTimebox,
    setView,
    isEpicBacklog,
  } = useBacklogState();

  // Fetch Program Increments for PI selector (only when NOT in Epic Backlog mode)
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('id, name, start_date')
        .order('start_date', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !isEpicBacklog,
  });

  // Fetch Sprints for sprint selector (only when NOT in Epic Backlog mode)
  const { data: sprints } = useQuery({
    queryKey: ['iterations-sprints'],
    queryFn: async () => {
      const { data } = await supabase
        .from('iterations')
        .select('id, name, start_date')
        .order('start_date', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !isEpicBacklog,
  });

  // Get allowed types based on scope
  const getAllowedTypes = (scope: BacklogScope): BacklogType[] => {
    switch (scope) {
      case 'enterprise':
      case 'portfolio':
        return ['theme', 'epic', 'capability', 'objective'];
      case 'program':
        return ['epic', 'capability', 'feature', 'objective'];
      case 'team':
        return ['story', 'defect', 'objective'];
      default:
        return ['epic'];
    }
  };

  const allowedTypes = getAllowedTypes(scope);

  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 sm:px-6 py-3">
      {/* Left side: Title + Badge + View Selector */}
      <div className="flex items-center gap-3">
        {/* Scope Selector - Hidden in Epic Backlog mode */}
        {!isEpicBacklog && (
          <Select value={scope} onValueChange={(val) => setScope(val as BacklogScope)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="portfolio">Portfolio</SelectItem>
              <SelectItem value="solution">Solution</SelectItem>
              <SelectItem value="program">Program</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Epic Backlog Title - shown only in Epic Backlog mode */}
        {isEpicBacklog && (
          <>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">Epic Backlog</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
              Epics
            </span>
          </>
        )}

        {/* Viewing Dropdown (Type Selector) - HIDDEN in Epic Backlog mode */}
        {!isEpicBacklog && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Viewing:</span>
            <Select value={type} onValueChange={(val) => setType(val as BacklogType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {allowedTypes.includes('theme') && (
                  <SelectItem value="theme">Themes</SelectItem>
                )}
                {allowedTypes.includes('epic') && (
                  <SelectItem value="epic">Epics</SelectItem>
                )}
                {allowedTypes.includes('capability') && (
                  <SelectItem value="capability">Capabilities</SelectItem>
                )}
                {allowedTypes.includes('feature') && (
                  <SelectItem value="feature">Features</SelectItem>
                )}
                {allowedTypes.includes('story') && (
                  <SelectItem value="story">Stories</SelectItem>
                )}
                {allowedTypes.includes('defect') && (
                  <SelectItem value="defect">Defects</SelectItem>
                )}
                {allowedTypes.includes('objective') && (
                  <SelectItem value="objective">Objectives</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Time Dropdown - HIDDEN in Epic Backlog mode (no PI terminology) */}
        {!isEpicBacklog && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Time:</span>
            <Select value={timeboxType} onValueChange={(val) => setTimebox(val as TimeboxType, null)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pi">PI</SelectItem>
                <SelectItem value="sprint">Sprint</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Specific PI/Sprint Selector */}
            {timeboxType === 'pi' && (
              <Select value={timeboxId || 'all-pis'} onValueChange={(val) => setTimebox('pi', val === 'all-pis' ? null : val)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all-pis">All PIs</SelectItem>
                  {programIncrements?.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {timeboxType === 'sprint' && (
              <Select value={timeboxId || 'all-sprints'} onValueChange={(val) => setTimebox('sprint', val === 'all-sprints' ? null : val)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Sprint" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all-sprints">All Sprints</SelectItem>
                  {sprints?.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* View Selector */}
        <Select value={view} onValueChange={(val) => setView(val as BacklogViewType)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="list">List View</SelectItem>
            <SelectItem value="state">State View</SelectItem>
            <SelectItem value="processFlow">Process Flow</SelectItem>
            <SelectItem value="column">Column View</SelectItem>
            {!isEpicBacklog && <SelectItem value="sprint">Sprint View</SelectItem>}
            {!isEpicBacklog && <SelectItem value="teamFeatures">Team Features</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Search + Filters + Columns */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search epics..."
            className="pl-9 h-9"
          />
        </div>

        {/* Filters Button */}
        <Button variant="outline" size="sm" onClick={onOpenFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>

        {/* Columns Button */}
        <Button variant="outline" size="sm" onClick={onOpenColumns}>
          <Columns className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </div>
    </div>
  );
}