import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BacklogQuickAddProps {
  type: string;
  programId?: string;
  piId?: string;
}

export function BacklogQuickAdd({ type, programId, piId }: BacklogQuickAddProps) {
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const createItemMutation = useMutation({
    mutationFn: async (itemName: string) => {
      const tableName = type === 'epic' ? 'epics' : 'features';
      
      const itemData: any = {
        name: itemName,
        state: 'backlog',
      };

      if (type === 'epic' && programId) {
        itemData.primary_program_id = programId;
      }

      if (type === 'feature' && programId) {
        itemData.program_id = programId;
        itemData.epic_id = null; // Required field for features
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`${type} created successfully`);
      setName('');
      setIsAdding(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create ${type}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createItemMutation.mutate(name.trim());
    }
  };

  if (!isAdding) {
    return (
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Quick add {type}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Enter ${type} name...`}
          autoFocus
          disabled={createItemMutation.isPending}
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!name.trim() || createItemMutation.isPending}
        >
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setName('');
            setIsAdding(false);
          }}
          disabled={createItemMutation.isPending}
        >
          Cancel
        </Button>
      </form>
    </div>
  );
}
