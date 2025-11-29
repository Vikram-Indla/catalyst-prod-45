import { useBacklogState } from '../hooks/useBacklogState';
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

  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
      {/* Scope Selector */}
      <Select value={scope} onValueChange={(val) => setScope(val as BacklogScope)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="enterprise">Enterprise</SelectItem>
          <SelectItem value="portfolio">Portfolio</SelectItem>
          <SelectItem value="solution">Solution</SelectItem>
          <SelectItem value="program">Program</SelectItem>
          <SelectItem value="team">Team</SelectItem>
        </SelectContent>
      </Select>

      {/* Type Selector */}
      <Select value={type} onValueChange={(val) => setType(val as BacklogType)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="theme">Themes</SelectItem>
          <SelectItem value="epic">Epics</SelectItem>
          <SelectItem value="capability">Capabilities</SelectItem>
          <SelectItem value="feature">Features</SelectItem>
          <SelectItem value="story">Stories</SelectItem>
          <SelectItem value="defect">Defects</SelectItem>
          <SelectItem value="objective">Objectives</SelectItem>
        </SelectContent>
      </Select>

      {/* Timebox Type */}
      <Select value={timeboxType} onValueChange={(val) => setTimebox(val as TimeboxType, timeboxId)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pi">PI</SelectItem>
          <SelectItem value="sprint">Sprint</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>

      {/* View Selector */}
      <Select value={view} onValueChange={(val) => setView(val as BacklogViewType)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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
