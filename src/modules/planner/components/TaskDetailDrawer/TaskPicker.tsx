// ============================================================
// TASK PICKER - Modal for selecting tasks to link
// ============================================================

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, Check, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TaskPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (taskId: string) => void;
  excludeTaskId: string;
  title: string;
}

export function TaskPicker({ isOpen, onClose, onSelect, excludeTaskId, title }: TaskPickerProps) {
  const [search, setSearch] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['planner-tasks-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          id,
          key,
          title,
          status:planner_statuses(slug, name, color)
        `)
        .order('key', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.id === excludeTaskId) return false;
      if (!search.trim()) return true;
      const searchLower = search.toLowerCase();
      return (
        task.title?.toLowerCase().includes(searchLower) ||
        task.key?.toLowerCase().includes(searchLower)
      );
    });
  }, [tasks, search, excludeTaskId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        
        {/* Task List */}
        <div className="max-h-[300px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search.trim() ? 'No matching tasks' : 'No tasks available'}
            </div>
          ) : (
            filteredTasks.map(task => (
              <button
                key={task.id}
                onClick={() => {
                  onSelect(task.id);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-md transition-colors text-left"
              >
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {task.key}
                </span>
                <span className="flex-1 text-sm truncate">
                  {task.title}
                </span>
                <span className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  task.status?.color ? `bg-[${task.status.color}]` : 'bg-muted-foreground/50'
                )} style={{ backgroundColor: task.status?.color }} />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
