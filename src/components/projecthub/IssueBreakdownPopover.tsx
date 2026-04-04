import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { getIssueTypeBgColor } from '@/components/shared/JiraIssueTypeIcon';
import { cn } from '@/lib/utils';

interface BreakdownRow {
  issue_type: string;
  status_category: string;
  cnt: number;
}

interface TypeSummary {
  type: string;
  total: number;
  todo: number;
  in_progress: number;
  done: number;
}

interface Props {
  projectKey: string;
  projectName: string;
  issueCount: number;
}

function StatusDot({ category }: { category: 'todo' | 'in_progress' | 'done' }) {
  const colors = {
    todo: 'bg-slate-300 dark:bg-slate-600',
    in_progress: 'bg-blue-500',
    done: 'bg-green-500',
  };
  return <span className={cn('w-1.5 h-1.5 rounded-full inline-block', colors[category])} />;
}

function MiniBar({ todo, inProgress, done, total }: { todo: number; inProgress: number; done: number; total: number }) {
  if (total === 0) return null;
  const pTodo = (todo / total) * 100;
  const pProg = (inProgress / total) * 100;
  const pDone = (done / total) * 100;
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
      {pDone > 0 && <div className="bg-green-500" style={{ width: `${pDone}%` }} />}
      {pProg > 0 && <div className="bg-blue-500" style={{ width: `${pProg}%` }} />}
      {pTodo > 0 && <div className="bg-slate-300 dark:bg-slate-500" style={{ width: `${pTodo}%` }} />}
    </div>
  );
}

export function IssueBreakdownPopover({ projectKey, projectName, issueCount }: Props) {
  const [open, setOpen] = useState(false);

  const { data: breakdown, isLoading } = useQuery({
    queryKey: ['issue-breakdown', projectKey],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('get_project_issue_breakdown', {
        p_project_key: projectKey,
      });
      return (data || []) as BreakdownRow[];
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Aggregate by issue type
  const typeSummaries: TypeSummary[] = (() => {
    if (!breakdown) return [];
    const map = new Map<string, TypeSummary>();
    for (const row of breakdown) {
      const existing = map.get(row.issue_type) || {
        type: row.issue_type,
        total: 0,
        todo: 0,
        in_progress: 0,
        done: 0,
      };
      existing.total += row.cnt;
      const cat = (row.status_category || '').toLowerCase();
      if (cat.includes('done') || cat.includes('complete') || cat.includes('resolved') || cat === 'in_production') {
        existing.done += row.cnt;
      } else if (cat.includes('progress') || cat.includes('review') || cat === 'in_progress') {
        existing.in_progress += row.cnt;
      } else {
        existing.todo += row.cnt;
      }
      map.set(row.issue_type, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  const totalTodo = typeSummaries.reduce((s, t) => s + t.todo, 0);
  const totalInProgress = typeSummaries.reduce((s, t) => s + t.in_progress, 0);
  const totalDone = typeSummaries.reduce((s, t) => s + t.done, 0);
  const grandTotal = totalTodo + totalInProgress + totalDone;
  const completionPct = grandTotal > 0 ? Math.round((totalDone / grandTotal) * 100) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-full text-[12px] font-semibold tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {issueCount}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        className="w-[340px] p-0 bg-white dark:!bg-[#232019] border-slate-200 dark:border-white/[0.08] shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-3.5 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
              Issue Breakdown
            </span>
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
              {projectKey}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate" title={projectName}>
            {projectName}
          </div>
        </div>

        {/* Summary strip */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <StatusDot category="todo" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">To Do</span>
                <span className="text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{totalTodo}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot category="in_progress" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Active</span>
                <span className="text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{totalInProgress}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot category="done" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Done</span>
                <span className="text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{totalDone}</span>
              </div>
            </div>
            <span className="text-[11px] font-bold tabular-nums text-green-600 dark:text-green-400">
              {completionPct}%
            </span>
          </div>
          <MiniBar todo={totalTodo} inProgress={totalInProgress} done={totalDone} total={grandTotal} />
        </div>

        {/* Type rows */}
        <div className="max-h-[280px] overflow-y-auto">
          {isLoading ? (
            <div className="py-6 text-center text-[12px] text-slate-400 dark:text-slate-500">Loading...</div>
          ) : typeSummaries.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-slate-400 dark:text-slate-500">No issues synced</div>
          ) : (
            typeSummaries.map(t => (
              <div
                key={t.type}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <JiraIssueTypeIcon issueType={t.type} size={16} />
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">
                  {t.type}
                </span>
                <div className="flex items-center gap-2 text-[11px] tabular-nums">
                  {t.todo > 0 && (
                    <span className="text-slate-400 dark:text-slate-500">{t.todo}</span>
                  )}
                  {t.in_progress > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">{t.in_progress}</span>
                  )}
                  {t.done > 0 && (
                    <span className="text-green-600 dark:text-green-400">{t.done}</span>
                  )}
                </div>
                <span className="text-[12px] font-bold tabular-nums text-slate-900 dark:text-white min-w-[28px] text-right">
                  {t.total}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
            Total
          </span>
          <span className="text-[13px] font-bold tabular-nums text-slate-900 dark:text-white">
            {grandTotal}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
