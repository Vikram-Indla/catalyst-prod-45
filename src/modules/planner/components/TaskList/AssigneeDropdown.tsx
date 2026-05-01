/**
 * AssigneeDropdown - Searchable assignee picker with colored avatars
 * Extracted from TaskListRowV3 for modularity
 */

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { TaskListTask } from '../../hooks/useTaskList';

export interface AssigneeDropdownProps {
  task: TaskListTask;
  users: Array<{ id: string; name: string; initials: string }>;
  workstreamColor: string;
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

// Generate a color based on user name for consistent avatar colors
const getAvatarColor = (name: string) => {
  const colors = [
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#10b981', // emerald
    'var(--ds-text-warning, #f59e0b)', // amber
    'var(--ds-text-danger, #ef4444)', // red
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

export const AssigneeDropdown = memo(function AssigneeDropdown({ task, users, workstreamColor, width, onUpdate }: AssigneeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const lower = search.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(lower));
  }, [users, search]);

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
        <PopoverTrigger asChild>
          <button className="tl-assignee-cell">
            {task.assignee_name ? (
              <>
                {/* Avatar - 24px with colored background */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: workstreamColor || getAvatarColor(task.assignee_name) }}
                >
                  {getInitials(task.assignee_name)}
                </div>
                {/* Assignee name */}
                <span className="tl-assignee-name">{task.assignee_name}</span>
              </>
            ) : (
              <span className="tl-unassigned-btn">
                <Plus className="w-3 h-3" />
                Unassigned
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0 z-[500] bg-popover border border-border shadow-lg"
          align="start"
        >
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto p-1.5">
            {/* Unassigned option */}
            <button
              onClick={() => { onUpdate(task.id, 'assignee_id', null); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                !task.assignee_id ? "bg-muted font-semibold" : "hover:bg-muted/50"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                ?
              </div>
              <span className="text-muted-foreground">Unassigned</span>
              {!task.assignee_id && <Check className="w-4 h-4 ml-auto text-primary" />}
            </button>

            {/* User options */}
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => { onUpdate(task.id, 'assignee_id', user.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  user.id === task.assignee_id ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(user.name) }}
                >
                  {user.initials}
                </div>
                <span className="truncate">{user.name || 'Unnamed'}</span>
                {user.id === task.assignee_id && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </td>
  );
});
