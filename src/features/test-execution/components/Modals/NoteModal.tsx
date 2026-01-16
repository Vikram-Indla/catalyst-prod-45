/**
 * NoteModal - Modal for adding notes to a step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepNumber: number;
  initialNote: string;
  onSave: (note: string) => void;
}

export function NoteModal({
  isOpen,
  onClose,
  stepNumber,
  initialNote,
  onSave,
}: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  
  const handleSave = () => {
    onSave(note);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Add Note
          </DialogTitle>
          <DialogDescription>
            Add a note for Step {stepNumber}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter your notes about this step..."
            className="min-h-[150px]"
            autoFocus
          />
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
