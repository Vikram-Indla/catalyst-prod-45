// src/components/work-manager/TaskDrawer.tsx
// Task Detail Drawer Component using shadcn Sheet

import { useState, useEffect } from 'react';
import { Link2, RefreshCw, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  if (!task) return null;

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

  // Field row component for consistent styling
  const FieldRow = ({ label, children, noBorder = false }: { label: string; children: React.ReactNode; noBorder?: boolean }) => (
    <div className={cn(
      'flex items-center justify-between py-3',
      !noBorder && 'border-b border-gray-100 dark:border-gray-800'
    )}>
      <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" width="medium" className="p-0 flex flex-col">
          {/* HEADER - Task title and key */}
          <SheetHeader className="pr-12">
            <SheetTitle className="text-[15px] font-semibold leading-tight truncate">
              {task.title}
            </SheetTitle>
            <SheetDescription className="font-mono text-[12px]">
              {task.key}
            </SheetDescription>
          </SheetHeader>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b border-gray-200 dark:border-gray-700 bg-transparent h-auto p-0">
              <TabsTrigger
                value="overview"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#5c7c5c] data-[state=active]:text-[#5c7c5c] data-[state=active]:bg-transparent py-3 text-[13px] font-medium"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#5c7c5c] data-[state=active]:text-[#5c7c5c] data-[state=active]:bg-transparent py-3 text-[13px] font-medium"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#5c7c5c] data-[state=active]:text-[#5c7c5c] data-[state=active]:bg-transparent py-3 text-[13px] font-medium"
              >
                Comments
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="flex-1 flex flex-col overflow-hidden m-0">
              <SheetBody className="flex-1 overflow-y-auto">
                {/* Status */}
                <FieldRow label="Status">
                  <Select
                    value={localTask.status || task.status}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, status: v as TaskStatus }))}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Team */}
                <FieldRow label="Team">
                  <span className="text-[13px] text-gray-900 dark:text-gray-100">{team?.name || '—'}</span>
                </FieldRow>

                {/* Assignee */}
                <FieldRow label="Assignee">
                  <Select
                    value={localTask.assigneeId || task.assigneeId}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, assigneeId: v }))}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-[13px]">
                      <SelectValue>
                        {assignee && (
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0',
                              assignee.avatarColor || 'bg-[#5c7c5c]'
                            )}>
                              {assignee.initials}
                            </div>
                            <span className="truncate">{assignee.name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[200px]">
                      {teamMembers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0',
                              u.avatarColor || 'bg-[#5c7c5c]'
                            )}>
                              {u.initials}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Reporter (read-only) */}
                <FieldRow label="Reporter">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#5c7c5c] flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
                      VA
                    </div>
                    <span className="text-[13px] text-gray-900 dark:text-gray-100">Vikram (You)</span>
                  </div>
                </FieldRow>

                {/* Due Date */}
                <FieldRow label="Due Date">
                  <Input
                    type="date"
                    value={localTask.dueDate || task.dueDate || ''}
                    onChange={(e) => setLocalTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-[200px] h-8 text-[13px]"
                  />
                </FieldRow>

                {/* Priority */}
                <FieldRow label="Priority">
                  <Select
                    value={localTask.priority || task.priority}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, priority: v as Priority }))}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Task Type */}
                <FieldRow label="Task Type">
                  <Select
                    value={localTask.type || task.type}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, type: v as TaskType }))}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Linked Item - only show if exists */}
                {task.linkedItem && (
                  <FieldRow label="Linked Item">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#5c7c5c]/20 text-[#5c7c5c] text-[12px] font-mono rounded">
                      <Link2 className="w-3.5 h-3.5" />
                      {task.linkedItem.key}
                    </span>
                  </FieldRow>
                )}

                {/* Recurrence */}
                <FieldRow label="Recurrence">
                  <Select
                    value={localTask.recurrence || task.recurrence}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, recurrence: v as RecurrenceType }))}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-[13px]">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {recurrenceTypes.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Blocked */}
                <FieldRow label="Blocked" noBorder>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={localTask.blocked ?? task.blocked ?? false}
                      onCheckedChange={handleBlockedChange}
                      className="w-4 h-4"
                    />
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">This task is blocked</span>
                  </label>
                </FieldRow>

                {/* Blocked Reason Textarea */}
                {(localTask.blocked ?? task.blocked) && (
                  <div className="mt-3">
                    <Textarea
                      value={localTask.blockedReason ?? task.blockedReason ?? ''}
                      onChange={(e) => setLocalTask(prev => ({ ...prev, blockedReason: e.target.value }))}
                      placeholder="Describe what's blocking this task..."
                      className="text-[13px] min-h-[80px] w-full"
                    />
                  </div>
                )}

                {/* Attention Level Indicator */}
                {task.attentionLevel && task.attentionLevel !== 'neutral' && (
                  <div className={cn(
                    'flex items-center gap-2 p-3 rounded-md mt-4',
                    task.attentionLevel === 'danger' && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    task.attentionLevel === 'warning' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[12px] font-medium">
                      {task.attentionLevel === 'danger' && 'Requires immediate attention'}
                      {task.attentionLevel === 'warning' && 'Needs follow-up soon'}
                    </span>
                  </div>
                )}
              </SheetBody>

              {/* Footer */}
              <SheetFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} className="bg-[#5c7c5c] hover:bg-[#4a6a4a] text-white">
                  Save Changes
                </Button>
              </SheetFooter>
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity" className="flex-1 overflow-hidden m-0">
              <SheetBody>
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100">
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
                        <span className="text-[11px] text-gray-400">{activity.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetBody>
            </TabsContent>

            {/* COMMENTS TAB */}
            <TabsContent value="comments" className="flex-1 overflow-hidden m-0">
              <SheetBody>
                <div className="text-center py-8 text-[13px] text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No comments yet
                </div>
                <Textarea
                  placeholder="Add a comment..."
                  className="text-[13px] min-h-[80px]"
                />
                <Button size="sm" className="mt-2 bg-[#5c7c5c] hover:bg-[#4a6a4a] text-white">
                  Add Comment
                </Button>
              </SheetBody>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-white text-[13px] font-medium rounded-md shadow-lg z-[300]">
          Task updated successfully
        </div>
      )}
    </>
  );
}

export default TaskDrawer;
