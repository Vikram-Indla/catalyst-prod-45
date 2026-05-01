// ============================================================
// DAILY SCORECARD VIEW - Team Performance Tracker
// White card with serif title, team cards with member rows
// Uses real data from planner database
// ============================================================

import { format } from 'date-fns';
import { Clock, Loader2 } from 'lucide-react';
import { useDailyScorecardData } from '../../hooks/useDailyScorecardData';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DailyScorecardView() {
  const { data, isLoading, error } = useDailyScorecardData();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#111111]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#111111]">
        <p className="text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">Failed to load scorecard data</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 bg-slate-50 dark:bg-[#111111] min-h-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-xl shadow-md border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] overflow-hidden">
          {/* Hero Section */}
          <div className="px-8 py-7 border-b border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-[28px] font-bold text-slate-900 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] mb-1">
                  Daily Scorecard
                </h1>
                <p className="text-sm text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">
                  Task completion by team and individual • {format(data.period.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] bg-slate-100 dark:bg-[var(--ds-border,var(--ds-border, #292929))] px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span>Live data</span>
              </div>
            </div>

            {/* Summary Stats Row */}
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">{data.summary.workstreams}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase mt-1">Workstreams</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-[var(--ds-border,var(--ds-border, #2E2E2E))]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">{data.summary.totalTasks}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase mt-1">Total Tasks</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-[var(--ds-border,var(--ds-border, #2E2E2E))]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{data.summary.completed}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase mt-1">Completed</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-[var(--ds-border,var(--ds-border, #2E2E2E))]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{data.summary.overdue}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase mt-1">Overdue</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-[var(--ds-border,var(--ds-border, #2E2E2E))]" />
              <div className="text-center">
                <div className={cn(
                  "text-2xl font-bold",
                  data.summary.completionRate >= 70 ? "text-emerald-600" : data.summary.completionRate >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {data.summary.completionRate}%
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase mt-1">Completion</div>
              </div>
            </div>
          </div>

          {/* Team Cards */}
          <div className="p-6 space-y-4">
            {data.workstreams.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">
                No workstreams with assigned tasks found
              </div>
            ) : (
              data.workstreams.map(team => (
                <div key={team.id} className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] rounded-[14px] overflow-hidden hover:border-slate-300 dark:hover:border-[var(--ds-border-bold,var(--ds-border-bold, #454545))] hover:shadow-lg transition-all">
                  {/* Team Header */}
                  <div className="p-5 flex items-center gap-3.5 border-b border-slate-100 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: `linear-gradient(135deg, ${team.gradient.from}, ${team.gradient.to})` }}
                    >
                      {team.initial}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">
                        {team.name}
                      </span>
                      <div className="text-xs text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] mt-0.5">{team.memberCount} members • {team.taskCount} tasks</div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-[28px] font-bold leading-none",
                        team.completionRate >= 70 ? "text-emerald-600" : team.completionRate >= 50 ? "text-amber-600" : "text-red-600"
                      )}>
                        {team.completionRate}%
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] mt-1">Completion</div>
                    </div>
                  </div>
                  
                  {/* Member Rows */}
                  <div className="p-5 space-y-2">
                    {team.members.map(member => (
                      <div key={member.id} className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-[#111111] rounded-[10px] hover:bg-slate-100 dark:hover:bg-[var(--ds-surface-overlay,var(--ds-surface-overlay, #1F1F1F))] transition-colors">
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: member.avatarColor }}
                        >
                          {member.initials}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">
                            {member.name}
                          </span>
                          <div className="text-[11px] text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))]">{member.role}</div>
                        </div>
                        <div className="flex items-center gap-5">
                          <div className="text-center">
                            <div className="text-base font-bold text-emerald-600">{member.tasksDone}</div>
                            <div className="text-[9px] text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase">Done</div>
                          </div>
                          <div className="text-center">
                            <div className="text-base font-bold text-slate-800 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))]">{member.tasksActive}</div>
                            <div className="text-[9px] text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase">Active</div>
                          </div>
                          <div className="text-center">
                            <div className={cn("text-base font-bold", member.tasksOverdue > 0 ? "text-red-600" : "text-emerald-600")}>
                              {member.tasksOverdue}
                            </div>
                            <div className="text-[9px] text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #878787))] uppercase">Overdue</div>
                          </div>
                          <div className="w-[100px] h-1.5 bg-slate-200 dark:bg-[var(--ds-border,var(--ds-border, #2E2E2E))] rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                member.completionPercent >= 70 ? "bg-emerald-500" : member.completionPercent >= 50 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${member.completionPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
