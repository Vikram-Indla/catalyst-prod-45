/**
 * CATALYST TESTS - Add Folder To Set Modal
 * Modal for adding folder cases to existing test sets
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { addFolderToSet } from '@/services/folderActionsService';
import { supabase } from '@/integrations/supabase/client';

interface AddFolderToSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: { id: string; name: string };
}

export const AddFolderToSetModal: React.FC<AddFolderToSetModalProps> = ({
  isOpen,
  onClose,
  folder,
}) => {
  const { programId } = useParams<{ programId: string }>();
  const queryClient = useQueryClient();
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch available sets
  const { data: sets = [] } = useQuery({
    queryKey: ['test-sets', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select('*')
        .eq('program_id', programId!)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!programId,
  });

  const filteredSets = sets.filter(set =>
    set.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: () => addFolderToSet({
      folder_id: folder.id,
      set_ids: selectedSetIds,
      program_id: programId!,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Cases added to set(s) successfully');
      onClose();
      setSelectedSetIds([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add cases: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (selectedSetIds.length === 0) {
      toast.error('Please select at least one set');
      return;
    }
    addMutation.mutate();
  };

  const toggleSet = (setId: string) => {
    setSelectedSetIds(prev =>
      prev.includes(setId)
        ? prev.filter(id => id !== setId)
        : [...prev, setId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to Set</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select sets to add cases from <strong>{folder.name}</strong> folder.
            Only cases with Approved status will be added.
          </p>

          <Input
            placeholder="Search sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <ScrollArea className="h-[400px] border border-border rounded-lg p-4">
            <div className="space-y-2">
              {filteredSets.map(set => (
                <div
                  key={set.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                  onClick={() => toggleSet(set.id)}
                >
                  <Checkbox
                    checked={selectedSetIds.includes(set.id)}
                    onCheckedChange={() => toggleSet(set.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{set.name}</p>
                    {set.objective && (
                      <p className="text-sm text-muted-foreground">{set.objective}</p>
                    )}
                  </div>
                </div>
              ))}
              {filteredSets.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No sets found
                </p>
              )}
            </div>
          </ScrollArea>

          <p className="text-sm text-muted-foreground">
            {selectedSetIds.length} set(s) selected
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || selectedSetIds.length === 0}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {addMutation.isPending ? 'Adding...' : 'Add to Set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
