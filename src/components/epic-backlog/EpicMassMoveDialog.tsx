import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Move, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EpicMassMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicIds: string[];
  onSuccess: () => void;
}

// NOTE: No PI/Program Increment options - Catalyst vNext does not use PIs
const EPIC_STATES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

export function EpicMassMoveDialog({
  open,
  onOpenChange,
  epicIds,
  onSuccess,
}: EpicMassMoveDialogProps) {
  const queryClient = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  // Fetch programs for dropdown
  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users/profiles for owner dropdown
  const { data: owners } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {};
      
      if (selectedProgram) {
        updates.primary_program_id = selectedProgram;
      }
      if (selectedOwner) {
        updates.owner_id = selectedOwner;
        // Also update owner_name for display
        const owner = owners?.find(o => o.id === selectedOwner);
        if (owner) {
          updates.owner_name = owner.full_name || owner.email;
        }
      }
      if (selectedState) {
        updates.state = selectedState;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('Please select at least one field to update');
      }

      const { error } = await supabase
        .from('epics')
        .update(updates)
        .in('id', epicIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-backlog'] });
      toast.success(`${epicIds.length} epic(s) updated successfully`);
      onSuccess();
      onOpenChange(false);
      // Reset selections
      setSelectedProgram('');
      setSelectedOwner('');
      setSelectedState('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleMove = () => {
    if (!selectedProgram && !selectedOwner && !selectedState) {
      toast.error('Please select at least one field to update');
      return;
    }
    moveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5 text-brand-gold" />
            Mass Move Epics
          </DialogTitle>
          <DialogDescription>
            Update multiple epics at once. Only filled fields will be updated.
          </DialogDescription>
        </DialogHeader>

        {epicIds.length === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No epics selected. Please select epics from the list first.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Updating <strong>{epicIds.length}</strong> epic(s)
          </p>

          {/* Program Selection */}
          <div className="space-y-2">
            <Label htmlFor="program">Move to Program</Label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger id="program">
                <SelectValue placeholder="Select program..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- No change --</SelectItem>
                {programs?.map(program => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner Selection */}
          <div className="space-y-2">
            <Label htmlFor="owner">Assign Owner</Label>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger id="owner">
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- No change --</SelectItem>
                {owners?.map(owner => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.full_name || owner.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State Selection */}
          <div className="space-y-2">
            <Label htmlFor="state">Change State</Label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- No change --</SelectItem>
                {EPIC_STATES.map(state => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove}
            disabled={moveMutation.isPending || epicIds.length === 0}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {moveMutation.isPending ? 'Updating...' : 'Update Epics'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
