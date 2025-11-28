import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface MassMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEpics: string[];
  onConfirm: (programId: string, piId: string) => void;
}

export function MassMoveDialog({
  open,
  onOpenChange,
  selectedEpics,
  onConfirm,
}: MassMoveDialogProps) {
  const [targetProgram, setTargetProgram] = useState('');
  const [targetPI, setTargetPI] = useState('');

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('*').order('name');
      return data || [];
    },
  });

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase.from('program_increments').select('*').order('name');
      return data || [];
    },
  });

  const handleConfirm = () => {
    if (targetProgram && targetPI) {
      onConfirm(targetProgram, targetPI);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mass Move Epics</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Move {selectedEpics.length} selected epic(s) to a different program and PI
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Selected Epics</Label>
            <Badge variant="secondary" className="mt-2">
              {selectedEpics.length} epic(s) selected
            </Badge>
          </div>

          <div>
            <Label>Target Program</Label>
            <Select value={targetProgram} onValueChange={setTargetProgram}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target program" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Program Increment</Label>
            <Select value={targetPI} onValueChange={setTargetPI}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target PI" />
              </SelectTrigger>
              <SelectContent>
                {programIncrements?.map((pi) => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
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
            onClick={handleConfirm}
            disabled={!targetProgram || !targetPI}
          >
            Move Epics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
