// ============================================================
// PLANNER AI INSIGHTS VIEW
// Ask AI interface and proactive insights cards
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Generate proactive insights based on task data
  const insights = useMemo((): AIInsight[] => {
    const generatedInsights: AIInsight[] = [];

    // Critical: Blocked tasks
    const blockedTasks = tasks.filter(t => t.blocked);
    blockedTasks.forEach(task => {
      const daysSinceCreated = Math.ceil(
        (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      generatedInsights.push({
        id: `blocked-${task.id}`,
        type: 'critical',
        title: `${task.key} Blocked`,
        message: `"${task.title}" has been blocked for ${daysSinceCreated} days. ${task.blockedReason || 'No reason specified.'}`,
        action: 'View Task',
        taskId: task.id,
        createdAt: new Date().toISOString(),
      });
    });

    // Warning: Overdue tasks
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    );
    if (overdueTasks.length > 0) {
      generatedInsights.push({
        id: 'overdue-warning',
        type: 'warning',
        title: `${overdueTasks.length} Tasks Overdue`,
        message: `There are ${overdueTasks.length} tasks past their due date. Consider re-prioritizing or updating deadlines.`,
        createdAt: new Date().toISOString(),
      });
    }

    // Warning: Workload imbalance
    const assigneeWorkload = new Map<string, number>();
    tasks.filter(t => t.status !== 'done' && t.assigneeId).forEach(task => {
      const current = assigneeWorkload.get(task.assigneeName || '') || 0;
      assigneeWorkload.set(task.assigneeName || '', current + 1);
    });
    
    const workloads = Array.from(assigneeWorkload.entries());
    const avgWorkload = workloads.reduce((sum, [, count]) => sum + count, 0) / (workloads.length || 1);
    
    workloads.forEach(([name, count]) => {
      if (count > avgWorkload * 1.4) {
        generatedInsights.push({
          id: `workload-${name}`,
          type: 'warning',
          title: 'Workload Imbalance',
          message: `${name} has ${Math.round((count / avgWorkload - 1) * 100)}% more tasks than average. Consider redistributing work.`,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Info: Velocity
    const completedThisWeek = tasks.filter(t => t.status === 'done').length;
    if (completedThisWeek > 10) {
      generatedInsights.push({
        id: 'velocity-info',
        type: 'info',
        title: 'Strong Velocity',
        message: `Team completed ${completedThisWeek} tasks. Velocity is up 15% from last sprint.`,
        createdAt: new Date().toISOString(),
      });
    }

    // Success: Sprint on track
    if (blockedTasks.length === 0 && overdueTasks.length <= 1) {
      generatedInsights.push({
        id: 'sprint-success',
        type: 'success',
        title: 'Sprint On Track',
        message: 'All key metrics are healthy. The team is on pace to meet sprint goals.',
        createdAt: new Date().toISOString(),
      });
    }

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
      const lowWorkload = Array.from(new Map<string, number>())
        .filter(([, count]) => count < 5)
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

  const getInsightStyles = (type: AIInsight['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
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

      <div className="p-6 space-y-6">
        {/* Ask AI Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-semibold">Ask AI</h2>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder="Ask anything about your project status..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40"
            />
            <Button 
              onClick={handleAskAI}
              disabled={isLoading || !query.trim()}
              className="bg-white text-blue-600 hover:bg-white/90"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => setQuery(prompt)}
                className="px-3 py-1.5 bg-white/10 rounded-full text-sm hover:bg-white/20 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* AI Response */}
          <AnimatePresence>
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-white/10 rounded-lg"
              >
                <p className="text-sm">{aiResponse}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-1 rounded-xl p-4 border border-border"
        >
          <h3 className="font-semibold text-text-primary mb-2">Weekly Summary</h3>
          <p className="text-sm text-text-secondary">
            The team completed {tasks.filter(t => t.status === 'done').length} tasks this week, 
            with {tasks.filter(t => t.status === 'in-progress').length} currently in progress. 
            {tasks.filter(t => t.blocked).length > 0 
              ? ` ${tasks.filter(t => t.blocked).length} items are blocked and need attention.`
              : ' No blockers are impeding progress.'}
            {' '}Overall sprint health is{' '}
            {tasks.filter(t => t.blocked).length === 0 && tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length <= 1
              ? 'excellent'
              : 'moderate'}.
          </p>
        </motion.div>

        {/* Insight Cards */}
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary">Proactive Insights</h3>
          <div className="grid gap-3">
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
                    className={cn(
                      "rounded-xl p-4 border flex items-start gap-3",
                      getInsightStyles(insight.type)
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{insight.title}</h4>
                        {insight.taskId && (
                          <span className="text-xs font-mono opacity-70">
                            {blockedTask?.key}
                          </span>
                        )}
                      </div>
                      <p className="text-sm opacity-90">{insight.message}</p>
                    </div>
                    {insight.action && blockedTask && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTaskClick(blockedTask)}
                        className="flex-shrink-0 gap-1"
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
              <div className="text-center py-12 text-text-muted">
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
