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
  } = useBacklogState();

  // Fetch Program Increments for PI selector
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
  });

  // Fetch Sprints for sprint selector
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
    <div className="flex items-center gap-3 border-b bg-card px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)]">
      {/* Scope Selector */}
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

      {/* Viewing Dropdown (Type Selector) - Context-aware */}
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

      {/* Time Dropdown - Two-level: Type + Specific Timebox */}
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

      {/* View Selector */}
      <Select value={view} onValueChange={(val) => setView(val as BacklogViewType)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="list">List View</SelectItem>
          <SelectItem value="state">State View</SelectItem>
          <SelectItem value="processFlow">Process Flow</SelectItem>
          <SelectItem value="column">Column View</SelectItem>
          <SelectItem value="sprint">Sprint View</SelectItem>
          <SelectItem value="teamFeatures">Team Features</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-[240px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-9"
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
  );
}
