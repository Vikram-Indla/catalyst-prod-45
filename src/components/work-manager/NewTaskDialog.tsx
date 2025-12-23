// src/components/work-manager/NewTaskDialog.tsx
// Dialog for creating a new task

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Task, TaskType, TaskStatus, Priority, Team, User } from './types';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  users: User[];
  onCreateTask: (task: Omit<Task, 'id' | 'key' | 'createdAt' | 'updatedAt'>) => void;
}

const taskTypes: TaskType[] = ['Project', 'Task', 'General'];
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const statuses: TaskStatus[] = ['Backlog', 'Planned', 'In Progress', 'Waiting', 'Done'];

export function NewTaskDialog({ open, onOpenChange, onCreateTask, teams, users }: NewTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('Task');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Backlog');
  const [teamId, setTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Ensure we always have a valid default team selected when the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (!teams.length) {
      setTeamId('');
      return;
    }
    if (!teamId || !teams.some(t => t.id === teamId)) {
      setTeamId(teams[0].id);
    }
  }, [open, teams, teamId]);

  // Filter team members by selected team
  const teamMembers = useMemo(() => {
    if (!teamId) return [];
    const team = teams.find(t => t.id === teamId);
    return users.filter(u => u.teamId === teamId || !!team?.memberIds.includes(u.id));
  }, [users, teams, teamId]);

  // If selected assignee is no longer valid, clear it.
  useEffect(() => {
    if (!open) return;
    if (assigneeId && !teamMembers.some(m => m.id === assigneeId)) {
      setAssigneeId('');
    }
  }, [open, assigneeId, teamMembers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;
    if (!teamId) {
      toast.error('Please select a team');
      return;
    }
    if (!teamMembers.length) {
      toast.error('This team has no members to assign');
      return;
    }

    const finalAssigneeId = assigneeId || teamMembers[0].id;

    onCreateTask({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
      status,
      assigneeId: finalAssigneeId,
      teamId,
      boardId: `board-${teamId}`,
      columnPosition: 0,
      dueDate: dueDate || undefined,
      blocked: false,
      linkedItem: null,
      recurrence: 'None',
      tags: [],
    });

    // Reset form
    setTitle('');
    setDescription('');
    setType('Task');
    setPriority('Medium');
    setStatus('Backlog');
    setDueDate('');
    setAssigneeId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description..."
              rows={3}
            />
          </div>

          {/* Type & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select
                value={teamId}
                onValueChange={(v) => {
                  setTeamId(v);
                  setAssigneeId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={!teamId || teamMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={teamId ? (teamMembers.length ? 'Select assignee' : 'No team members') : 'Select team first'} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.length ? (
                    teamMembers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      {teamId ? 'No members in this team' : 'Select a team to load members'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
