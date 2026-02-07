/**
 * TestHub Cases Table Component
 * Displays test cases in a sortable, filterable table with actions
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Copy, 
  Trash2, 
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { TMTestCase } from '@/types/test-management';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TestHubCasesTableProps {
  cases: TMTestCase[];
  projectId: string;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: Clock },
  REVIEW: { label: 'Review', variant: 'outline', icon: AlertCircle },
  APPROVED: { label: 'Approved', variant: 'default', icon: CheckCircle2 },
  DEPRECATED: { label: 'Deprecated', variant: 'destructive', icon: XCircle },
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

export function TestHubCasesTable({ cases, projectId, onRefresh }: TestHubCasesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(cases.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const allSelected = cases.length > 0 && selectedIds.size === cases.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cases.length;

  return (
    <div className="rounded-lg border border-border bg-surface-2 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
              />
            </TableHead>
            <TableHead className="w-28">Key</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-24">Priority</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-16 text-center">Steps</TableHead>
            <TableHead className="w-36">Last Updated</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map(testCase => {
            const status = statusConfig[testCase.status || 'DRAFT'] || statusConfig.DRAFT;
            const StatusIcon = status.icon;
            const priorityName = testCase.priority?.name?.toLowerCase() || 'medium';
            const priorityColor = priorityColors[priorityName] || priorityColors.medium;
            const isSelected = selectedIds.has(testCase.id);

            return (
              <TableRow
                key={testCase.id}
                className={cn(
                  'hover:bg-muted/30 cursor-pointer transition-colors',
                  isSelected && 'bg-primary/5'
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(testCase.id, checked as boolean)}
                    aria-label={`Select ${testCase.key}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm text-primary">
                  {testCase.key}
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary truncate">
                      {testCase.title}
                    </span>
                    {testCase.folder && (
                      <span className="text-xs text-muted-foreground truncate">
                        {testCase.folder.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', priorityColor)} />
                    <span className="text-sm capitalize">
                      {testCase.priority?.name || 'Medium'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-text-secondary">
                  {testCase.type?.name || 'Functional'}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {testCase.steps?.length || 0}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {testCase.updated_at 
                    ? format(new Date(testCase.updated_at), 'MMM d, yyyy')
                    : '-'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-surface-1 border-t border-border px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Move to Folder
            </Button>
            <Button variant="outline" size="sm">
              Change Status
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              Delete
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
}
