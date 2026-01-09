/**
 * Cases Card Grid Component
 * Grid view for test cases with card layout
 */

import {
  FileText,
  Sparkles,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  PlayCircle,
  Link2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TestCase, CaseStatus } from '../../api/types';
import { formatDistanceToNow } from 'date-fns';

interface CasesCardGridProps {
  cases: TestCase[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (testCase: TestCase) => void;
  onEdit: (testCase: TestCase) => void;
  onDuplicate: (testCase: TestCase) => void;
  onDelete: (testCase: TestCase) => void;
  onAddToCycle: (testCase: TestCase) => void;
}

const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-muted' },
  ready: { label: 'Ready', className: 'bg-success/10 text-success border-success/20' },
  approved: { label: 'Approved', className: 'bg-info/10 text-info border-info/20' },
  needs_update: { label: 'Needs Update', className: 'bg-warning/10 text-warning border-warning/20' },
  deprecated: { label: 'Deprecated', className: 'bg-danger/10 text-danger border-danger/20' },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-400',
  low: 'bg-green-500',
};

export function CasesCardGrid({
  cases,
  isLoading,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onEdit,
  onDuplicate,
  onDelete,
  onAddToCycle,
}: CasesCardGridProps) {
  const toggleOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="h-12 w-12 opacity-50 mb-3" />
        <p className="text-lg font-medium">No test cases found</p>
        <p className="text-sm">Create a new test case to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {cases.map((testCase) => {
        const isSelected = selectedIds.has(testCase.id);
        const statusConfig = STATUS_CONFIG[testCase.status] || STATUS_CONFIG.draft;
        const linkedCount = (testCase as any).linked_items?.length || 0;

        return (
          <div
            key={testCase.id}
            className={cn(
              'border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg',
              isSelected 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => onRowClick(testCase)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(e) => toggleOne(testCase.id, e as unknown as React.MouseEvent)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${testCase.case_key}`}
                />
                <span className="font-mono text-sm text-primary font-medium">
                  {testCase.case_key}
                </span>
                {testCase.is_ai_generated && (
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                )}
              </div>
              <Badge variant="outline" className={cn('text-[10px]', statusConfig.className)}>
                {statusConfig.label}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="font-medium text-sm line-clamp-2 mb-3 min-h-[2.5rem]">
              {testCase.title}
            </h3>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                {/* Priority */}
                {testCase.priority && (
                  <div className="flex items-center gap-1">
                    <div
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        PRIORITY_COLORS[testCase.priority.name?.toLowerCase()] || 'bg-muted'
                      )}
                      style={{ backgroundColor: testCase.priority.color }}
                    />
                  </div>
                )}
                
                {/* Assignee */}
                {(testCase as any).assigned_user ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={(testCase as any).assigned_user.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {(testCase as any).assigned_user.full_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Linked items */}
                {linkedCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    {linkedCount}
                  </div>
                )}
                
                {/* Relative time */}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: false })}
                </span>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(testCase)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(testCase)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddToCycle(testCase)}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Add to Cycle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(testCase)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
