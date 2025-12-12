import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QuickAddEpicRowProps {
  columnsCount: number;
}

export function QuickAddEpicRow({ columnsCount }: QuickAddEpicRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [epicName, setEpicName] = useState('');
  const queryClient = useQueryClient();

  const createEpicMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('epics')
        .insert([{
          name: name,
          state: 'not_started' as const,
          health: 'green' as const,
          global_rank: 9999
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(`Epic "${data.name}" created successfully`);
      setEpicName('');
      setIsAdding(false);
    },
    onError: () => {
      toast.error('Failed to create epic');
    }
  });

  const handleSubmit = () => {
    if (!epicName.trim()) {
      toast.error('Epic name is required');
      return;
    }
    createEpicMutation.mutate(epicName.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEpicName('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <TableRow className="hover:bg-muted/50">
        <TableCell colSpan={columnsCount}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Business Request
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={2}>
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Enter Business Request name..."
            value={epicName}
            onChange={(e) => setEpicName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8"
          />
        </div>
      </TableCell>
      <TableCell colSpan={columnsCount - 2}>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createEpicMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEpicName('');
              setIsAdding(false);
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
