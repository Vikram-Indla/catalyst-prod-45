import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface PullRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sourceEpicId: string) => void;
}

export function PullRankDialog({ open, onOpenChange, onConfirm }: PullRankDialogProps) {
  const [selectedEpicId, setSelectedEpicId] = useState<string>('');

  const { data: epics } = useQuery({
    queryKey: ['epics-for-pull-rank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, global_rank')
        .is('deleted_at', null)
        .order('global_rank');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const handleConfirm = () => {
    if (selectedEpicId) {
      onConfirm(selectedEpicId);
      onOpenChange(false);
      setSelectedEpicId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pull Rank</DialogTitle>
          <DialogDescription>
            Copy ranking position from another epic
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="source-epic">Source Epic</Label>
          <Select value={selectedEpicId} onValueChange={setSelectedEpicId}>
            <SelectTrigger id="source-epic" className="mt-2">
              <SelectValue placeholder="Select epic to copy rank from" />
            </SelectTrigger>
            <SelectContent>
              {epics?.map((epic) => (
                <SelectItem key={epic.id} value={epic.id}>
                  {epic.epic_key || epic.name} - Rank {epic.global_rank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedEpicId}>
            Pull Rank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
