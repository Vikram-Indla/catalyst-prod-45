import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { cn } from '@/lib/utils';

interface TypeSummary {
  type: string;
  total: number;
  pct: number;
}

interface Props {
  projectKey: string;
  projectName: string;
  issueCount: number;
}

const TYPE_BAR_COLORS: Record<string, string> = {
  epic: '#6554C0', story: '#36B37E', task: '#2684FF', bug: '#FF5630',
  subtask: '#2684FF', 'sub-task': '#2684FF', incident: '#FF5630',
  'production incident': '#FF5630', 'new feature': '#36B37E',
  feature: '#36B37E', improvement: '#36B37E', changes: '#FFAB00',
  'change request': '#FFAB00', question: '#6554C0', problem: '#FF5630',
  defect: '#FF5630', issue: '#2684FF', 'qa bug': '#FF5630',
  backend: '#2684FF', frontend: '#2684FF', integration: '#2684FF',
  figma: '#2684FF', 'business request': '#36B37E', 'business gap': '#FF5630',
};

function getBarColor(type: string): string {
  return TYPE_BAR_COLORS[type.toLowerCase()] || 'var(--ds-text-subtlest, #94A3B8)';
}

export function IssueBreakdownPopover({ projectKey, projectName, issueCount }: Props) {
  const [open, setOpen] = useState(false);

  // Query v_issue_counts view — pre-aggregated, no row limit issues
  const { data: typeSummaries = [], isLoading } = useQuery({
    queryKey: ['issue-breakdown', projectKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('v_issue_counts')
        .select('issue_type, cnt')
        .eq('project_key', projectKey);

      if (error || !data) return [];

      let total = 0;
      const map = new Map<string, number>();
      for (const row of data) {
        const t = row.issue_type || 'Unknown';
        const c = Number(row.cnt) || 0;
        map.set(t, (map.get(t) || 0) + c);
        total += c;
      }

      return Array.from(map.entries())
        .map(([type, count]) => ({
          type,
          total: count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
    },
    enabled: open,
    staleTime: 60_000,
  });

  const grandTotal = typeSummaries.reduce((s, t) => s + t.total, 0);

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
        className="w-[320px] p-0 bg-white dark:!bg-[var(--ds-surface-raised, #1A1A1A)] border-slate-200 dark:border-white/[0.08] shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-3.5 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate" title={projectName}>
              {projectName}
            </span>
            <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
              {projectKey}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {grandTotal > 0 ? `${grandTotal} issues across ${typeSummaries.length} types` : 'Issue breakdown'}
          </span>
        </div>

        {/* Stacked bar */}
        {grandTotal > 0 && (
          <div className="px-4 pt-2.5 pb-2">
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 gap-px">
              {typeSummaries.map(t => (
                <div
                  key={t.type}
                  style={{ width: `${t.pct}%`, backgroundColor: getBarColor(t.type), minWidth: t.pct > 0 ? 2 : 0 }}
                  className="rounded-sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Type rows */}
        <div className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-[12px] text-slate-400 dark:text-slate-500">Loading...</div>
          ) : typeSummaries.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-slate-400 dark:text-slate-500">No issues synced</div>
          ) : (
            typeSummaries.map((t, i) => (
              <div
                key={t.type}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  i < typeSummaries.length - 1 && "border-b border-slate-50 dark:border-white/[0.03]"
                )}
              >
                <JiraIssueTypeIcon issueType={t.type} size={18} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                    {t.type}
                  </div>
                  <div className="flex h-1 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mt-1">
                    <div
                      className="rounded-full"
                      style={{ width: `${t.pct}%`, backgroundColor: getBarColor(t.type), minWidth: t.pct > 0 ? 2 : 0 }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                    {t.pct}%
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-900 dark:text-white min-w-[32px] text-right">
                    {t.total}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500">
            Total Issues
          </span>
          <span className="text-[13px] font-bold tabular-nums text-slate-900 dark:text-white">
            {grandTotal}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
