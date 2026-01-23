import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EpicLabelSelectorProps {
  epicId: string;
  onManageLabels?: () => void;
}

export function EpicLabelSelector({ epicId, onManageLabels }: EpicLabelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allLabels } = useQuery({
    queryKey: ['epic-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_labels')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: assignedLabels } = useQuery({
    queryKey: ['epic-label-assignments', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_label_assignments')
        .select('label_id, epic_labels(*)')
        .eq('epic_id', epicId);
      if (error) throw error;
      return data.map(a => a.epic_labels).filter(Boolean);
    },
  });

  const assignLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('epic_label_assignments')
        .insert({ epic_id: epicId, label_id: labelId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-label-assignments', epicId] });
      toast({ title: 'Label assigned' });
    },
  });

  const removeLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('epic_label_assignments')
        .delete()
        .eq('epic_id', epicId)
        .eq('label_id', labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-label-assignments', epicId] });
      toast({ title: 'Label removed' });
    },
  });

  const assignedLabelIds = new Set(assignedLabels?.map(l => l.id) || []);

  const handleToggleLabel = (labelId: string) => {
    if (assignedLabelIds.has(labelId)) {
      removeLabel.mutate(labelId);
    } else {
      assignLabel.mutate(labelId);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assignedLabels?.map((label) => (
        <Badge
          key={label.id}
          className={cn(
            "text-xs px-2 py-0.5 font-medium border-0",
            `bg-${label.color}-500 text-white`
          )}
        >
          {label.name}
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 text-muted-foreground">
            <Tag className="h-3 w-3" />
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Labels</h4>
              {onManageLabels && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onManageLabels}
                  className="h-auto p-1 text-xs"
                >
                  Manage
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-64 overflow-auto">
              {allLabels?.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                  onClick={() => handleToggleLabel(label.id)}
                >
                  <Checkbox checked={assignedLabelIds.has(label.id)} />
                  <div className={cn("w-3 h-3 rounded-full", `bg-${label.color}-500`)} />
                  <span className="text-sm flex-1">{label.name}</span>
                </div>
              ))}
              {(!allLabels || allLabels.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels available
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
