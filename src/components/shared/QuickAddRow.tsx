import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export type CreateType = 'epic' | 'business_request';

interface QuickAddRowProps {
  columnsCount: number;
  label: string;
  placeholder: string;
  createType: CreateType;
  onCreated?: (id: string) => void;
}

// Map createType to query keys for invalidation
const getQueryKey = (type: CreateType): string[] => {
  switch (type) {
    case 'epic':
      return ['epics'];
    case 'business_request':
      return ['business-requests'];
  }
};

export function QuickAddRow({ 
  columnsCount, 
  label, 
  placeholder, 
  createType,
  onCreated 
}: QuickAddRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const queryKey = getQueryKey(createType);

  const createMutation = useMutation({
    mutationFn: async (title: string): Promise<{ id: string }> => {
      if (createType === 'business_request') {
        const { data, error } = await supabase
          .from('business_requests')
          .insert([{ title, process_step: 'NEW_REQUEST' }])
          .select('id')
          .single();
        if (error) throw error;
        return data;
      } else {
        // epic
        const { data, error } = await supabase
          .from('epics')
          .insert([{ name: title, state: 'not_started' as const, health: 'green' as const, global_rank: 9999 }])
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${label.replace('Add ', '')} created successfully`);
      setInputValue('');
      setIsAdding(false);
      setError(null);
      // Call onCreated callback to open drawer
      if (onCreated && data?.id) {
        onCreated(data.id);
      }
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to create item');
      toast.error('Failed to create item');
    }
  });

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Summary is required');
      return;
    }
    setError(null);
    createMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setIsAdding(false);
      setError(null);
    }
  };

  const handleCancel = () => {
    setInputValue('');
    setIsAdding(false);
    setError(null);
  };

  if (!isAdding) {
    return (
      <TableRow className="hover:bg-muted/50 border-t border-border">
        <TableCell colSpan={columnsCount} className="py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="w-full justify-start text-muted-foreground hover:text-foreground h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            {label}
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/30 border-t border-border">
      <TableCell colSpan={columnsCount} className="py-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="h-8 flex-1 max-w-md"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isPending || !inputValue.trim()}
              className="h-8 bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive ml-6">{error}</p>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
