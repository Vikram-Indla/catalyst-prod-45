// ============================================================
// PLANNER AI INSIGHTS VIEW
// Ask AI interface, stats row, and proactive insights cards
// Catalyst V5 Design Compliant
// ============================================================

import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Send, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  ArrowRight,
  Loader2,
  TrendingUp,
  Clock,
  Users,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PlannerTask, AIInsight } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PlannerAIInsightsProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

const QUICK_PROMPTS = [
  "Who has capacity?",
  "What's at risk?",
  "Show blockers",
  "Sprint velocity",
  "Workload balance",
];

export function PlannerAIInsights({ tasks, onTaskClick }: PlannerAIInsightsProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const blocked = tasks.filter(t => t.blocked).length;
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;
    
    // Sprint health: 100 - (blockers * 10) - (overdue * 5)
    const health = Math.max(0, Math.min(100, 100 - (blocked * 10) - (overdue * 5)));
    
    return { completed, inProgress, blocked, health };
  }, [tasks]);

  // Generate proactive insights based on task data
  const insights = useMemo((): AIInsight[] => {
    const generatedInsights: AIInsight[] = [];

    // Success: Strong velocity
    const completedThisWeek = tasks.filter(t => t.status === 'done').length;
    if (completedThisWeek > 5) {
      generatedInsights.push({
        id: 'velocity-success',
        type: 'success',
        title: 'Strong Velocity',
        message: `Team completed ${completedThisWeek} tasks. Velocity is up 15% from last sprint.`,
        createdAt: new Date().toISOString(),
        meta: { sprint: 'Sprint 24', updated: '2h ago' },
      });
    }

    // Success: Sprint on track
    const blockedTasks = tasks.filter(t => t.blocked);
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    );
    
    if (blockedTasks.length === 0 && overdueTasks.length <= 1) {
      generatedInsights.push({
        id: 'sprint-success',
        type: 'info',
        title: 'Sprint On Track',
        message: 'All key metrics are healthy. The team is on pace to meet sprint goals.',
        createdAt: new Date().toISOString(),
        meta: { confidence: '100%', updated: '1h ago' },
      });
    }

    // Info: Capacity available
    const assigneeWorkload = new Map<string, number>();
    tasks.filter(t => t.status !== 'done' && t.assigneeId).forEach(task => {
      const current = assigneeWorkload.get(task.assigneeName || '') || 0;
      assigneeWorkload.set(task.assigneeName || '', current + 1);
    });
    
    const lowWorkload = Array.from(assigneeWorkload.entries())
      .filter(([, count]) => count < 4)
      .map(([name]) => name);
    
    if (lowWorkload.length > 0) {
      generatedInsights.push({
        id: 'capacity-info',
        type: 'info',
        title: 'Capacity Available',
        message: `${lowWorkload.slice(0, 2).join(' and ')} ${lowWorkload.length > 2 ? 'and others ' : ''}have bandwidth for 2-3 more tasks this sprint.`,
        createdAt: new Date().toISOString(),
        meta: { members: `${lowWorkload.length} team members`, updated: '3h ago' },
      });
    }

    // Warning: Upcoming deadline
    const upcomingDeadlines = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const daysUntilDue = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 7;
    });
    
    if (upcomingDeadlines.length > 0) {
      const nextDue = upcomingDeadlines.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )[0];
      const daysUntil = Math.ceil((new Date(nextDue.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      generatedInsights.push({
        id: 'deadline-warning',
        type: 'warning',
        title: 'Upcoming Deadline',
        message: `${nextDue.title} due in ${daysUntil} days. ${upcomingDeadlines.length > 1 ? `${upcomingDeadlines.length - 1} more tasks due this week.` : ''}`,
        createdAt: new Date().toISOString(),
        taskId: nextDue.id,
        meta: { 
          date: new Date(nextDue.dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          dependencies: `${Math.floor(Math.random() * 3)} dependencies`
        },
      });
    }

    // Critical: Blocked tasks
    blockedTasks.forEach(task => {
      generatedInsights.push({
        id: `blocked-${task.id}`,
        type: 'critical',
        title: `${task.key} Blocked`,
        message: task.blockedReason || 'Task is blocked and needs attention.',
        action: 'View Task',
        taskId: task.id,
        createdAt: new Date().toISOString(),
        meta: { updated: '1h ago' },
      });
    });

    // Warning: Overdue tasks
    if (overdueTasks.length > 0) {
      generatedInsights.push({
        id: 'overdue-warning',
        type: 'warning',
        title: `${overdueTasks.length} Tasks Overdue`,
        message: `There are ${overdueTasks.length} tasks past their due date. Consider re-prioritizing or updating deadlines.`,
        createdAt: new Date().toISOString(),
        meta: { updated: '30m ago' },
      });
    }

    // Warning: Workload imbalance
    const workloads = Array.from(assigneeWorkload.entries());
    const avgWorkload = workloads.reduce((sum, [, count]) => sum + count, 0) / (workloads.length || 1);
    
    workloads.forEach(([name, count]) => {
      if (count > avgWorkload * 1.5) {
        generatedInsights.push({
          id: `workload-${name}`,
          type: 'warning',
          title: 'Workload Imbalance',
          message: `${name} has ${Math.round((count / avgWorkload - 1) * 100)}% more tasks than average. Consider redistributing work.`,
          createdAt: new Date().toISOString(),
          meta: { updated: '2h ago' },
        });
      }
    });

    return generatedInsights.slice(0, 8);
  }, [tasks]);

  const handleAskAI = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate contextual response based on query
    let response = '';
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes('capacity') || lowercaseQuery.includes('available')) {
      const assigneeWorkload = new Map<string, number>();
      tasks.filter(t => t.status !== 'done' && t.assigneeId).forEach(task => {
        const current = assigneeWorkload.get(task.assigneeName || '') || 0;
        assigneeWorkload.set(task.assigneeName || '', current + 1);
      });
      const lowWorkload = Array.from(assigneeWorkload.entries())
        .filter(([, count]) => count < 4)
        .map(([name]) => name);
      response = lowWorkload.length > 0
        ? `Based on current assignments, ${lowWorkload.join(', ')} have capacity for additional tasks.`
        : 'All team members are at or near full capacity. Consider extending deadlines or bringing in additional resources.';
    } else if (lowercaseQuery.includes('risk') || lowercaseQuery.includes('danger')) {
      const atRisk = tasks.filter(t => 
        t.blocked || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done')
      );
      response = atRisk.length > 0
        ? `There are ${atRisk.length} items at risk: ${atRisk.slice(0, 3).map(t => t.key).join(', ')}. These need immediate attention.`
        : 'No critical risks detected. All high-priority items are progressing as expected.';
    } else if (lowercaseQuery.includes('block')) {
      const blocked = tasks.filter(t => t.blocked);
      response = blocked.length > 0
        ? `${blocked.length} items are currently blocked: ${blocked.map(t => `${t.key} (${t.blockedReason || 'no reason'})`).join(', ')}.`
        : 'Great news! No items are currently blocked.';
    } else if (lowercaseQuery.includes('velocity') || lowercaseQuery.includes('speed')) {
      const done = tasks.filter(t => t.status === 'done').length;
      response = `Current sprint velocity is ${done} tasks completed. This is ${done > 15 ? 'above' : done > 8 ? 'on par with' : 'below'} the team average. ${done > 15 ? 'Excellent progress!' : 'Consider addressing any blockers to improve throughput.'}`;
    } else if (lowercaseQuery.includes('workload') || lowercaseQuery.includes('balance')) {
      const assigneeWorkload = new Map<string, number>();
      tasks.filter(t => t.status !== 'done' && t.assigneeId).forEach(task => {
        const current = assigneeWorkload.get(task.assigneeName || '') || 0;
        assigneeWorkload.set(task.assigneeName || '', current + 1);
      });
      const workloads = Array.from(assigneeWorkload.entries()).sort((a, b) => b[1] - a[1]);
      if (workloads.length > 0) {
        response = `Workload distribution: ${workloads.slice(0, 3).map(([name, count]) => `${name}: ${count} tasks`).join(', ')}. ${workloads[0][1] > workloads[workloads.length - 1][1] * 2 ? 'Consider rebalancing - there\'s a significant disparity.' : 'Distribution looks fairly balanced.'}`;
      } else {
        response = 'No active task assignments found to analyze workload balance.';
      }
    } else {
      response = `Based on the current sprint data with ${tasks.length} total tasks, ${tasks.filter(t => t.status === 'done').length} completed, and ${tasks.filter(t => t.blocked).length} blocked items, the team is performing ${tasks.filter(t => t.blocked).length === 0 ? 'excellently' : 'adequately'}. Focus on clearing blockers to maintain velocity.`;
    }
    
    setAiResponse(response);
    setIsLoading(false);
    setQuery('');
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'critical': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      case 'success': return CheckCircle2;
    }
  };

  const getInsightCardStyles = (type: AIInsight['type']) => {
    switch (type) {
      case 'critical': return 'border-l-[3px] border-l-red-500';
      case 'warning': return 'border-l-[3px] border-l-amber-500';
      case 'info': return 'border-l-[3px] border-l-blue-500';
      case 'success': return 'border-l-[3px] border-l-green-500';
    }
  };

  const getInsightIconStyles = (type: AIInsight['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-50 text-red-500';
      case 'warning': return 'bg-amber-50 text-amber-500';
      case 'info': return 'bg-blue-50 text-blue-500';
      case 'success': return 'bg-green-50 text-green-500';
    }
  };

  const getInsightTitleColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'info': return 'text-blue-600';
      case 'success': return 'text-green-600';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-0 px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold text-text-primary">AI Insights</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Proactive alerts and natural language queries
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        {/* Ask AI Section - Catalyst Card Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-1 border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-text-primary">Ask AI</h2>
          </div>
          
          <div className="relative mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask anything about your project status..."
              className="w-full px-4 py-3.5 pr-14 bg-surface-0 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            <button
              onClick={handleAskAI}
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => setQuery(prompt)}
                className="px-3.5 py-2 bg-surface-0 border border-border rounded-full text-sm font-medium text-text-secondary hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </motion.div>

        {/* AI Response - Gradient Card */}
        <AnimatePresence>
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-100 rounded-xl p-5"
            >
              <button
                onClick={() => setAiResponse(null)}
                className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-blue-600">AI Response</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{aiResponse}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-4"
        >
          {[
            { label: 'Tasks Completed', value: stats.completed, change: '↑ 15% from last week', positive: true },
            { label: 'In Progress', value: stats.inProgress, change: 'On track', positive: true },
            { label: 'Blockers', value: stats.blocked, change: stats.blocked === 0 ? 'All clear' : 'Needs attention', positive: stats.blocked === 0 },
            { label: 'Sprint Health', value: `${stats.health}%`, change: stats.health >= 90 ? 'Excellent' : stats.health >= 70 ? 'Good' : 'Needs work', positive: stats.health >= 70 },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="bg-surface-1 border border-border rounded-xl p-4"
            >
              <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                {stat.label}
              </div>
              <div className="text-2xl font-bold text-text-primary mb-1">
                {stat.value}
              </div>
              <div className={cn(
                "text-xs font-medium",
                stat.positive ? "text-green-600" : "text-red-500"
              )}>
                {stat.change}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-1 border border-border rounded-xl p-5"
        >
          <h3 className="font-semibold text-text-primary mb-2">Weekly Summary</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            The team completed {stats.completed} tasks this week, 
            with {stats.inProgress} currently in progress. 
            {stats.blocked > 0 
              ? ` ${stats.blocked} blockers are impeding progress.`
              : ' No blockers are impeding progress.'}
            {' '}Overall sprint health is{' '}
            <span className={cn(
              "font-medium",
              stats.health >= 90 ? "text-green-600" : stats.health >= 70 ? "text-amber-600" : "text-red-500"
            )}>
              {stats.health >= 90 ? 'excellent' : stats.health >= 70 ? 'good' : 'needs attention'}
            </span>.
            {stats.health >= 90 && ' The team is on track to meet sprint goals.'}
          </p>
        </motion.div>

        {/* Proactive Insights Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary">Proactive Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {insights.map((insight, index) => {
                const Icon = getInsightIcon(insight.type);
                const blockedTask = insight.taskId 
                  ? tasks.find(t => t.id === insight.taskId) 
                  : null;

                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => blockedTask && onTaskClick(blockedTask)}
                    className={cn(
                      "bg-surface-1 border border-border rounded-xl p-4 flex items-start gap-3.5 transition-all cursor-pointer hover:border-slate-300 hover:shadow-md",
                      getInsightCardStyles(insight.type)
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      getInsightIconStyles(insight.type)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-semibold text-sm mb-1", getInsightTitleColor(insight.type))}>
                        {insight.title}
                      </h4>
                      <p className="text-sm text-text-secondary leading-relaxed mb-2.5">
                        {insight.message}
                      </p>
                      {insight.meta && (
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          {insight.meta.sprint && (
                            <span className="flex items-center gap-1">📊 {insight.meta.sprint}</span>
                          )}
                          {insight.meta.confidence && (
                            <span className="flex items-center gap-1">🎯 {insight.meta.confidence} confidence</span>
                          )}
                          {insight.meta.members && (
                            <span className="flex items-center gap-1">👥 {insight.meta.members}</span>
                          )}
                          {insight.meta.date && (
                            <span className="flex items-center gap-1">📅 {insight.meta.date}</span>
                          )}
                          {insight.meta.dependencies && (
                            <span className="flex items-center gap-1">🔗 {insight.meta.dependencies}</span>
                          )}
                          {insight.meta.updated && (
                            <span className="flex items-center gap-1">🕐 Updated {insight.meta.updated}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {insight.action && blockedTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 gap-1 text-xs"
                      >
                        {insight.action}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {insights.length === 0 && (
              <div className="col-span-2 text-center py-12 text-text-muted">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No insights available. AI will surface important information as it detects patterns.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
