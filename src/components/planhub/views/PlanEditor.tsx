import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Plus, Flag, LayoutGrid, BarChart2, 
  Columns, History, Play
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlanSubscription } from '@/hooks/usePlanHubSubscriptions';
import { useLogPlanAccess, useLogTaskActivity } from '@/hooks/usePlanHubActivity';
import TaskGrid from '../components/TaskGrid';
import GanttChart from '../components/GanttChart';
import type { FeatureSettings, PlanWithLead, TaskRow, TaskTreeNode } from '@/types/planhub.types';

interface Props {
  planId: string;
  onBack: () => void;
  features?: FeatureSettings | null;
}

type ViewMode = 'split' | 'tasks' | 'gantt';

export default function PlanEditor({ planId, onBack, features }: Props) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Real-time subscription for collaborative editing
  usePlanSubscription(planId);

  // Activity logging
  const logAccess = useLogPlanAccess();
  const taskActivity = useLogTaskActivity();

  // Log plan access on mount (debounced)
  useEffect(() => {
    if (planId) {
      logAccess(planId);
    }
  }, [planId]);

  // Fetch plan
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['planhub', 'plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_plans')
        .select('*, lead:profiles(id, full_name, avatar_url)')
        .eq('id', planId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as PlanWithLead;
    },
  });

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['planhub', 'tasks', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_tasks')
        .select('*')
        .eq('plan_id', planId)
        .order('position');
      if (error) throw new Error(error.message);
      return data as unknown as TaskRow[];
    },
  });

  // Build task tree
  const taskTree: TaskTreeNode[] = useMemo(() => {
    if (!tasks) return [];
    
    const buildTree = (parentId: string | null, depth: number): TaskTreeNode[] => {
      return tasks
        .filter(t => t.parent_id === parentId)
        .sort((a, b) => a.position - b.position)
        .map(task => ({
          ...task,
          depth,
          children: buildTree(task.id, depth + 1),
        }));
    };
    
    return buildTree(null, 0);
  }, [tasks]);

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async ({ type, parentId }: { type: 'phase' | 'task' | 'milestone'; parentId?: string }) => {
      const position = tasks?.length || 0;
      const wbs = parentId 
        ? `${tasks?.find(t => t.id === parentId)?.wbs}.${tasks?.filter(t => t.parent_id === parentId).length + 1}`
        : `${tasks?.filter(t => !t.parent_id).length + 1}`;

      const { data, error } = await supabase
        .from('planhub_tasks')
        .insert({
          plan_id: planId,
          parent_id: parentId || null,
          wbs,
          name: type === 'phase' ? 'New Phase' : type === 'milestone' ? 'New Milestone' : 'New Task',
          type,
          days: type === 'milestone' ? 0 : 5,
          position,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { ...data, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'tasks', planId] });
      // Log task creation
      taskActivity.logCreate(planId, data.name, data.type);
    },
  });

  // Update task mutation
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskRow> }) => {
      const { error } = await supabase
        .from('planhub_tasks')
        .update(updates)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['planhub', 'tasks', planId] });
      const previous = queryClient.getQueryData(['planhub', 'tasks', planId]);
      queryClient.setQueryData(['planhub', 'tasks', planId], (old: TaskRow[] | undefined) =>
        old?.map(t => t.id === id ? { ...t, ...updates } : t)
      );
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['planhub', 'tasks', planId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'tasks', planId] });
    },
  });

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'ontrack': return 'ph-badge-success';
      case 'atrisk': return 'ph-badge-warning';
      case 'critical': return 'ph-badge-danger';
      default: return 'ph-badge-gray';
    }
  };

  const isLoading = planLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="ph-flex ph-items-center ph-justify-center" style={{ flex: 1 }}>
        <div className="ph-spinner"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="ph-page-header">
        <div className="ph-flex ph-items-center ph-justify-between">
          <div className="ph-flex ph-items-center ph-gap-4">
            <button onClick={onBack} className="ph-btn ph-btn-ghost ph-btn-sm">
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="ph-flex ph-items-center ph-gap-3">
                <h1 className="ph-page-title" style={{ marginBottom: 0 }}>{plan?.name}</h1>
                <span className={`ph-badge ${getHealthBadge(plan?.health || 'ontrack')}`}>
                  {plan?.health === 'ontrack' ? 'On Track' : plan?.health === 'atrisk' ? 'At Risk' : 'Critical'}
                </span>
              </div>
              <p className="ph-page-subtitle">{plan?.code}</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ph-flex ph-items-center ph-gap-2">
            {/* Add buttons */}
            <button
              onClick={() => createTask.mutate({ type: 'phase' })}
              className="ph-btn ph-btn-secondary ph-btn-sm"
            >
              <Plus size={14} />
              Phase
            </button>
            <button
              onClick={() => createTask.mutate({ type: 'task' })}
              className="ph-btn ph-btn-secondary ph-btn-sm"
            >
              <Plus size={14} />
              Task
            </button>
            <button
              onClick={() => createTask.mutate({ type: 'milestone' })}
              className="ph-btn ph-btn-secondary ph-btn-sm"
            >
              <Flag size={14} />
              Milestone
            </button>

            <div style={{ width: 1, height: 24, background: 'var(--ph-border)', margin: '0 8px' }} />

            {/* View toggles */}
            <div className="ph-flex" style={{ background: 'var(--ph-gray-100)', borderRadius: 'var(--ph-radius-md)', padding: 2 }}>
              <button
                onClick={() => setViewMode('split')}
                className="ph-btn ph-btn-ghost ph-btn-sm"
                style={{ background: viewMode === 'split' ? 'var(--ph-surface)' : 'transparent' }}
              >
                <Columns size={16} />
              </button>
              <button
                onClick={() => setViewMode('tasks')}
                className="ph-btn ph-btn-ghost ph-btn-sm"
                style={{ background: viewMode === 'tasks' ? 'var(--ph-surface)' : 'transparent' }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className="ph-btn ph-btn-ghost ph-btn-sm"
                style={{ background: viewMode === 'gantt' ? 'var(--ph-surface)' : 'transparent' }}
              >
                <BarChart2 size={16} />
              </button>
            </div>

            <div style={{ width: 1, height: 24, background: 'var(--ph-border)', margin: '0 8px' }} />

            {/* Version control */}
            {features?.version_control && (
              <button className="ph-btn ph-btn-secondary ph-btn-sm">
                <History size={16} />
                Versions
              </button>
            )}

            {/* Presentation mode */}
            {features?.presentation_mode && (
              <button className="ph-btn ph-btn-primary ph-btn-sm">
                <Play size={16} />
                Present
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="ph-page-body ph-flex ph-gap-4" style={{ padding: 'var(--ph-space-4)' }}>
        {/* Task Grid */}
        {(viewMode === 'split' || viewMode === 'tasks') && (
          <div style={{ flex: viewMode === 'split' ? 1 : 'auto', minWidth: viewMode === 'split' ? 400 : 'auto', width: viewMode === 'tasks' ? '100%' : 'auto' }}>
            <TaskGrid
              tasks={taskTree}
              onUpdate={(id, updates) => updateTask.mutate({ id, updates })}
            />
          </div>
        )}

        {/* Gantt Chart */}
        {(viewMode === 'split' || viewMode === 'gantt') && (
          <div style={{ flex: viewMode === 'split' ? 1.5 : 'auto', width: viewMode === 'gantt' ? '100%' : 'auto' }}>
            <GanttChart tasks={taskTree} />
          </div>
        )}
      </div>
    </>
  );
}
