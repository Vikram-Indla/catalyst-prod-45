import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickAddRowProps {
  itemType: string;
  onAdd?: () => void;
}

export function QuickAddRow({ itemType, onAdd }: QuickAddRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (itemName: string) => {
      const tableName = getTableName(itemType);
      const { data, error } = await supabase
        .from(tableName as any)
        .insert({ name: itemName } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      setName('');
      setIsAdding(false);
      onAdd?.();
    },
    onError: (error: any) => {
      toast.error(`Failed to create ${itemType}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate(name.trim());
    }
  };

  const handleCancel = () => {
    setName('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <div className="px-4 py-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add {itemType}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Input
          placeholder={`Enter ${itemType} name...`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!name.trim() || createMutation.isPending}
        >
          Add
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    theme: 'strategic_themes',
    epic: 'epics',
    capability: 'capabilities',
    feature: 'features',
    story: 'stories',
    defect: 'defects',
    objective: 'objectives',
  };
  return tableMap[type] || 'epics';
}
