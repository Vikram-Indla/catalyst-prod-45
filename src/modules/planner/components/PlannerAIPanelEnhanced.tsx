// ============================================================
// PLANNER AI PANEL - ENHANCED
// Slide-in panel with comprehensive insights view
// Shows: Summary, Overdue, Due Soon, Stale, By Team, Unassigned
// ============================================================

import { useEffect, useState } from 'react';
import { 
  X, 
  Lightbulb, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Users,
  User,
  ChevronRight,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { 
  AIInsightsResult, 
  TaskInsight, 
  TeamInsight, 
  UnassignedTask,
  TaskStatus,
} from '../types';
import { STATUS_COLORS } from '../types';

type TabType = 'overview' | 'overdue' | 'due-soon' | 'stale' | 'by-team' | 'unassigned';

interface PlannerAIPanelEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  insights: AIInsightsResult;
  onTaskClick?: (taskId: string) => void;
  onTeamClick?: (teamId: string) => void;
  onResourceClick?: (userId: string) => void;
}

export function PlannerAIPanelEnhanced({
  isOpen,
  onClose,
  insights,
  onTaskClick,
  onTeamClick,
  onResourceClick,
}: PlannerAIPanelEnhancedProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const { summary, overdueTasks, dueSoonTasks, staleTasks, byTeam, unassignedTasks, isLoading, refresh } = insights;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', count: null },
    { id: 'overdue' as const, label: 'Overdue', count: summary.overdue, color: '#ef4444' },
    { id: 'due-soon' as const, label: 'Due Soon', count: summary.dueSoon, color: '#d97706' },
    { id: 'stale' as const, label: 'Stale', count: summary.stale, color: '#6b7280' },
    { id: 'by-team' as const, label: 'By Team', count: byTeam.length, color: '#2563eb' },
    { id: 'unassigned' as const, label: 'Unassigned', count: summary.unassigned, color: '#8b5cf6' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-surface-0 shadow-2xl z-50 flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-semibold text-text-primary">AI Insights</span>
                {summary.overdue > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                    {summary.overdue}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  disabled={isLoading}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-white/50 text-text-muted transition-colors",
                    isLoading && "animate-spin"
                  )}
                  title="Refresh insights"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/50 text-text-muted transition-colors"
                  title="Close panel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2 p-3 border-b border-border bg-slate-50">
              <SummaryCard label="Overdue" value={summary.overdue} color="#ef4444" />
              <SummaryCard label="Due Soon" value={summary.dueSoon} color="#d97706" />
              <SummaryCard label="Stale" value={summary.stale} color="#6b7280" />
              <SummaryCard label="Unassigned" value={summary.unassigned} color="#8b5cf6" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-text-muted hover:bg-surface-2"
                  )}
                >
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full text-white"
                      style={{ backgroundColor: tab.color }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {activeTab === 'overview' && (
                  <OverviewTab 
                    insights={insights} 
                    onTaskClick={onTaskClick}
                    onTeamClick={onTeamClick}
                  />
                )}
                {activeTab === 'overdue' && (
                  <TaskListTab 
                    tasks={overdueTasks} 
                    emptyMessage="No overdue tasks 🎉"
                    onTaskClick={onTaskClick}
                  />
                )}
                {activeTab === 'due-soon' && (
                  <TaskListTab 
                    tasks={dueSoonTasks} 
                    emptyMessage="No tasks due soon"
                    onTaskClick={onTaskClick}
                  />
                )}
                {activeTab === 'stale' && (
                  <TaskListTab 
                    tasks={staleTasks} 
                    emptyMessage="No stale tasks"
                    onTaskClick={onTaskClick}
                  />
                )}
                {activeTab === 'by-team' && (
                  <ByTeamTab 
                    teams={byTeam} 
                    onTeamClick={onTeamClick}
                    onResourceClick={onResourceClick}
                  />
                )}
                {activeTab === 'unassigned' && (
                  <UnassignedTab 
                    tasks={unassignedTasks} 
                    onTaskClick={onTaskClick}
                  />
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-white border border-border">
      <div className="text-lg font-bold" style={{ color: value > 0 ? color : '#64748b' }}>
        {value}
      </div>
      <div className="text-[10px] text-text-muted">{label}</div>
    </div>
  );
}

function OverviewTab({ 
  insights, 
  onTaskClick,
  onTeamClick,
}: { 
  insights: AIInsightsResult; 
  onTaskClick?: (taskId: string) => void;
  onTeamClick?: (teamId: string) => void;
}) {
  const { overdueTasks, dueSoonTasks, byTeam } = insights;

  return (
    <div className="space-y-4">
      {/* Critical: Overdue */}
      {overdueTasks.length > 0 && (
        <Section 
          title="Overdue" 
          icon={<AlertCircle className="w-4 h-4 text-red-500" />}
          count={overdueTasks.length}
          color="#ef4444"
        >
          {overdueTasks.slice(0, 3).map(task => (
            <TaskInsightCard key={task.id} task={task} onClick={() => onTaskClick?.(task.taskId)} />
          ))}
          {overdueTasks.length > 3 && (
            <div className="text-xs text-text-muted text-center py-1">
              +{overdueTasks.length - 3} more
            </div>
          )}
        </Section>
      )}

      {/* Warning: Due Soon */}
      {dueSoonTasks.length > 0 && (
        <Section 
          title="Due Soon" 
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          count={dueSoonTasks.length}
          color="#d97706"
        >
          {dueSoonTasks.slice(0, 3).map(task => (
            <TaskInsightCard key={task.id} task={task} onClick={() => onTaskClick?.(task.taskId)} />
          ))}
        </Section>
      )}

      {/* By Team Summary */}
      {byTeam.length > 0 && (
        <Section 
          title="By Team" 
          icon={<Users className="w-4 h-4 text-blue-500" />}
          count={byTeam.length}
          color="#2563eb"
        >
          {byTeam.slice(0, 3).map(team => (
            <TeamSummaryCard 
              key={team.teamId} 
              team={team} 
              onClick={() => onTeamClick?.(team.teamId)}
            />
          ))}
        </Section>
      )}

      {/* Empty state */}
      {overdueTasks.length === 0 && dueSoonTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <Lightbulb className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs">No urgent items to review</p>
        </div>
      )}
    </div>
  );
}

function Section({ 
  title, 
  icon, 
  count, 
  color, 
  children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span 
          className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {count}
        </span>
      </div>
      <div className="space-y-1.5 pl-6">
        {children}
      </div>
    </div>
  );
}

function TaskInsightCard({ task, onClick }: { task: TaskInsight; onClick?: () => void }) {
  const statusColor = STATUS_COLORS[task.status] || '#94a3b8';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg border border-border hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
    >
      <div className="flex items-start gap-2">
        <div 
          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted">{task.taskKey}</span>
            {task.teamName && (
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: task.teamColor || '#6b7280' }}
              >
                {task.teamName}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-text-primary truncate mt-0.5">
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className={cn(
                "text-[10px] font-medium",
                task.type === 'overdue' ? 'text-red-600' :
                task.type === 'due-soon' ? 'text-amber-600' : 'text-slate-500'
              )}
            >
              {task.dueInfo}
            </span>
            {task.assigneeName && (
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assigneeName}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

function TeamSummaryCard({ team, onClick }: { team: TeamInsight; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg border border-border hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
    >
      <div className="flex items-center gap-2">
        <div 
          className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
          style={{ backgroundColor: team.teamColor }}
        >
          {team.teamName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary">{team.teamName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-muted">{team.activeCount} active</span>
            {team.overdueCount > 0 && (
              <span className="text-[10px] text-red-600 font-medium">
                {team.overdueCount} overdue
              </span>
            )}
            {team.dueSoonCount > 0 && (
              <span className="text-[10px] text-amber-600">
                {team.dueSoonCount} due soon
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

function TaskListTab({ 
  tasks, 
  emptyMessage,
  onTaskClick,
}: { 
  tasks: TaskInsight[]; 
  emptyMessage: string;
  onTaskClick?: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <Inbox className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tasks.map(task => (
        <TaskInsightCard key={task.id} task={task} onClick={() => onTaskClick?.(task.taskId)} />
      ))}
    </div>
  );
}

function ByTeamTab({ 
  teams,
  onTeamClick,
  onResourceClick,
}: { 
  teams: TeamInsight[];
  onTeamClick?: (teamId: string) => void;
  onResourceClick?: (userId: string) => void;
}) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <Users className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No team data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map(team => (
        <div key={team.teamId} className="border border-border rounded-lg overflow-hidden">
          {/* Team Header */}
          <button
            onClick={() => onTeamClick?.(team.teamId)}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3"
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: team.teamColor }}
            >
              {team.teamName.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-text-primary">{team.teamName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-text-muted">{team.activeCount} tasks</span>
                {team.overdueCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                    {team.overdueCount} overdue
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </button>

          {/* Members */}
          {team.members.length > 0 && (
            <div className="p-2 space-y-1">
              {team.members.slice(0, 4).map(member => (
                <button
                  key={member.userId}
                  onClick={() => onResourceClick?.(member.userId)}
                  className="w-full p-2 rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.initials}
                  </div>
                  <span className="text-xs text-text-primary flex-1 text-left">{member.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-text-muted">{member.totalTasks}</span>
                    {member.overdueCount > 0 && (
                      <span className="text-red-600 font-medium">{member.overdueCount}!</span>
                    )}
                  </div>
                </button>
              ))}
              {team.members.length > 4 && (
                <div className="text-[10px] text-text-muted text-center py-1">
                  +{team.members.length - 4} more members
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UnassignedTab({ 
  tasks,
  onTaskClick,
}: { 
  tasks: UnassignedTask[];
  onTaskClick?: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <User className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">All tasks are assigned 👍</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tasks.map(task => (
        <button
          key={task.id}
          onClick={() => onTaskClick?.(task.id)}
          className="w-full text-left p-2.5 rounded-lg border border-border hover:border-purple-200 hover:bg-purple-50/50 transition-all group"
        >
          <div className="flex items-start gap-2">
            <div 
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: STATUS_COLORS[task.status] || '#94a3b8' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-muted">{task.taskKey}</span>
                {task.teamName && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {task.teamName}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-text-primary truncate mt-0.5">
                {task.title}
              </p>
              <span className="text-[10px] text-purple-600 font-medium mt-1 inline-block">
                Needs assignment
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ))}
    </div>
  );
}
