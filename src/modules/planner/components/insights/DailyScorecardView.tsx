// ============================================================
// DAILY SCORECARD VIEW - Team Performance Tracker
// White card with serif title, team cards with member rows
// ============================================================

import { format } from 'date-fns';
import { Users, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { sampleDailyData } from '../../data/insightsMockData';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DailyScorecardView() {
  const data = sampleDailyData;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 bg-slate-50 min-h-full">
        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          {/* Hero Section */}
          <div className="px-8 py-7 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-[28px] font-bold text-slate-900 mb-1">
                  Daily Scorecard
                </h1>
                <p className="text-sm text-slate-500">
                  Task completion by team and individual • {format(data.period.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span>~2 min read</span>
              </div>
            </div>

            {/* Summary Stats Row */}
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-slate-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{data.summary.workstreams}</div>
                <div className="text-[10px] font-medium text-slate-500 uppercase mt-1">Workstreams</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{data.summary.totalTasks}</div>
                <div className="text-[10px] font-medium text-slate-500 uppercase mt-1">Total Tasks</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{data.summary.completed}</div>
                <div className="text-[10px] font-medium text-slate-500 uppercase mt-1">Completed</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{data.summary.overdue}</div>
                <div className="text-[10px] font-medium text-slate-500 uppercase mt-1">Overdue</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className={cn(
                  "text-2xl font-bold",
                  data.summary.completionRate >= 70 ? "text-emerald-600" : data.summary.completionRate >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {data.summary.completionRate}%
                </div>
                <div className="text-[10px] font-medium text-slate-500 uppercase mt-1">Completion</div>
              </div>
            </div>
          </div>

          {/* Team Cards */}
          <div className="p-6 space-y-4">
            {data.workstreams.map(team => (
              <div key={team.id} className="bg-white border border-slate-200 rounded-[14px] overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all">
                {/* Team Header */}
                <div className="p-5 flex items-center gap-3.5 border-b border-slate-100">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: `linear-gradient(135deg, ${team.gradient.from}, ${team.gradient.to})` }}
                  >
                    {team.initial}
                  </div>
                  <div className="flex-1">
                    <a href={`/planner/workstreams/${team.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                      {team.name}
                    </a>
                    <div className="text-xs text-slate-500 mt-0.5">{team.memberCount} members • {team.taskCount} tasks this period</div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-[28px] font-bold leading-none",
                      team.completionRate >= 70 ? "text-emerald-600" : team.completionRate >= 50 ? "text-amber-600" : "text-red-600"
                    )}>
                      {team.completionRate}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Completion</div>
                  </div>
                </div>
                
                {/* Member Rows */}
                <div className="p-5 space-y-2">
                  {team.members.map(member => (
                    <div key={member.id} className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-[10px] hover:bg-slate-100 transition-colors">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: member.avatarColor }}
                      >
                        {member.initials}
                      </div>
                      <div className="flex-1">
                        <a href={`/planner/resources/${member.id}`} className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                          {member.name}
                        </a>
                        <div className="text-[11px] text-slate-500">{member.role}</div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-center">
                          <div className="text-base font-bold text-emerald-600">{member.tasksDone}</div>
                          <div className="text-[9px] text-slate-500 uppercase">Done</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-bold text-slate-800">{member.tasksActive}</div>
                          <div className="text-[9px] text-slate-500 uppercase">Active</div>
                        </div>
                        <div className="text-center">
                          <div className={cn("text-base font-bold", member.tasksOverdue > 0 ? "text-red-600" : "text-emerald-600")}>
                            {member.tasksOverdue}
                          </div>
                          <div className="text-[9px] text-slate-500 uppercase">Overdue</div>
                        </div>
                        <div className="w-[100px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
