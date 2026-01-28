// ============================================================
// LABELS SELECTOR - Task labels with add functionality
// Uses database for persistence
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Predefined label colors
const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  red: { bg: 'bg-red-500', text: 'text-white' },
  orange: { bg: 'bg-orange-500', text: 'text-white' },
  yellow: { bg: 'bg-yellow-500', text: 'text-black' },
  green: { bg: 'bg-green-500', text: 'text-white' },
  blue: { bg: 'bg-blue-500', text: 'text-white' },
  purple: { bg: 'bg-purple-500', text: 'text-white' },
  pink: { bg: 'bg-pink-500', text: 'text-white' },
  gray: { bg: 'bg-gray-500', text: 'text-white' },
};

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelsSelectorProps {
  taskId: string;
  selectedLabels?: string[]; // Not used - we fetch from DB
  onLabelsChange?: (labels: string[]) => void; // Not used - we persist to DB
}

export function LabelsSelector({ taskId }: LabelsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const queryClient = useQueryClient();

  // Fetch all available labels
  const { data: allLabels = [] } = useQuery({
    queryKey: ['task-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Label[];
    },
  });

  // Fetch assigned labels for this task
  const { data: assignedLabelIds = [] } = useQuery({
    queryKey: ['task-label-assignments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_label_assignments')
        .select('label_id')
        .eq('task_id', taskId);
      if (error) throw error;
      return data.map(d => d.label_id);
    },
    enabled: !!taskId,
  });

  // Toggle label assignment
  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const isAssigned = assignedLabelIds.includes(labelId);
      
      if (isAssigned) {
        const { error } = await supabase
          .from('task_label_assignments')
          .delete()
          .eq('task_id', taskId)
          .eq('label_id', labelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_label_assignments')
          .insert({ task_id: taskId, label_id: labelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-label-assignments', taskId] });
    },
    onError: () => {
      toast.error('Failed to update label');
    },
  });

  // Create new label
  const createLabel = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('task_labels')
        .insert({ name, color: 'blue' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
      // Also assign to current task
      toggleLabel.mutate(data.id);
      setNewLabelName('');
      setIsCreating(false);
      toast.success('Label created');
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Label already exists');
      } else {
        toast.error('Failed to create label');
      }
    },
  });

  const getColorClasses = (color: string) => {
    return LABEL_COLORS[color] || LABEL_COLORS.gray;
  };

  const assignedLabels = allLabels.filter(l => assignedLabelIds.includes(l.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors min-h-[28px]">
          {assignedLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {assignedLabels.map(label => {
                const colors = getColorClasses(label.color);
                return (
                  <Badge
                    key={label.id}
                    className={cn(
                      "text-xs px-2 py-0.5 font-medium border-0",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {label.name}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Add labels...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[500] bg-popover" align="end">
        <div className="p-2 border-b border-border">
          <p className="text-sm font-medium text-foreground">Select Labels</p>
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1">
          {allLabels.map(label => {
            const colors = getColorClasses(label.color);
            const isSelected = assignedLabelIds.includes(label.id);
            
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel.mutate(label.id)}
                disabled={toggleLabel.isPending}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
                  isSelected ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full", colors.bg)} />
                <span className="text-sm flex-1 text-left">{label.name}</span>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-border">
          {isCreating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLabelName.trim()) {
                    createLabel.mutate(newLabelName.trim());
                  }
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewLabelName('');
                  }
                }}
                placeholder="Label name..."
                className="flex-1 px-2 py-1 text-sm bg-muted rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => newLabelName.trim() && createLabel.mutate(newLabelName.trim())}
                disabled={!newLabelName.trim() || createLabel.isPending}
                className="p-1 hover:bg-muted rounded"
              >
                {createLabel.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create new label
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}