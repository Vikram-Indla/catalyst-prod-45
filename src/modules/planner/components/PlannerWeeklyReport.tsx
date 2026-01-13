// ============================================================
// PLANNER WEEKLY REPORT VIEW
// KPIs, achieved tasks, blockers, and AI summary
// ============================================================

import { useMemo } from 'react';
import { 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask } from '../types';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';

interface PlannerWeeklyReportProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

interface KPICard {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'same';
  trendValue: string;
  color: string;
  icon: React.ElementType;
}

export function PlannerWeeklyReport({ tasks, onTaskClick }: PlannerWeeklyReportProps) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const lastWeekStart = subWeeks(weekStart, 1);
  const lastWeekEnd = subWeeks(weekEnd, 1);

  // Calculate KPIs
  const kpis = useMemo((): KPICard[] => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;
    const blockedTasks = tasks.filter(t => t.blocked).length;

    return [
      {
        label: 'Total Tasks',
        value: totalTasks,
        trend: 'up',
        trendValue: '+3 from last week',
        color: '#3b82f6',
        icon: CheckCircle2,
      },
      {
        label: 'Completed',
        value: completedTasks,
        trend: 'up',
        trendValue: '↑ 15%',
        color: '#10b981',
        icon: CheckCircle2,
      },
      {
        label: 'Overdue',
        value: overdueTasks,
        trend: overdueTasks > 0 ? 'down' : 'same',
        trendValue: overdueTasks > 0 ? '↓ 50%' : 'Same',
        color: '#ef4444',
        icon: AlertTriangle,
      },
      {
        label: 'Blocked',
        value: blockedTasks,
        trend: 'same',
        trendValue: 'Same',
        color: '#d97706',
        icon: XCircle,
      },
    ];
  }, [tasks]);

  // Group tasks by category
  const categorizedTasks = useMemo(() => {
    return {
      achieved: tasks.filter(t => t.status === 'done'),
      inProgress: tasks.filter(t => t.status === 'in-progress' || t.status === 'review'),
      overdue: tasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      ),
      blocked: tasks.filter(t => t.blocked),
    };
  }, [tasks]);

  // Determine health status
  const healthStatus = useMemo(() => {
    const overdueCount = categorizedTasks.overdue.length;
    const blockedCount = categorizedTasks.blocked.length;

    if (overdueCount === 0 && blockedCount === 0) {
      return { label: 'On Track', color: 'bg-green-500' };
    } else if (overdueCount <= 2 && blockedCount <= 1) {
      return { label: 'At Risk', color: 'bg-yellow-500' };
    } else {
      return { label: 'Critical', color: 'bg-red-500' };
    }
  }, [categorizedTasks]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' }) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Weekly Report</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-medium text-white",
              healthStatus.color
            )}>
              {healthStatus.label}
            </span>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface-1 rounded-xl p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">{kpi.label}</span>
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-text-primary">{kpi.value}</span>
                  <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                    <TrendIcon trend={kpi.trend} />
                    <span>{kpi.trendValue}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 rounded-xl p-4 border border-blue-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">AI Summary</h3>
              <p className="text-sm text-blue-800">
                This week saw strong progress with {categorizedTasks.achieved.length} tasks completed. 
                {categorizedTasks.blocked.length > 0 && ` There are ${categorizedTasks.blocked.length} blocked items that need attention.`}
                {categorizedTasks.overdue.length > 0 && ` ${categorizedTasks.overdue.length} tasks are overdue and should be prioritized.`}
                {categorizedTasks.blocked.length === 0 && categorizedTasks.overdue.length === 0 && ' Great job keeping everything on track!'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Achieved This Week */}
        {categorizedTasks.achieved.length > 0 && (
          <ReportSection
            title="✅ Achieved This Week"
            titleColor="text-green-700"
            bgColor="bg-green-50"
            borderColor="border-green-200"
          >
            {categorizedTasks.achieved.slice(0, 5).map(task => (
              <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </ReportSection>
        )}

        {/* In Progress */}
        {categorizedTasks.inProgress.length > 0 && (
          <ReportSection
            title="🔄 In Progress"
            titleColor="text-blue-700"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
          >
            {categorizedTasks.inProgress.slice(0, 5).map(task => (
              <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} showProgress />
            ))}
          </ReportSection>
        )}

        {/* Overdue */}
        {categorizedTasks.overdue.length > 0 && (
          <ReportSection
            title="⚠️ Overdue"
            titleColor="text-red-700"
            bgColor="bg-red-50"
            borderColor="border-red-200"
          >
            {categorizedTasks.overdue.map(task => (
              <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} showDaysOverdue />
            ))}
          </ReportSection>
        )}

        {/* Blockers */}
        {categorizedTasks.blocked.length > 0 && (
          <ReportSection
            title="🚫 Blockers"
            titleColor="text-orange-700"
            bgColor="bg-orange-50"
            borderColor="border-orange-200"
          >
            {categorizedTasks.blocked.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)} 
                showBlockedReason 
              />
            ))}
          </ReportSection>
        )}
      </div>
    </div>
  );
}

// Helper Components
function ReportSection({
  title,
  titleColor,
  bgColor,
  borderColor,
  children,
}: {
  title: string;
  titleColor: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border overflow-hidden", borderColor)}
    >
      <div className={cn("px-4 py-2", bgColor)}>
        <h3 className={cn("font-semibold", titleColor)}>{title}</h3>
      </div>
      <div className="bg-white divide-y divide-border">
        {children}
      </div>
    </motion.div>
  );
}

function TaskRow({
  task,
  onClick,
  showProgress,
  showDaysOverdue,
  showBlockedReason,
}: {
  task: PlannerTask;
  onClick: () => void;
  showProgress?: boolean;
  showDaysOverdue?: boolean;
  showBlockedReason?: boolean;
}) {
  const daysOverdue = task.dueDate 
    ? Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 hover:bg-surface-1 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
          {showBlockedReason && task.blockedReason && (
            <p className="text-xs text-red-600 mt-0.5">{task.blockedReason}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {showProgress && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">{task.progress}%</span>
          </div>
        )}
        {showDaysOverdue && daysOverdue > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
            {daysOverdue} days overdue
          </span>
        )}
        {task.assigneeName && (
          <span className="text-xs text-text-muted">{task.assigneeName}</span>
        )}
      </div>
    </div>
  );
}
