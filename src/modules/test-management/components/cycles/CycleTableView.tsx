/**
 * CycleTableView - Table view for test cycles with selection, sorting, and pagination
 * Based on Catalyst V5 Phase 5 spec
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  MoreVertical, 
  ArrowUpDown,
  RefreshCw,
  Zap,
  CheckCircle2,
  XOctagon,
  Clock
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TestCycle } from '../../api/types';

interface CycleTableViewProps {
  cycles: TestCycle[];
  selectedIds: string[];
  onSelectAll: (selected: boolean) => void;
  onSelectCycle: (id: string, selected: boolean) => void;
  onCycleClick?: (cycle: TestCycle) => void;
  onEdit?: (cycle: TestCycle) => void;
  onClone?: (cycle: TestCycle) => void;
  onDelete?: (cycle: TestCycle) => void;
  onSort?: (column: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  planned: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Not Started', icon: Clock },
  active: { bg: 'bg-info/10', text: 'text-info', label: 'In Progress', icon: Zap },
  completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed', icon: CheckCircle2 },
  cancelled: { bg: 'bg-danger/10', text: 'text-danger', label: 'Blocked', icon: XOctagon },
};

export function CycleTableView({
  cycles,
  selectedIds,
  onSelectAll,
  onSelectCycle,
  onCycleClick,
  onEdit,
  onClone,
  onDelete,
  onSort,
  sortColumn = 'title',
  sortDirection = 'asc',
}: CycleTableViewProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(cycles.length / pageSize);

  const paginatedCycles = cycles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
    const Icon = config.icon;
    return (
      <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1', config.bg, config.text)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getProgressBar = (cycle: TestCycle) => {
    const stats = cycle.statistics || { total_cases: 0, passed_count: 0, failed_count: 0, blocked_count: 0, not_run_count: 0 };
    const total = stats.total_cases || 1;
    const executed = total - stats.not_run_count;
    const percentage = Math.round((executed / total) * 100);
    
    const passedPct = (stats.passed_count / total) * 100;
    const failedPct = (stats.failed_count / total) * 100;
    const blockedPct = (stats.blocked_count / total) * 100;

    return (
      <div className="w-32">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{percentage}%</span>
          <span>{executed}/{total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          {stats.passed_count > 0 && (
            <div className="bg-success h-full" style={{ width: `${passedPct}%` }} />
          )}
          {stats.failed_count > 0 && (
            <div className="bg-danger h-full" style={{ width: `${failedPct}%` }} />
          )}
          {stats.blocked_count > 0 && (
            <div className="bg-warning h-full" style={{ width: `${blockedPct}%` }} />
          )}
        </div>
      </div>
    );
  };

  const getCycleIcon = (status: string) => {
    const config: Record<string, { bg: string; icon: React.ElementType; iconColor: string }> = {
      planned: { bg: 'bg-muted', icon: Clock, iconColor: 'text-muted-foreground' },
      active: { bg: 'bg-info/10', icon: RefreshCw, iconColor: 'text-info' },
      completed: { bg: 'bg-success/10', icon: CheckCircle2, iconColor: 'text-success' },
      cancelled: { bg: 'bg-danger/10', icon: XOctagon, iconColor: 'text-danger' },
    };
    const { bg, icon: Icon, iconColor } = config[status] || config.planned;
    return (
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
    );
  };

  const getDaysLeft = (cycle: TestCycle) => {
    if (cycle.status === 'completed') {
      return <span className="text-success">Completed</span>;
    }
    if (cycle.status === 'cancelled') {
      return <span className="text-danger">Cancelled</span>;
    }
    if (!cycle.planned_end) {
      return <span className="text-muted-foreground">No deadline</span>;
    }
    const daysLeft = differenceInDays(new Date(cycle.planned_end), new Date());
    if (daysLeft < 0) {
      return <span className="text-danger">{Math.abs(daysLeft)} days overdue</span>;
    }
    if (daysLeft <= 2) {
      return <span className="text-danger">{daysLeft} days left</span>;
    }
    return <span className="text-muted-foreground">{daysLeft} days left</span>;
  };

  const handleRowClick = (cycle: TestCycle) => {
    if (onCycleClick) {
      onCycleClick(cycle);
    } else {
      navigate(`/tests/cycles/${cycle.id}`);
    }
  };

  const allSelected = paginatedCycles.length > 0 && paginatedCycles.every(c => selectedIds.includes(c.id));
  const someSelected = paginatedCycles.some(c => selectedIds.includes(c.id)) && !allSelected;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <table className="w-full" role="grid">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="w-10 px-4 py-3">
              <Checkbox
                checked={allSelected}
                // @ts-ignore
                indeterminate={someSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                aria-label="Select all cycles"
              />
            </th>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => onSort?.('title')}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                Cycle
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Progress
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Date Range
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cases
            </th>
            <th className="w-10 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {paginatedCycles.map((cycle) => (
            <tr
              key={cycle.id}
              onClick={() => handleRowClick(cycle)}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              role="row"
            >
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(cycle.id)}
                  onCheckedChange={(checked) => onSelectCycle(cycle.id, !!checked)}
                  aria-label={`Select ${cycle.title}`}
                />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {getCycleIcon(cycle.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary">{cycle.cycle_key}</span>
                    </div>
                    <p className="font-medium text-foreground">{cycle.title}</p>
                    {cycle.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{cycle.description}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                {getStatusBadge(cycle.status)}
              </td>
              <td className="px-4 py-4">
                {getProgressBar(cycle)}
              </td>
              <td className="px-4 py-4">
                <div className="text-sm text-foreground">
                  {cycle.planned_start && cycle.planned_end ? (
                    <>
                      {format(new Date(cycle.planned_start), 'MMM d')} - {format(new Date(cycle.planned_end), 'MMM d')}
                    </>
                  ) : (
                    <span className="text-muted-foreground">No dates set</span>
                  )}
                </div>
                <div className="text-xs">
                  {getDaysLeft(cycle)}
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm font-medium text-foreground">
                  {cycle.statistics?.total_cases || 0}
                </span>
              </td>
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(cycle)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClone?.(cycle)}>Clone</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(cycle)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span>-
          <span className="font-medium">{Math.min(currentPage * pageSize, cycles.length)}</span> of{' '}
          <span className="font-medium">{cycles.length}</span> cycles
        </div>
        <div className="flex items-center gap-2">
          <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5) {
                if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
              }
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8"
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CycleTableView;
