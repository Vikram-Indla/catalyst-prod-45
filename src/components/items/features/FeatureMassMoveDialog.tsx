import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureMassMoveDialogProps {
  open: boolean;
  onClose: () => void;
  selectedFeatureIds: string[];
}

export function FeatureMassMoveDialog({ open, onClose, selectedFeatureIds }: FeatureMassMoveDialogProps) {
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const handleMassMove = async () => {
    toast.success(`Moving ${selectedFeatureIds.length} features`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mass Move Features</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Moving {selectedFeatureIds.length} selected feature(s)
          </div>

          <div className="space-y-2">
            <Label>Move to Program</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select program..." />
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

          <div className="space-y-2">
            <Label>Move to Program Increment</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select PI..." />
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMassMove}>
            Move Features
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
