/**
 * CATALYST TESTS - Create Cycle From Folder Modal
 * 3-step wizard for creating test cycle from folder cases
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BulkCaseSelector } from './BulkCaseSelector';
import { FolderCaseSummaryCard } from './FolderCaseSummaryCard';
import { UserAssignmentTable } from './UserAssignmentTable';
import { getFolderCaseSummary, createCycleFromFolder } from '@/services/folderActionsService';
import { supabase } from '@/integrations/supabase/client';
import type { CaseSelectionItem } from '@/types/folderActions.types';

interface CreateCycleFromFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: { id: string; name: string };
}

export const CreateCycleFromFolderModal: React.FC<CreateCycleFromFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
}) => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cycleName, setCycleName] = useState(`Cycle from ${folder.name}`);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [userAssignments, setUserAssignments] = useState<Record<string, string>>({});
  const [assignToCaseOwners, setAssignToCaseOwners] = useState(false);

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
        is_eligible: c.status !== 'draft',
        ineligibility_reason: c.status === 'draft' ? 'Draft cases cannot be added to Cycles' : undefined,
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
    mutationFn: () => createCycleFromFolder({
      folder_id: folder.id,
      cycle_name: cycleName,
      cycle_description: description,
      start_date: startDate,
      end_date: endDate,
      program_id: programId!,
      selected_case_ids: selectedCaseIds,
      assign_to_case_owners: assignToCaseOwners,
      user_assignments: userAssignments,
    }),
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cycle created successfully');
      navigate(`/programs/${programId}/tests/cycles/${newCycle.id}`);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create cycle: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!cycleName.trim()) {
      toast.error('Please enter a cycle name');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date');
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Cycle from Folder</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="assign">Assign Users</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {summary && <FolderCaseSummaryCard summary={summary} />}

            <div className="space-y-4">
              <div>
                <Label htmlFor="cycleName">Cycle Name *</Label>
                <Input
                  id="cycleName"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  placeholder="Enter cycle name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter cycle description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cases">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Cases with Draft status cannot be added to Cycles.
              </p>
              <BulkCaseSelector
                cases={cases}
                selectedCaseIds={selectedCaseIds}
                onSelectionChange={setSelectedCaseIds}
              />
            </div>
          </TabsContent>

          <TabsContent value="assign">
            <UserAssignmentTable
              cases={cases.filter(c => selectedCaseIds.includes(c.id))}
              assignments={userAssignments}
              onAssignmentsChange={setUserAssignments}
              assignToCaseOwners={assignToCaseOwners}
              onAssignToCaseOwnersChange={setAssignToCaseOwners}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || selectedCaseIds.length === 0}
            className="bg-brand-gold hover:bg-brand-gold/90"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
