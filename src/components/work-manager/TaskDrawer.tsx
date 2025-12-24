// src/components/work-manager/TaskDrawer.tsx
// Premium Enterprise-Grade Task Detail Drawer

import { useState, useEffect } from 'react';
import { 
  Link2, 
  RefreshCw, 
  MessageSquare, 
  AlertTriangle,
  X,
  Folder,
  CheckSquare,
  FileText,
  AlertCircle,
  Trash2,
  Check
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getUserById, getTeamById } from '@/lib/work-manager-data';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { TaskExtended, TaskStatus, Priority, TaskType, RecurrenceType } from './types';
import { cn } from '@/lib/utils';

interface TaskDrawerProps {
  isOpen: boolean;
  task: TaskExtended | null;
  activeTab: 'overview' | 'activity' | 'comments';
  onClose: () => void;
  onTabChange: (tab: 'overview' | 'activity' | 'comments') => void;
  onUpdate: (updates: Partial<TaskExtended>) => void;
  onDelete?: (taskId: string) => void;
}

const statuses: TaskStatus[] = ['Backlog', 'Planned', 'In Progress', 'Waiting', 'Done'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
const taskTypes: TaskType[] = ['General', 'Task', 'Project'];
const recurrenceTypes: RecurrenceType[] = ['None', 'Daily', 'Weekly', 'Biweekly', 'Monthly'];

// Status badge colors
const statusColors: Record<TaskStatus, string> = {
  'Backlog': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Planned': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Waiting': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

// Priority colors
const priorityColors: Record<Priority, { dot: string; text: string }> = {
  'Low': { dot: 'bg-gray-400', text: 'text-gray-600' },
  'Medium': { dot: 'bg-yellow-500', text: 'text-yellow-600' },
  'High': { dot: 'bg-orange-500', text: 'text-orange-600' },
  'Critical': { dot: 'bg-red-500', text: 'text-red-600' },
};

// Team colors
const teamColors: Record<string, string> = {
  'olive': 'bg-[#5c7c5c]',
  'bronze': 'bg-[#cd7f32]',
  'gold': 'bg-[#d4b896]',
};

// Task type icons
const taskTypeIcons: Record<TaskType, typeof Folder> = {
  'Project': Folder,
  'Task': CheckSquare,
  'General': FileText,
};

export function TaskDrawer({ isOpen, task, activeTab, onClose, onTabChange, onUpdate, onDelete }: TaskDrawerProps) {
  const [localTask, setLocalTask] = useState<Partial<TaskExtended>>({});
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch team members from database
  const { data: teamMembersData = [] } = useTeamMembers(task?.teamId);

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
  
  // Transform team members to the format expected by the component
  const teamMembers = teamMembersData.map((member) => {
    const profile = member.profiles as { id: string; full_name: string | null; email: string | null } | null;
    const name = profile?.full_name || profile?.email || 'Unknown';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return {
      id: member.user_id,
      name,
      initials,
      email: profile?.email || '',
      role: member.role || 'Member',
      avatarColor: undefined as string | undefined,
    };
  });
  const currentStatus = localTask.status || task.status;
  const currentPriority = localTask.priority || task.priority;
  const currentType = localTask.type || task.type;
  const currentRecurrence = localTask.recurrence || task.recurrence;
  const isBlocked = localTask.blocked ?? task.blocked ?? false;

  // Calculate overdue status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < today && currentStatus !== 'Done';
  const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
  const daysOverdue = dueDate && isOverdue ? Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
    onUpdate(localTask);
    setIsSaving(false);
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

  const handleDelete = () => {
    if (onDelete && task) {
      onDelete(task.id);
      setShowDeleteDialog(false);
      onClose();
    }
  };

  const TypeIcon = taskTypeIcons[currentType];

  // Field row component
  const FieldRow = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={cn(
      'flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-gray-800/50 transition-colors duration-200',
      className
    )}>
      <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="right" 
          width="medium" 
          className="p-0 flex flex-col overflow-hidden"
          hideClose
        >
          {/* PREMIUM HEADER */}
          <div className="relative shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>

            {/* Task type badge and title */}
            <div className="flex items-start gap-3 pr-12">
              <div className={cn(
                'w-3 h-3 rounded-full mt-1.5 shrink-0 ring-2 ring-white dark:ring-gray-900',
                priorityColors[currentPriority].dot
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Task
                  </span>
                  <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                    {task.title}
                  </h2>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {task.key}
                </span>
              </div>
            </div>
          </div>

          {/* PILL-STYLE TABS */}
          <div className="shrink-0 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
              {(['overview', 'activity', 'comments'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    'flex-1 px-4 py-2 text-[13px] font-medium rounded-full transition-all duration-200',
                    activeTab === tab
                      ? 'bg-[#5c7c5c] text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* SCROLLABLE BODY */}
          <SheetBody className="flex-1 overflow-y-auto px-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="py-2">
              {/* Status */}
                <FieldRow label="Status">
                  <Select
                    value={currentStatus}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, status: v as TaskStatus }))}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-[13px] bg-stone-50 border-stone-200">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          currentStatus === 'Backlog' && 'bg-gray-400',
                          currentStatus === 'Planned' && 'bg-blue-500',
                          currentStatus === 'In Progress' && 'bg-amber-500',
                          currentStatus === 'Waiting' && 'bg-purple-500',
                          currentStatus === 'Done' && 'bg-emerald-500'
                        )} />
                        <span>{currentStatus}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              s === 'Backlog' && 'bg-gray-400',
                              s === 'Planned' && 'bg-blue-500',
                              s === 'In Progress' && 'bg-amber-500',
                              s === 'Waiting' && 'bg-purple-500',
                              s === 'Done' && 'bg-emerald-500'
                            )} />
                            {s}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Team */}
                <FieldRow label="Team">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', teamColors[team?.color || 'olive'])} />
                    <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{team?.name || '—'}</span>
                  </div>
                </FieldRow>

                {/* Assignee */}
                <FieldRow label="Assignee">
                  <Select
                    value={localTask.assigneeId || task.assigneeId}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, assigneeId: v }))}
                  >
                    <SelectTrigger className="w-[220px] h-9 text-[13px] bg-stone-50 border-stone-200">
                      <SelectValue>
                        {assignee && (
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                              style={{ backgroundColor: assignee.avatarColor || '#8b7355' }}
                            >
                              {assignee.initials}
                            </div>
                            <span className="font-medium truncate">{assignee.name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[260px]">
                      {teamMembers.map((u, idx) => {
                        const avatarColors = ['#5c7c5c', '#8b7355', '#c69c6d', '#d4b896', '#6b8b6b'];
                        const avatarColor = u.avatarColor || avatarColors[idx % avatarColors.length];
                        return (
                          <SelectItem key={u.id} value={u.id} className="py-2">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
                                style={{ backgroundColor: avatarColor }}
                              >
                                {u.initials}
                              </div>
                              <div>
                                <div className="text-[13px] font-medium">{u.name}</div>
                                <div className="text-[11px] text-gray-500">{u.role || 'Team Member'}</div>
                              </div>
                              {u.id === (localTask.assigneeId || task.assigneeId) && (
                                <Check className="w-4 h-4 ml-auto text-[#5c7c5c]" />
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Due Date */}
                <FieldRow label="Due Date">
                  <div className="flex items-center gap-2">
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold dark:bg-red-900/40 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        {daysOverdue}d overdue
                      </span>
                    )}
                    {isDueToday && !isOverdue && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold dark:bg-amber-900/40 dark:text-amber-400">
                        Due Today
                      </span>
                    )}
                    <Input
                      type="date"
                      value={localTask.dueDate || task.dueDate || ''}
                      onChange={(e) => setLocalTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      className={cn(
                        'w-[160px] h-8 text-[13px]',
                        isOverdue && 'border-red-300 dark:border-red-700'
                      )}
                    />
                  </div>
                </FieldRow>

                {/* Priority */}
                <FieldRow label="Priority">
                  <Select
                    value={currentPriority}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, priority: v as Priority }))}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-[13px] bg-stone-50 border-stone-200">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2.5 h-2.5 rounded-full', priorityColors[currentPriority].dot)} />
                        <span>{currentPriority}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p} value={p}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2.5 h-2.5 rounded-full', priorityColors[p].dot)} />
                            <span>{p}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Task Type */}
                <FieldRow label="Task Type">
                  <Select
                    value={currentType}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, type: v as TaskType }))}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-[13px] bg-stone-50 border-stone-200">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-gray-500" />
                        <span>{currentType}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map(t => {
                        const Icon = taskTypeIcons[t];
                        return (
                          <SelectItem key={t} value={t}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-gray-500" />
                              <span>{t}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Linked Item - styled with brand colors */}
                {task.linkedItem && (
                  <FieldRow label="Linked Item">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bronze-50 text-bronze-600 text-[12px] font-mono font-medium border border-bronze-200 hover:bg-[#d4b896]/40 transition-colors cursor-pointer">
                      <Link2 className="w-3.5 h-3.5" />
                      {task.linkedItem.key}
                    </span>
                  </FieldRow>
                )}

                {/* Recurrence */}
                <FieldRow label="Recurrence">
                  <Select
                    value={currentRecurrence}
                    onValueChange={(v) => setLocalTask(prev => ({ ...prev, recurrence: v as RecurrenceType }))}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-[13px] bg-stone-50 border-stone-200">
                      <div className="flex items-center gap-2">
                        <RefreshCw className={cn(
                          'w-3.5 h-3.5 text-gray-400 transition-all duration-300',
                          currentRecurrence !== 'None' && 'text-[#5c7c5c] animate-spin'
                        )} style={{ animationDuration: '3s' }} />
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

                {/* Blocked Section */}
                <div className={cn(
                  'py-4 mt-2 -mx-6 px-6 transition-colors duration-200',
                  isBlocked && 'bg-red-50/50 dark:bg-red-900/10'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Blocked</span>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <Checkbox
                        checked={isBlocked}
                        onCheckedChange={handleBlockedChange}
                        className={cn(
                          'w-5 h-5 rounded transition-colors',
                          isBlocked && 'border-red-500 data-[state=checked]:bg-red-500'
                        )}
                      />
                      <span className={cn(
                        'text-[13px] font-medium transition-colors',
                        isBlocked ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
                      )}>
                        This task is blocked
                      </span>
                    </label>
                  </div>
                  
                  {isBlocked && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-[12px] font-medium text-red-700 dark:text-red-400">
                          Task is currently blocked
                        </span>
                      </div>
                      <Textarea
                        value={localTask.blockedReason ?? task.blockedReason ?? ''}
                        onChange={(e) => setLocalTask(prev => ({ ...prev, blockedReason: e.target.value }))}
                        placeholder="Describe what's blocking this task..."
                        className="text-[13px] min-h-[80px] border-red-200 dark:border-red-800 focus:ring-red-500"
                      />
                    </div>
                  )}
                </div>

                {/* Attention Alert */}
                {task.attentionLevel && task.attentionLevel !== 'neutral' && (
                  <div className={cn(
                    'flex items-center gap-3 p-4 rounded-lg mt-4 -mx-2',
                    task.attentionLevel === 'danger' && 'bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-900/20 border border-red-200 dark:border-red-800',
                    task.attentionLevel === 'warning' && 'bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800'
                  )}>
                    {task.attentionLevel === 'danger' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className={cn(
                        'text-[13px] font-semibold',
                        task.attentionLevel === 'danger' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
                      )}>
                        {task.attentionLevel === 'danger' ? 'Requires immediate attention' : 'This task needs follow-up'}
                      </span>
                      {isOverdue && task.attentionLevel === 'danger' && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                          {daysOverdue} days overdue
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Delete Task Section */}
                {onDelete && (
                  <div className="py-6 mt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(true)}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Task
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVITY TAB - No activity history available yet */}
            {activeTab === 'activity' && (
              <div className="py-4">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">No activity yet</h3>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">Activity history will appear here when available</p>
                </div>
              </div>
            )}

            {/* COMMENTS TAB */}
            {activeTab === 'comments' && (
              <div className="py-4">
                {/* Empty state */}
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">No comments yet</h3>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">Be the first to leave a comment</p>
                </div>
                
                {/* Comment input */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-[#5c7c5c] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    U
                  </div>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className={cn(
                        'text-[13px] min-h-[60px] transition-all duration-200',
                        commentText && 'min-h-[100px]'
                      )}
                    />
                    {commentText && (
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          className="bg-[#5c7c5c] hover:bg-[#4a6a4a] text-white"
                        >
                          Post Comment
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SheetBody>

          {/* FOOTER */}
          {activeTab === 'overview' && (
            <SheetFooter className="shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-[#5c7c5c] hover:bg-[#4a6a4a] text-white min-w-[120px] transition-all duration-200"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-[#5c7c5c] text-white text-[13px] font-medium rounded-lg shadow-lg z-[300] animate-fade-in">
          <Check className="w-4 h-4" />
          Task updated successfully
        </div>
      )}
    </>
  );
}

export default TaskDrawer;