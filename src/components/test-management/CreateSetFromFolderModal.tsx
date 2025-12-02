/**
 * CATALYST TESTS - Create Set From Folder Modal
 * Modal for creating a test set from folder cases
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { BulkCaseSelector } from './BulkCaseSelector';
import { FolderCaseSummaryCard } from './FolderCaseSummaryCard';
import { getFolderCaseSummary, createSetFromFolder } from '@/services/folderActionsService';
import { supabase } from '@/integrations/supabase/client';
import type { CaseSelectionItem } from '@/types/folderActions.types';

interface CreateSetFromFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: { id: string; name: string };
}

export const CreateSetFromFolderModal: React.FC<CreateSetFromFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
}) => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [setName, setSetName] = useState(`Set from ${folder.name}`);
  const [description, setDescription] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // Fetch folder summary
  const { data: summary } = useQuery({
    queryKey: ['folder-summary', folder.id],
    queryFn: () => getFolderCaseSummary(folder.id, programId!),
    enabled: isOpen && !!programId,
  });

  // Fetch cases
  const { data: cases = [] } = useQuery({
    queryKey: ['folder-cases', folder.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('folder_id', folder.id)
        .eq('program_id', programId!);

      if (error) throw error;

      return data.map(c => ({
        id: c.id,
        case_key: c.id.slice(0, 8),
        title: c.title,
        status: c.status,
        priority: c.priority,
        is_eligible: c.status === 'approved',
        ineligibility_reason: c.status !== 'approved' ? 'Only Approved cases can be added to Sets' : undefined,
      })) as CaseSelectionItem[];
    },
    enabled: isOpen && !!programId,
  });

  // Auto-select eligible cases
  useEffect(() => {
    if (cases.length > 0 && selectedCaseIds.length === 0) {
      setSelectedCaseIds(cases.filter(c => c.is_eligible).map(c => c.id));
    }
  }, [cases]);

  const createMutation = useMutation({
    mutationFn: () => createSetFromFolder({
      folder_id: folder.id,
      set_name: setName,
      set_description: description,
      program_id: programId!,
      selected_case_ids: selectedCaseIds,
    }),
    onSuccess: (newSet) => {
      queryClient.invalidateQueries({ queryKey: ['test-sets'] });
      toast.success('Set created successfully');
      navigate(`/programs/${programId}/tests/sets/${newSet.id}`);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create set: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!setName.trim()) {
      toast.error('Please enter a set name');
      return;
    }
    if (selectedCaseIds.length === 0) {
      toast.error('Please select at least one case');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Set from Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {summary && <FolderCaseSummaryCard summary={summary} />}

          <div className="space-y-4">
            <div>
              <Label htmlFor="setName">Set Name *</Label>
              <Input
                id="setName"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Enter set name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter set description (optional)"
                rows={3}
              />
            </div>
          </div>

          <div>
            <Label>Select Cases</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Only cases with Approved status can be added to Sets.
            </p>
            <BulkCaseSelector
              cases={cases}
              selectedCaseIds={selectedCaseIds}
              onSelectionChange={setSelectedCaseIds}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || selectedCaseIds.length === 0}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
