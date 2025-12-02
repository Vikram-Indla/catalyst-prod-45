import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  executionCount?: number;
  onConfirm: (cascadeDelete: boolean) => Promise<void>;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  executionCount = 0,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [cascadeDelete, setCascadeDelete] = useState(true);
  const [loading, setLoading] = useState(false);

  const isConfirmed = confirmText === 'DELETE';

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
      await onConfirm(cascadeDelete);
      onClose();
      setConfirmText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Test Cases
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-2">
            <p className="font-semibold">⚠️ This action cannot be undone</p>
            <ul className="text-sm space-y-1">
              <li>• {selectedCount} test cases will be deleted</li>
              {executionCount > 0 && <li>• {executionCount} executions will be deleted</li>}
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="cascade"
              checked={cascadeDelete}
              onCheckedChange={(checked) => setCascadeDelete(checked as boolean)}
            />
            <Label htmlFor="cascade">Also delete all execution history</Label>
          </div>

          <div className="space-y-2">
            <Label>Type <strong>DELETE</strong> to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!isConfirmed || loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
