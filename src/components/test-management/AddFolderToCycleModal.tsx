/**
 * CATALYST TESTS - Add Folder To Cycle Modal
 * Modal for adding folder cases to existing test cycles
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { addFolderToCycle } from '@/services/folderActionsService';
import { supabase } from '@/integrations/supabase/client';

interface AddFolderToCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: { id: string; name: string };
}

export const AddFolderToCycleModal: React.FC<AddFolderToCycleModalProps> = ({
  isOpen,
  onClose,
  folder,
}) => {
  const { programId } = useParams<{ programId: string }>();
  const queryClient = useQueryClient();
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch available cycles
  const { data: cycles = [] } = useQuery({
    queryKey: ['test-cycles', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('program_id', programId!)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!programId,
  });

  const filteredCycles = cycles.filter(cycle =>
    cycle.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: () => addFolderToCycle({
      folder_id: folder.id,
      cycle_ids: selectedCycleIds,
      program_id: programId!,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cases added to cycle(s) successfully');
      onClose();
      setSelectedCycleIds([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add cases: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (selectedCycleIds.length === 0) {
      toast.error('Please select at least one cycle');
      return;
    }
    addMutation.mutate();
  };

  const toggleCycle = (cycleId: string) => {
    setSelectedCycleIds(prev =>
      prev.includes(cycleId)
        ? prev.filter(id => id !== cycleId)
        : [...prev, cycleId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planned': return 'bg-blue-500/10 text-blue-600';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-600';
      case 'completed': return 'bg-green-500/10 text-green-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to Cycle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select cycles to add cases from <strong>{folder.name}</strong> folder.
            Cases with Draft status will be excluded.
          </p>

          <Input
            placeholder="Search cycles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <ScrollArea className="h-[400px] border border-border rounded-lg p-4">
            <div className="space-y-2">
              {filteredCycles.map(cycle => (
                <div
                  key={cycle.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                  onClick={() => toggleCycle(cycle.id)}
                >
                  <Checkbox
                    checked={selectedCycleIds.includes(cycle.id)}
                    onCheckedChange={() => toggleCycle(cycle.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{cycle.name}</p>
                      <Badge variant="secondary" className={getStatusColor(cycle.status)}>
                        {cycle.status}
                      </Badge>
                    </div>
                    {cycle.description && (
                      <p className="text-sm text-muted-foreground">{cycle.description}</p>
                    )}
                  </div>
                </div>
              ))}
              {filteredCycles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No cycles found
                </p>
              )}
            </div>
          </ScrollArea>

          <p className="text-sm text-muted-foreground">
            {selectedCycleIds.length} cycle(s) selected
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || selectedCycleIds.length === 0}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {addMutation.isPending ? 'Adding...' : 'Add to Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
