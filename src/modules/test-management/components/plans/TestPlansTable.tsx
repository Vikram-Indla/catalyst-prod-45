/**
 * TestPlansTable - Table view for test plans
 * Catalyst V5 design tokens
 */

import React from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Trash2, Copy, Edit2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { TestPlanWithStats, TestPlanStatus } from '../../types/testPlans';

interface TestPlansTableProps {
  plans: TestPlanWithStats[];
  isLoading?: boolean;
  onPlanClick: (plan: TestPlanWithStats) => void;
  onEdit?: (plan: TestPlanWithStats) => void;
  onClone?: (plan: TestPlanWithStats) => void;
  onDelete?: (plan: TestPlanWithStats) => void;
  onStart?: (plan: TestPlanWithStats) => void;
}

const statusConfig: Record<TestPlanStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Draft' },
  active: { bg: 'bg-info/10', text: 'text-info', label: 'Active' },
  executing: { bg: 'bg-warning/10', text: 'text-warning', label: 'Executing' },
  completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
  archived: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Archived' },
};

export function TestPlansTable({
  plans,
  isLoading,
  onPlanClick,
  onEdit,
  onClone,
  onDelete,
  onStart,
}: TestPlansTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {['Plan', 'Status', 'Progress', 'Release', 'Owner', 'Date Range', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-4"><Skeleton className="h-12 w-64" /></td>
                <td className="px-4 py-4"><Skeleton className="h-6 w-20" /></td>
                <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-4"><Skeleton className="h-6 w-24" /></td>
                <td className="px-4 py-4"><Skeleton className="h-8 w-8 rounded-full" /></td>
                <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-4"><Skeleton className="h-8 w-8" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">No test plans found. Create your first test plan to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Release</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {plans.map((plan) => {
            const status = statusConfig[plan.status] || statusConfig.draft;
            const executed = plan.passed_count + plan.failed_count + plan.blocked_count + plan.skipped_count;
            const progressPct = plan.total_tests > 0 ? Math.round((executed / plan.total_tests) * 100) : 0;

            return (
              <tr
                key={plan.id}
                onClick={() => onPlanClick(plan)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-4">
                  <div>
                    <span className="font-mono text-sm text-primary">{plan.key}</span>
                    <p className="font-medium text-foreground">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{plan.description}</p>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full', status.bg, status.text)}>
                    {status.label}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="w-32 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progressPct}%</span>
                      <span>{executed}/{plan.total_tests}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      {plan.passed_count > 0 && (
                        <div className="bg-success h-full" style={{ width: `${(plan.passed_count / plan.total_tests) * 100}%` }} />
                      )}
                      {plan.failed_count > 0 && (
                        <div className="bg-danger h-full" style={{ width: `${(plan.failed_count / plan.total_tests) * 100}%` }} />
                      )}
                      {plan.blocked_count > 0 && (
                        <div className="bg-warning h-full" style={{ width: `${(plan.blocked_count / plan.total_tests) * 100}%` }} />
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  {plan.release ? (
                    <span className="text-sm text-foreground">{plan.release.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  {plan.owner ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={plan.owner.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {plan.owner.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{plan.owner.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  {plan.start_date || plan.end_date ? (
                    <span className="text-sm text-foreground">
                      {plan.start_date ? format(new Date(plan.start_date), 'MMM d') : '—'}
                      {' – '}
                      {plan.end_date ? format(new Date(plan.end_date), 'MMM d') : '—'}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {plan.status === 'draft' && onStart && (
                        <DropdownMenuItem onClick={() => onStart(plan)}>
                          <Play className="w-4 h-4 mr-2" />
                          Start Plan
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(plan)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onClone && (
                        <DropdownMenuItem onClick={() => onClone(plan)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(plan)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TestPlansTable;
