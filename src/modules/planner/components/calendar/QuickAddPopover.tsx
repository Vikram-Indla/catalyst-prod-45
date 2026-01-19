// ============================================================
// QUICK ADD POPOVER
// Click date → quick create task with title
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface QuickAddPopoverProps {
  date: Date;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  defaultStatusId?: string;
}

export function QuickAddPopover({ 
  date, 
  isOpen, 
  onOpenChange, 
  trigger,
  defaultStatusId 
}: QuickAddPopoverProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async (taskTitle: string) => {
      // Get default status if not provided
      let statusId = defaultStatusId;
      if (!statusId) {
        const { data: statuses } = await supabase
          .from('planner_statuses')
          .select('id')
          .order('position', { ascending: true })
          .limit(1);
        statusId = statuses?.[0]?.id;
      }

      const { data, error } = await supabase
        .from('planner_tasks')
        .insert([{
          title: taskTitle,
          due_date: format(date, 'yyyy-MM-dd'),
          status_id: statusId,
          priority: 'medium',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Task added for ${format(date, 'MMM d')}`);
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      setTitle('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createTask.mutate(title.trim());
    }
  };

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <form onSubmit={handleSubmit}>
          <div className="text-xs font-medium text-text-muted mb-2">
            {format(date, 'EEEE, MMMM d')}
          </div>
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="mb-3"
          />
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm" 
              disabled={!title.trim() || createTask.isPending}
            >
              {createTask.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
