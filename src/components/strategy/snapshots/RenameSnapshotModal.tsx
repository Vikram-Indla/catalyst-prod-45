import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRenameSnapshot, StrategicSnapshot } from '@/hooks/useStrategicSnapshots';
import { supabase } from '@/integrations/supabase/client';

interface RenameSnapshotModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot;
}

export function RenameSnapshotModal({ open, onClose, snapshot }: RenameSnapshotModalProps) {
  const [name, setName] = useState(snapshot.name);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const renameSnapshot = useRenameSnapshot();

  useEffect(() => {
    if (open) {
      setName(snapshot.name);
      setError(null);
    }
  }, [open, snapshot.name]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'Snapshot name is required.';
    if (trimmed.length < 3) return 'Name must be at least 3 characters.';
    if (trimmed.length > 80) return 'Name must be less than 80 characters.';
    return null;
  };

  const checkDuplicateName = async (value: string): Promise<boolean> => {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === snapshot.name.toLowerCase()) {
      return false; // Same name, no duplicate
    }

    const { data, error } = await supabase
      .from('strategy_snapshots')
      .select('id')
      .ilike('name', trimmed)
      .neq('id', snapshot.id)
      .limit(1);

    if (error) return false;
    return (data?.length || 0) > 0;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    // Validate
    const validationError = validateName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check for duplicates
    setIsChecking(true);
    const isDuplicate = await checkDuplicateName(trimmedName);
    setIsChecking(false);

    if (isDuplicate) {
      setError('A snapshot with this name already exists.');
      return;
    }

    // Save
    try {
      await renameSnapshot.mutateAsync({ id: snapshot.id, name: trimmedName });
      onClose();
    } catch (err: any) {
      setError(err.message || "Couldn't rename snapshot.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !renameSnapshot.isPending && !isChecking) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Rename snapshot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="snapshot-name">Snapshot name</Label>
            <Input
              id="snapshot-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Enter snapshot name"
              autoFocus
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This changes the name shown across Strategy Room and Strategic Backlog.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={renameSnapshot.isPending || isChecking}
          >
            {renameSnapshot.isPending || isChecking ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
