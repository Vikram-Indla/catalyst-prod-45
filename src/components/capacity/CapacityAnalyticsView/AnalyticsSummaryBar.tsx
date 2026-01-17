/**
 * Analytics Summary Bar - Stats chips at top
 */

import { cn } from '@/lib/utils';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCapacityDepartments } from '@/modules/capacity-planner/hooks/useCapacityDepartments';

interface AnalyticsSummaryBarProps {
  summary: {
    available: number;
    atCapacity: number;
    overAllocated: number;
    total: number;
  };
  departmentFilter: string;
  onDepartmentChange: (dept: string) => void;
}

export function AnalyticsSummaryBar({ summary, departmentFilter, onDepartmentChange }: AnalyticsSummaryBarProps) {
  const { departments } = useCapacityDepartments();

  const currentDeptLabel = departmentFilter === 'all'
    ? 'All Departments'
    : departments.find(d => d.name.toLowerCase() === departmentFilter.toLowerCase())?.name || departmentFilter;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/50">
      {/* Stats Chips */}
      <div className="flex items-center gap-3">
        <StatChip 
          value={summary.available} 
          label="Available" 
          dotColor="bg-emerald-500" 
        />
        <StatChip 
          value={summary.atCapacity} 
          label="At Capacity" 
          dotColor="bg-blue-500" 
        />
        <StatChip 
          value={summary.overAllocated} 
          label="Over-Allocated" 
          dotColor="bg-red-500"
          pulse={summary.overAllocated > 0}
        />
      </div>

      {/* Department Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 px-4 gap-2 rounded-lg',
              departmentFilter !== 'all' && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            )}
          >
            <Filter className="h-4 w-4" />
            {currentDeptLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onDepartmentChange('all')}>
            All Departments
          </DropdownMenuItem>
          {departments.map((dept) => (
            <DropdownMenuItem 
              key={dept.id} 
              onClick={() => onDepartmentChange(dept.name.toLowerCase())}
            >
              {dept.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function StatChip({ 
  value, 
  label, 
  dotColor, 
  pulse = false 
}: { 
  value: number; 
  label: string; 
  dotColor: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/50">
      <div className="relative">
        <span className={cn('w-2 h-2 rounded-full inline-block', dotColor)} />
        {pulse && (
          <span className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping', dotColor)} />
        )}
      </div>
      <span className="font-semibold text-sm text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
