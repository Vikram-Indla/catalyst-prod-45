/**
 * UserActivityGrid Component
 * Displays aggregated user activity in a table with clickable cells
 */

import React from 'react';
import { 
  FileText, 
  Edit3, 
  Zap, 
  UserPlus, 
  CheckSquare, 
  Clock, 
  Bug,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ActivityAggregate, ActivityType, TimeGrouping } from '../../hooks/useUserActivity';

interface UserActivityGridProps {
  data: ActivityAggregate[];
  isLoading: boolean;
  groupBy: TimeGrouping;
  activeTypes: ActivityType[];
  onCellClick: (userId: string, userName: string, activityType: ActivityType, periodStart: string) => void;
}

const COLUMN_CONFIG: { 
  type: ActivityType; 
  key: keyof ActivityAggregate; 
  label: string; 
  icon: React.ReactNode;
  color: string;
}[] = [
  { type: 'case_created', key: 'casesCreated', label: 'Created', icon: <FileText className="h-3 w-3" />, color: 'text-green-500' },
  { type: 'case_updated', key: 'casesUpdated', label: 'Updated', icon: <Edit3 className="h-3 w-3" />, color: 'text-blue-500' },
  { type: 'case_automated', key: 'casesAutomated', label: 'Automated', icon: <Zap className="h-3 w-3" />, color: 'text-purple-500' },
  { type: 'case_assigned', key: 'casesAssigned', label: 'Assigned', icon: <UserPlus className="h-3 w-3" />, color: 'text-cyan-500' },
  { type: 'run_executed', key: 'runsExecuted', label: 'Runs', icon: <CheckSquare className="h-3 w-3" />, color: 'text-emerald-500' },
  { type: 'effort_logged', key: 'effortHours', label: 'Effort (h)', icon: <Clock className="h-3 w-3" />, color: 'text-orange-500' },
  { type: 'defect_discovered', key: 'defectsDiscovered', label: 'Defects', icon: <Bug className="h-3 w-3" />, color: 'text-red-500' },
];

export function UserActivityGrid({
  data,
  isLoading,
  groupBy,
  activeTypes,
  onCellClick,
}: UserActivityGridProps) {
  const visibleColumns = COLUMN_CONFIG.filter(c => activeTypes.includes(c.type));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="h-12 w-12 text-text-tertiary mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No Activity Found</h3>
        <p className="text-text-tertiary max-w-md">
          No activity matches your selected filters. Try adjusting the date range, users, or activity types.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-1 hover:bg-surface-1">
            <TableHead className="text-text-secondary font-medium w-48">User</TableHead>
            {groupBy !== 'none' && (
              <TableHead className="text-text-secondary font-medium w-40">Period</TableHead>
            )}
            {visibleColumns.map(col => (
              <TableHead 
                key={col.type} 
                className="text-text-secondary font-medium text-center w-24"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className={col.color}>{col.icon}</span>
                  <span className="text-xs">{col.label}</span>
                </div>
              </TableHead>
            ))}
            <TableHead className="text-text-secondary font-medium text-center w-24">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">Total</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow 
              key={`${row.userId}-${row.periodStart}-${idx}`}
              className="hover:bg-surface-hover transition-colors"
            >
              <TableCell className="font-medium text-text-primary">
                <div className="flex flex-col">
                  <span className="truncate max-w-[180px]">{row.userName}</span>
                  <span className="text-xs text-text-tertiary truncate max-w-[180px]">
                    {row.userEmail}
                  </span>
                </div>
              </TableCell>
              {groupBy !== 'none' && (
                <TableCell className="text-text-secondary text-sm">
                  {row.period}
                </TableCell>
              )}
              {visibleColumns.map(col => {
                const value = row[col.key];
                const numValue = typeof value === 'number' ? value : 0;
                const displayValue = col.key === 'effortHours' && typeof value === 'number'
                  ? value.toFixed(1)
                  : numValue;

                return (
                  <TableCell key={col.type} className="text-center">
                    {numValue > 0 ? (
                      <button
                        onClick={() => onCellClick(row.userId, row.userName, col.type, row.periodStart)}
                        className={cn(
                          'inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md transition-colors',
                          'hover:bg-accent-primary/10 hover:text-accent-primary cursor-pointer',
                          'text-text-primary font-medium'
                        )}
                      >
                        <span>{displayValue}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <span className="text-text-tertiary">-</span>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="text-center">
                <Badge 
                  variant="secondary" 
                  className="font-semibold"
                >
                  {row.totalActions}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
