import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface Filters {
  cycle: string;
  environment: string;
  assignee: string;
  status: string;
  priority: string;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  cycles: { id: string; name: string }[];
  environments: string[];
  assignees: { id: string; name: string }[];
}

export function FilterBar({ filters, onFiltersChange, cycles, environments, assignees }: FilterBarProps) {
  const activeCount = Object.values(filters).filter(v => v !== 'all').length;

  const handleClear = () => {
    onFiltersChange({
      cycle: 'all',
      environment: 'all',
      assignee: 'all',
      status: 'all',
      priority: 'all',
    });
  };

  return (
    <div className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3.5 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>

      <Select value={filters.cycle} onValueChange={(v) => onFiltersChange({ ...filters, cycle: v })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Cycle" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Cycles</SelectItem>
          {cycles.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.environment} onValueChange={(v) => onFiltersChange({ ...filters, environment: v })}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Environments</SelectItem>
          {environments.map(e => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.assignee} onValueChange={(v) => onFiltersChange({ ...filters, assignee: v })}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {assignees.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v })}>
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="passed">Passed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="not-run">Not Run</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onFiltersChange({ ...filters, priority: v })}>
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs h-8 px-2 text-muted-foreground">
          <X className="w-3 h-3 mr-1" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}
