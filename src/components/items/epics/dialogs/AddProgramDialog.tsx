import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

interface AddProgramDialogProps {
  epicId: string;
  primaryProgramId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProgramDialog({ epicId, primaryProgramId, open, onOpenChange }: AddProgramDialogProps) {
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch all programs
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current additional programs for this epic
  const { data: currentAdditionalPrograms } = useQuery({
    queryKey: ['epic-additional-programs', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_programs')
        .select('program_id')
        .eq('epic_id', epicId);
      if (error) throw error;
      return data?.map(p => p.program_id) || [];
    },
    enabled: open,
  });

  // Initialize selected programs when dialog opens
  useEffect(() => {
    if (open && currentAdditionalPrograms) {
      setSelectedPrograms(currentAdditionalPrograms);
    }
  }, [open, currentAdditionalPrograms]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing additional program links
      await supabase
        .from('epic_programs')
        .delete()
        .eq('epic_id', epicId);

      // Insert new additional program links
      if (selectedPrograms.length > 0) {
        const inserts = selectedPrograms.map((programId) => ({
          epic_id: epicId,
          program_id: programId,
        }));

        const { error } = await supabase
          .from('epic_programs')
          .insert(inserts);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-additional-programs', epicId] });
      toast.success('Additional programs updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update programs: ${error.message}`);
    },
  });

  const toggleProgram = (programId: string) => {
    // Don't allow selecting the primary program
    if (programId === primaryProgramId) return;
    setSelectedPrograms((prev) =>
      prev.includes(programId) ? prev.filter((id) => id !== programId) : [...prev, programId]
    );
  };

  const filteredPrograms = programs?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      p.id !== primaryProgramId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Additional Programs</DialogTitle>
          <DialogDescription>
            Select additional programs to associate with this epic
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[300px] border rounded-md p-4">
          <div className="space-y-3">
            {filteredPrograms?.map((program) => (
              <div key={program.id} className="flex items-center space-x-3">
                <Checkbox
                  id={program.id}
                  checked={selectedPrograms.includes(program.id)}
                  onCheckedChange={() => toggleProgram(program.id)}
                />
                <Label htmlFor={program.id} className="flex-1 cursor-pointer">
                  <div className="font-medium">{program.name}</div>
                </Label>
              </div>
            ))}
            {(!filteredPrograms || filteredPrograms.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                {searchQuery ? 'No programs match your search' : 'No additional programs available'}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="text-sm text-muted-foreground">
          {selectedPrograms.length} program(s) selected
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}