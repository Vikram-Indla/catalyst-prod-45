// src/components/work-manager/TaskDrawer.tsx
// Task Detail Drawer Component

import { useState, useEffect } from 'react';
import { X, Link2, Calendar, AlertTriangle, RefreshCw, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUserById, getTeamById, users } from '@/lib/work-manager-data';
import type { TaskExtended, TaskStatus, Priority, TaskType, RecurrenceType } from './types';
import { cn } from '@/lib/utils';

interface TaskDrawerProps {
  isOpen: boolean;
  task: TaskExtended | null;
  activeTab: 'overview' | 'activity' | 'comments';
  onClose: () => void;
  onTabChange: (tab: 'overview' | 'activity' | 'comments') => void;
  onUpdate: (updates: Partial<TaskExtended>) => void;
}

const statuses: TaskStatus[] = ['Backlog', 'Planned', 'In Progress', 'Waiting', 'Done'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
const taskTypes: TaskType[] = ['General', 'Task', 'Project'];
const recurrenceTypes: RecurrenceType[] = ['None', 'Daily', 'Weekly', 'Biweekly', 'Monthly'];

export function TaskDrawer({ isOpen, task, activeTab, onClose, onTabChange, onUpdate }: TaskDrawerProps) {
  const [localTask, setLocalTask] = useState<Partial<TaskExtended>>({});
  const [showToast, setShowToast] = useState(false);

  // Sync local state when task changes
  useEffect(() => {
    if (task) {
      setLocalTask({
        status: task.status,
        priority: task.priority,
        type: task.type,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        blocked: task.blocked,
        blockedReason: task.blockedReason,
        recurrence: task.recurrence,
      });
    }
  }, [task]);

  // Don't render if not open or no task
  if (!isOpen) return null;
  
  // Show loading state if task not yet available
  if (!task) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-[500px] bg-surface-card border-l border-border-default shadow-xl z-50 flex items-center justify-center">
          <span className="text-text-muted">Loading...</span>
        </div>
      </>
    );
  }

  const assignee = getUserById(task.assigneeId);
  const team = getTeamById(task.teamId);
  const teamMembers = team ? users.filter(u => team.memberIds.includes(u.id)) : [];

  const handleSave = () => {
    onUpdate(localTask);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleBlockedChange = (checked: boolean) => {
    setLocalTask(prev => ({
      ...prev,
      blocked: checked,
      blockedReason: checked ? prev.blockedReason : undefined,
    }));
  };

  // Mock activity data
  const activities = [
    { id: 'a1', type: 'status_changed', user: 'Sarah Ahmed', from: 'Planned', to: 'In Progress', time: '2 hours ago' },
    { id: 'a2', type: 'assigned', user: 'Mohammed Al-Rashid', to: 'Sarah Ahmed', time: '1 day ago' },
    { id: 'a3', type: 'created', user: 'Vikram', time: '3 days ago' },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-40" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-[500px] bg-surface-card border-l border-border-default shadow-xl z-50 flex flex-col transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border-default">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">{task.title}</h2>
            <span className="font-mono text-[12px] text-text-muted">{task.key}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-muted">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-default">
          {(['overview', 'activity', 'comments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                'flex-1 px-4 py-3 text-[13px] font-medium transition-colors',
                activeTab === tab 
                  ? 'text-brand-primary border-b-2 border-brand-primary' 
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Status</span>
                <Select
                  value={localTask.status || task.status}
                  onValueChange={(v) => setLocalTask(prev => ({ ...prev, status: v as TaskStatus }))}
                >
                  <SelectTrigger className="w-[150px] h-8 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Team</span>
                <span className="text-[13px] text-text-primary">{team?.name || '—'}</span>
              </div>

              {/* Assignee */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Assignee</span>
                <Select
                  value={localTask.assigneeId || task.assigneeId}
                  onValueChange={(v) => setLocalTask(prev => ({ ...prev, assigneeId: v }))}
                >
                  <SelectTrigger className="w-[180px] h-8 text-[13px]">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white',
                          assignee?.avatarColor || 'bg-brand-primary'
                        )}>
                          {assignee?.initials}
                        </div>
                        {assignee?.name}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white',
                            u.avatarColor || 'bg-brand-primary'
                          )}>
                            {u.initials}
                          </div>
                          {u.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Due Date</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <Input
                    type="date"
                    value={localTask.dueDate || task.dueDate || ''}
                    onChange={(e) => setLocalTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-[150px] h-8 text-[13px]"
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Priority</span>
                <Select
                  value={localTask.priority || task.priority}
                  onValueChange={(v) => setLocalTask(prev => ({ ...prev, priority: v as Priority }))}
                >
                  <SelectTrigger className="w-[150px] h-8 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Task Type</span>
                <Select
                  value={localTask.type || task.type}
                  onValueChange={(v) => setLocalTask(prev => ({ ...prev, type: v as TaskType }))}
                >
                  <SelectTrigger className="w-[150px] h-8 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linked Item */}
              {task.linkedItem && (
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] font-medium text-text-muted">Linked Item</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-highlight/30 text-text-primary text-[12px] font-mono rounded dark:bg-brand-highlight/20 dark:text-brand-highlight">
                    <Link2 className="w-3 h-3" />
                    {task.linkedItem.key}
                  </span>
                </div>
              )}

              {/* Recurrence */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">Recurrence</span>
                <Select
                  value={localTask.recurrence || task.recurrence}
                  onValueChange={(v) => setLocalTask(prev => ({ ...prev, recurrence: v as RecurrenceType }))}
                >
                  <SelectTrigger className="w-[150px] h-8 text-[13px]">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {recurrenceTypes.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Blocked */}
              <div className="py-2 border-b border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-text-muted">Blocked</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={localTask.blocked ?? task.blocked}
                      onCheckedChange={(checked) => handleBlockedChange(checked as boolean)}
                    />
                    <span className="text-[13px] text-text-secondary">This task is blocked</span>
                  </div>
                </div>
                {(localTask.blocked ?? task.blocked) && (
                  <div className="mt-3">
                    <Textarea
                      value={localTask.blockedReason || task.blockedReason || ''}
                      onChange={(e) => setLocalTask(prev => ({ ...prev, blockedReason: e.target.value }))}
                      placeholder="Describe the blocker..."
                      className="text-[13px] min-h-[80px]"
                    />
                  </div>
                )}
              </div>

              {/* Attention Level Indicator */}
              {task.attentionLevel !== 'neutral' && (
                <div className={cn(
                  'flex items-center gap-2 p-3 rounded-md',
                  task.attentionLevel === 'danger' && 'bg-status-danger-bg text-status-danger',
                  task.attentionLevel === 'warning' && 'bg-status-warning-bg text-status-warning'
                )}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[12px] font-medium">
                    {task.attentionLevel === 'danger' && 'Requires immediate attention'}
                    {task.attentionLevel === 'warning' && 'Needs follow-up soon'}
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 pb-4 border-b border-border-subtle">
                  <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center">
                    <Clock className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] text-text-primary">
                      <span className="font-medium">{activity.user}</span>
                      {activity.type === 'status_changed' && (
                        <> changed status from <span className="font-medium">{activity.from}</span> to <span className="font-medium">{activity.to}</span></>
                      )}
                      {activity.type === 'assigned' && (
                        <> assigned to <span className="font-medium">{activity.to}</span></>
                      )}
                      {activity.type === 'created' && (
                        <> created this task</>
                      )}
                    </p>
                    <span className="text-[11px] text-text-muted">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="text-center py-8 text-[13px] text-text-muted">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No comments yet
              </div>
              <Textarea
                placeholder="Add a comment..."
                className="text-[13px] min-h-[80px]"
              />
              <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white">
                Add Comment
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'overview' && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border-default">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-status-success text-white text-[13px] font-medium rounded-md shadow-lg z-50">
          Task updated successfully
        </div>
      )}
    </>
  );
}

export default TaskDrawer;