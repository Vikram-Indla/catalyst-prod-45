// ============================================================
// PLANNER AI INSIGHTS VIEW
// Ask AI interface, stats row, proactive insights, and pending items
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
  Calendar,
  Users,
  X,
  Clock,
  TrendingUp,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlannerTask, AIInsight } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface PlannerAIInsightsProps {
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}

const QUICK_PROMPTS = [
  "Who has capacity?",
  "What needs my attention?",
  "Show overdue tasks",
  "Pending approvals",
  "Initiative status",
  "Workload by team",
];

interface PendingItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'approval' | 'review' | 'overdue';
  dueLabel: string;
  dueType: 'urgent' | 'soon' | 'normal';
  taskId?: string;
}

export function PlannerAIInsights({ tasks, onTaskClick }: PlannerAIInsightsProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'done').length;
    const inReview = tasks.filter(t => t.status === 'review').length;
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;
    const completedThisMonth = tasks.filter(t => {
      if (t.status !== 'done') return false;
      const updatedAt = new Date(t.updatedAt);
      const now = new Date();
      return updatedAt.getMonth() === now.getMonth() && updatedAt.getFullYear() === now.getFullYear();
    }).length;
    
    return { openTasks, inReview, overdue, completedThisMonth };
  }, [tasks]);

  // Generate proactive insights based on task data
  const insights = useMemo((): AIInsight[] => {
    const generatedInsights: AIInsight[] = [];

    // 1. Pending Approvals (warning)
    const reviewTasks = tasks.filter(t => t.status === 'review');
    if (reviewTasks.length > 0) {
      const longPending = reviewTasks.filter(t => {
        const created = new Date(t.createdAt);
        const daysPending = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        return daysPending > 5;
      }).length;
      generatedInsights.push({
        id: 'pending-approvals',
        type: 'warning',
        title: 'Pending Approvals',
        message: `${reviewTasks.length} items waiting for approval.${longPending > 0 ? ` ${longPending} have been pending for more than 5 days.` : ''}`,
        createdAt: new Date().toISOString(),
        meta: { sprint: 'Requires action', updated: '1h ago' },
      });
    }

    // 2. Overdue Tasks (critical)
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    );
    if (overdueTasks.length > 0) {
      const mostOverdue = overdueTasks.sort((a, b) => 
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )[0];
      const daysOverdue = Math.ceil((Date.now() - new Date(mostOverdue.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
      generatedInsights.push({
        id: 'overdue-tasks',
        type: 'critical',
        title: 'Overdue Tasks',
        message: `${overdueTasks.length} tasks are past their due date. ${mostOverdue.title} is ${daysOverdue} days overdue.`,
        createdAt: new Date().toISOString(),
        taskId: mostOverdue.id,
        meta: { sprint: '⚠️ High priority', updated: '30m ago' },
      });
    }

    // 3. Capacity Available (info)
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
        message: `${lowWorkload.slice(0, 2).join(' and ')}${lowWorkload.length > 2 ? ' and others' : ''} have bandwidth for 3-4 additional tasks.`,
        createdAt: new Date().toISOString(),
        meta: { members: `${lowWorkload.length} team members`, updated: '2h ago' },
      });
    }

    // 4. Initiative On Track (success)
    const completedPercent = tasks.length > 0 
      ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
      : 0;
    if (completedPercent > 50) {
      generatedInsights.push({
        id: 'initiative-success',
        type: 'success',
        title: 'Initiative On Track',
        message: `Overall progress is ${completedPercent}% complete, ${completedPercent >= 65 ? 'ahead of' : 'on'} schedule.`,
        createdAt: new Date().toISOString(),
        meta: { confidence: 'Q1 Target', updated: '4h ago' },
      });
    }

    // 5. Upcoming Deadlines (info)
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
        id: 'deadline-info',
        type: 'info',
        title: 'Upcoming Deadlines',
        message: `${upcomingDeadlines.length} tasks due this week. ${nextDue.title} due in ${daysUntil} days.`,
        createdAt: new Date().toISOString(),
        taskId: nextDue.id,
        meta: { date: 'This week', updated: '1h ago' },
      });
    }

    // 6. Workload Imbalance (warning)
    const workloads = Array.from(assigneeWorkload.entries());
    const avgWorkload = workloads.reduce((sum, [, count]) => sum + count, 0) / (workloads.length || 1);
    
    const overloaded = workloads.filter(([, count]) => count > avgWorkload * 1.5);
    if (overloaded.length > 0) {
      const [name, count] = overloaded[0];
      const percent = Math.round((count / avgWorkload) * 100);
      generatedInsights.push({
        id: 'workload-warning',
        type: 'warning',
        title: 'Workload Imbalance',
        message: `${name} is at ${percent}% capacity. Consider redistributing tasks.`,
        createdAt: new Date().toISOString(),
        meta: { sprint: '⚖️ Rebalance suggested', updated: '3h ago' },
      });
    }

    return generatedInsights.slice(0, 6);
  }, [tasks]);

  // Generate pending items
  const pendingItems = useMemo((): PendingItem[] => {
    const items: PendingItem[] = [];

    // Overdue tasks
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).slice(0, 2);
    
    overdueTasks.forEach(task => {
      const daysOverdue = Math.ceil((Date.now() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        id: `overdue-${task.id}`,
        title: task.title,
        subtitle: `Assigned to ${task.assigneeName || 'Unassigned'} · ${daysOverdue} days overdue`,
        type: 'overdue',
        dueLabel: 'Overdue',
        dueType: 'urgent',
        taskId: task.id,
      });
    });

    // Tasks in review (approvals)
    const reviewTasks = tasks.filter(t => t.status === 'review').slice(0, 3);
    reviewTasks.forEach(task => {
      let daysUntilDue = 5;
      if (task.dueDate) {
        daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }
      items.push({
        id: `approval-${task.id}`,
        title: task.title,
        subtitle: `Submitted by ${task.reporterName || task.assigneeName || 'Unknown'} · ${task.teamName || 'General'}`,
        type: 'approval',
        dueLabel: daysUntilDue <= 0 ? 'Due today' : daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`,
        dueType: daysUntilDue <= 0 ? 'urgent' : daysUntilDue <= 3 ? 'soon' : 'normal',
        taskId: task.id,
      });
    });

    return items.slice(0, 5);
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
    } else if (lowercaseQuery.includes('attention') || lowercaseQuery.includes('needs')) {
      const urgent = tasks.filter(t => 
        t.blocked || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done') || t.status === 'review'
      );
      response = `You have ${urgent.length} items that need attention: ${stats.inReview} pending approvals, ${stats.overdue} overdue tasks. Focus on clearing approvals first as they may be blocking others.`;
    } else if (lowercaseQuery.includes('overdue')) {
      const overdue = tasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      );
      response = overdue.length > 0
        ? `There are ${overdue.length} overdue tasks: ${overdue.slice(0, 3).map(t => t.title).join(', ')}. These need immediate attention.`
        : 'Great news! No tasks are currently overdue.';
    } else if (lowercaseQuery.includes('approval')) {
      const reviews = tasks.filter(t => t.status === 'review');
      response = reviews.length > 0
        ? `${reviews.length} items are pending approval: ${reviews.slice(0, 3).map(t => t.title).join(', ')}. Consider reviewing these to unblock progress.`
        : 'No items are currently pending approval.';
    } else if (lowercaseQuery.includes('initiative') || lowercaseQuery.includes('status')) {
      const done = tasks.filter(t => t.status === 'done').length;
      const total = tasks.length;
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      response = `Overall initiative progress is ${percent}% complete with ${done} of ${total} tasks finished. ${percent >= 65 ? 'The initiative is ahead of schedule.' : percent >= 50 ? 'The initiative is on track.' : 'Consider prioritizing high-impact items to improve progress.'}`;
    } else if (lowercaseQuery.includes('workload') || lowercaseQuery.includes('team')) {
      const assigneeWorkload = new Map<string, number>();
      tasks.filter(t => t.status !== 'done' && t.assigneeId).forEach(task => {
        const current = assigneeWorkload.get(task.assigneeName || '') || 0;
        assigneeWorkload.set(task.assigneeName || '', current + 1);
      });
      const workloads = Array.from(assigneeWorkload.entries()).sort((a, b) => b[1] - a[1]);
      if (workloads.length > 0) {
        response = `Workload distribution: ${workloads.slice(0, 4).map(([name, count]) => `${name}: ${count} tasks`).join(', ')}. ${workloads[0][1] > (workloads[workloads.length - 1]?.[1] || 0) * 2 ? 'Consider rebalancing - there\'s a significant disparity.' : 'Distribution looks fairly balanced.'}`;
      } else {
        response = 'No active task assignments found to analyze workload balance.';
      }
    } else {
      response = `Based on the current data with ${tasks.length} total tasks, ${stats.completedThisMonth} completed this month, ${stats.inReview} pending approvals, and ${stats.overdue} overdue items. Focus on clearing approvals and overdue tasks to maintain healthy velocity.`;
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
          Intelligent analysis of your tasks, workload, and initiatives
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        {/* Ask AI Section */}
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
              placeholder="Ask anything about your tasks, workload, or initiatives..."
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

        {/* AI Response */}
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
            { 
              label: 'Open Tasks', 
              value: stats.openTasks, 
              change: 'Across all teams', 
              changeType: 'neutral' as const
            },
            { 
              label: 'Pending Approvals', 
              value: stats.inReview, 
              change: stats.inReview > 0 ? `${Math.min(stats.inReview, 3)} awaiting your action` : 'All clear', 
              changeType: stats.inReview > 0 ? 'warning' as const : 'positive' as const
            },
            { 
              label: 'Overdue', 
              value: stats.overdue, 
              change: stats.overdue > 0 ? 'Needs immediate attention' : 'All on track', 
              changeType: stats.overdue > 0 ? 'negative' as const : 'positive' as const
            },
            { 
              label: 'Completed This Month', 
              value: stats.completedThisMonth, 
              change: '↑ 18% from last month', 
              changeType: 'positive' as const
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="bg-surface-1 border border-border rounded-xl p-5"
            >
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">
                {stat.label}
              </div>
              <div className="text-[1.75rem] font-bold text-text-primary mb-1">
                {stat.value}
              </div>
              <div className={cn(
                "text-xs font-medium",
                stat.changeType === 'positive' && "text-green-600",
                stat.changeType === 'negative' && "text-red-500",
                stat.changeType === 'warning' && "text-amber-600",
                stat.changeType === 'neutral' && "text-text-muted"
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
          <h3 className="font-semibold text-text-primary mb-2.5">Weekly Summary</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your teams completed <strong className="text-text-primary">{stats.completedThisMonth} tasks</strong> this month 
            with <strong className="text-text-primary">{stats.openTasks} tasks</strong> currently open. 
            {stats.inReview > 0 && (
              <> There are <span className="text-amber-600 font-medium">{stats.inReview} items pending approval</span></>
            )}
            {stats.overdue > 0 && (
              <> and <span className="text-red-500 font-medium">{stats.overdue} overdue tasks</span> that require attention</>
            )}.
            {stats.inReview === 0 && stats.overdue === 0 && (
              <> All items are on track with no pending approvals or overdue tasks.</>
            )}
            {' '}Consider reassigning tasks from overloaded team members to those with available bandwidth.
          </p>
        </motion.div>

        {/* Proactive Insights Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary">Proactive Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {insights.map((insight, index) => {
                const Icon = getInsightIcon(insight.type);
                const linkedTask = insight.taskId 
                  ? tasks.find(t => t.id === insight.taskId) 
                  : null;

                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => linkedTask && onTaskClick(linkedTask)}
                    className={cn(
                      "bg-surface-1 border border-border rounded-xl p-[18px] flex items-start gap-3.5 transition-all cursor-pointer hover:border-slate-300 hover:shadow-md",
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
                      <p className="text-[13px] text-text-secondary leading-relaxed mb-2.5">
                        {insight.message}
                      </p>
                      {insight.meta && (
                        <div className="flex items-center gap-3 text-[11px] text-text-muted">
                          {insight.meta.sprint && (
                            <span>{insight.meta.sprint}</span>
                          )}
                          {insight.meta.confidence && (
                            <span>🎯 {insight.meta.confidence}</span>
                          )}
                          {insight.meta.members && (
                            <span>👥 {insight.meta.members}</span>
                          )}
                          {insight.meta.date && (
                            <span>📅 {insight.meta.date}</span>
                          )}
                          {insight.meta.updated && (
                            <span>🕐 Updated {insight.meta.updated}</span>
                          )}
                        </div>
                      )}
                    </div>
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

        {/* Requires Your Attention Section */}
        {pendingItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface-1 border border-border rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Requires Your Attention</h3>
              <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100">
                {pendingItems.length} items
              </Badge>
            </div>
            <div className="divide-y divide-border/50">
              {pendingItems.map((item, index) => {
                const linkedTask = item.taskId 
                  ? tasks.find(t => t.id === item.taskId) 
                  : null;
                  
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    onClick={() => linkedTask && onTaskClick(linkedTask)}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-0 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.type === 'approval' && "bg-amber-500",
                        item.type === 'review' && "bg-purple-500",
                        item.type === 'overdue' && "bg-red-500"
                      )} />
                      <div>
                        <h4 className="text-sm font-medium text-text-primary">{item.title}</h4>
                        <p className="text-xs text-text-muted">{item.subtitle}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs font-medium",
                        item.dueType === 'urgent' && "bg-red-50 text-red-600 border-red-100",
                        item.dueType === 'soon' && "bg-amber-50 text-amber-600 border-amber-100",
                        item.dueType === 'normal' && "bg-slate-100 text-slate-600"
                      )}
                    >
                      {item.dueLabel}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
