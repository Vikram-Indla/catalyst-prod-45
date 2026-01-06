// Linked Test Cases Table
import React from 'react';
import { format } from 'date-fns';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { RequirementTestLink } from '../../types/requirements';

interface LinkedTestCasesTableProps {
  links: RequirementTestLink[];
  onUnlink: (testCaseId: string) => void;
  onAddClick: () => void;
  isLoading?: boolean;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  highest: { label: 'Highest', className: 'bg-red-100 text-red-600' },
  high: { label: 'High', className: 'bg-red-100 text-red-600' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-600' },
  low: { label: 'Low', className: 'bg-teal-100 text-teal-600' },
  lowest: { label: 'Lowest', className: 'bg-slate-100 text-slate-600' },
};

const STATUS_CONFIG: Record<string, { label: string; dotClass: string }> = {
  passed: { label: 'Passed', dotClass: 'bg-teal-500' },
  failed: { label: 'Failed', dotClass: 'bg-red-500' },
  blocked: { label: 'Blocked', dotClass: 'bg-amber-500' },
  not_run: { label: 'Not Run', dotClass: 'bg-slate-300' },
};

export function LinkedTestCasesTable({
  links,
  onUnlink,
  onAddClick,
  isLoading,
}: LinkedTestCasesTableProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Linked Test Cases</span>
          <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground">
            {links.length}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={onAddClick}>
          <Plus className="w-4 h-4 mr-1" />
          Add Test Cases
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm mb-2">No test cases linked yet</p>
          <Button variant="outline" size="sm" onClick={onAddClick}>
            <Plus className="w-4 h-4 mr-1" />
            Link Test Cases
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Test Case</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Title</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Priority</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Last Execution</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map(link => {
                const priorityConfig = PRIORITY_CONFIG[link.test_case?.priority || 'medium'];
                const execStatus = link.latest_execution?.status || 'not_run';
                const statusConfig = STATUS_CONFIG[execStatus] || STATUS_CONFIG.not_run;

                return (
                  <TableRow key={link.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="text-xs font-semibold text-primary font-mono cursor-pointer hover:underline">
                        {link.test_case?.test_key || 'TC-XXX'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">
                        {link.test_case?.title || 'Unknown test case'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase', priorityConfig?.className)}>
                        {priorityConfig?.label || 'Medium'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {link.latest_execution?.executed_at
                        ? format(new Date(link.latest_execution.executed_at), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', statusConfig.dotClass)} />
                        <span className="text-sm">{statusConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onUnlink(link.test_case_id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
