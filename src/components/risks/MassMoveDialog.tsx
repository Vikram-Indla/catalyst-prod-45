// Mass Move Dialog - Bulk move risks to Program Increment
// Source: Implementation Spec Section 5

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MassMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (piId: string) => void;
  selectedCount: number;
}

export function MassMoveDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: MassMoveDialogProps) {
  const [selectedPiId, setSelectedPiId] = useState<string>("");

  const { data: programIncrements = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  const handleConfirm = () => {
    if (selectedPiId) {
      onConfirm(selectedPiId);
      setSelectedPiId("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Program Increment</DialogTitle>
          <DialogDescription>
            Move {selectedCount} selected {selectedCount === 1 ? 'risk' : 'risks'} to a Program Increment.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={selectedPiId} onValueChange={setSelectedPiId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Program Increment" />
            </SelectTrigger>
            <SelectContent>
              {programIncrements.map((pi) => (
                <SelectItem key={pi.id} value={pi.id}>
                  {pi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPiId}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            Move to PI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
