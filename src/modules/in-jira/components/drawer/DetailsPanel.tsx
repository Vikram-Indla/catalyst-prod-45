/**
 * Details Panel Component
 * Right-side panel with editable issue fields
 */

import React from 'react';
import { 
  User, 
  Flag, 
  Layers, 
  Calendar, 
  GitBranch, 
  Tag,
  Component,
  Target,
  Clock,
  Folder,
  Link2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Issue, IssuePriority, IssueType } from '../../types';

interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface DetailsPanelProps {
  issue: Issue;
  users: User[];
  onFieldChange: (field: string, value: unknown) => void;
}

// Priority options with colors
const PRIORITIES: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'highest', label: 'Highest', color: 'text-red-600' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'low', label: 'Low', color: 'text-green-500' },
  { value: 'lowest', label: 'Lowest', color: 'text-blue-400' },
];

// Issue type options
const ISSUE_TYPES: { value: IssueType; label: string; color: string }[] = [
  { value: 'feature', label: 'Feature', color: 'bg-purple-500' },
  { value: 'story', label: 'Story', color: 'bg-green-500' },
  { value: 'subtask', label: 'Sub-task', color: 'bg-blue-400' },
  { value: 'defect', label: 'Bug', color: 'bg-red-500' },
  { value: 'incident', label: 'Incident', color: 'bg-orange-500' },
];

export function DetailsPanel({ issue, users, onFieldChange }: DetailsPanelProps) {
  const assignee = users.find(u => u.id === issue.assigneeId);
  const reporter = users.find(u => u.id === issue.reporterId);
  const currentPriority = PRIORITIES.find(p => p.value === issue.priority);
  const currentType = ISSUE_TYPES.find(t => t.value === issue.type);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Issue Type */}
        <FieldRow label="Type" icon={<Layers className="h-4 w-4" />}>
          <Select value={issue.type} onValueChange={(val) => onFieldChange('type', val)}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm", currentType?.color)} />
                  <span className="capitalize">{issue.type}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ISSUE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-sm", type.color)} />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Priority */}
        <FieldRow label="Priority" icon={<Flag className={cn("h-4 w-4", currentPriority?.color)} />}>
          <Select value={issue.priority} onValueChange={(val) => onFieldChange('priority', val)}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Flag className={cn("h-3.5 w-3.5", currentPriority?.color)} />
                  <span className="capitalize">{issue.priority}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  <div className="flex items-center gap-2">
                    <Flag className={cn("h-3.5 w-3.5", priority.color)} />
                    {priority.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <Separator />

        {/* Assignee */}
        <FieldRow label="Assignee" icon={<User className="h-4 w-4" />}>
          <Select 
            value={issue.assigneeId || 'unassigned'} 
            onValueChange={(val) => onFieldChange('assigneeId', val === 'unassigned' ? null : val)}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={assignee.avatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {assignee.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-text-tertiary">Unassigned</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <span className="text-text-tertiary">Unassigned</span>
              </SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Reporter */}
        <FieldRow label="Reporter" icon={<User className="h-4 w-4" />}>
          <div className="flex items-center gap-2 py-1">
            {reporter ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={reporter.avatarUrl} />
                  <AvatarFallback className="text-[10px]">
                    {reporter.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{reporter.name}</span>
              </>
            ) : (
              <span className="text-sm text-text-tertiary">Unknown</span>
            )}
          </div>
        </FieldRow>

        <Separator />

        {/* Labels */}
        <FieldRow label="Labels" icon={<Tag className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1">
            {issue.labels && issue.labels.length > 0 ? (
              issue.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))
            ) : (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-text-tertiary">
                + Add label
              </Button>
            )}
          </div>
        </FieldRow>

        {/* Story Points */}
        <FieldRow label="Story Points" icon={<Target className="h-4 w-4" />}>
          <Select 
            value={issue.storyPoints?.toString() || 'none'} 
            onValueChange={(val) => onFieldChange('storyPoints', val === 'none' ? null : parseInt(val))}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue>
                {issue.storyPoints !== undefined ? issue.storyPoints : 'None'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                <SelectItem key={points} value={points.toString()}>
                  {points}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Sprint */}
        {issue.sprintId && (
          <FieldRow label="Sprint" icon={<GitBranch className="h-4 w-4" />}>
            <div className="flex items-center gap-2 py-1">
              <span className="text-sm">Sprint {issue.sprintId}</span>
            </div>
          </FieldRow>
        )}

        <Separator />

        {/* Due Date */}
        <FieldRow label="Due Date" icon={<Calendar className="h-4 w-4" />}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-8 justify-start text-left font-normal px-2 w-full",
                  !issue.dueDate && "text-text-tertiary"
                )}
              >
                {issue.dueDate ? format(new Date(issue.dueDate), 'MMM d, yyyy') : 'None'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={issue.dueDate ? new Date(issue.dueDate) : undefined}
                onSelect={(date) => onFieldChange('dueDate', date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </FieldRow>

        <Separator />

        {/* Parent Issue / Epic */}
        {issue.parentId && (
          <FieldRow label="Parent" icon={<Folder className="h-4 w-4" />}>
            <Button variant="link" className="h-auto p-0 text-sm text-accent-primary">
              {issue.parentId}
            </Button>
          </FieldRow>
        )}

        {issue.epicId && (
          <FieldRow label="Epic" icon={<Folder className="h-4 w-4" />}>
            <Button variant="link" className="h-auto p-0 text-sm text-purple-600">
              {issue.epicId}
            </Button>
          </FieldRow>
        )}

        <Separator />

        {/* Timestamps */}
        <FieldRow label="Created" icon={<Clock className="h-4 w-4" />}>
          <span className="text-sm text-text-secondary">
            {format(new Date(issue.createdAt), 'MMM d, yyyy h:mm a')}
          </span>
        </FieldRow>

        <FieldRow label="Updated" icon={<Clock className="h-4 w-4" />}>
          <span className="text-sm text-text-secondary">
            {format(new Date(issue.updatedAt), 'MMM d, yyyy h:mm a')}
          </span>
        </FieldRow>

        {/* Links Section */}
        <Separator />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Linked Issues
            </label>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              + Link
            </Button>
          </div>
          <div className="text-sm text-text-tertiary text-center py-2">
            No linked issues
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function FieldRow({ 
  label, 
  icon, 
  children 
}: { 
  label: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide flex items-center gap-1.5 mb-1">
        {icon}
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default DetailsPanel;
