/**
 * Rename Folder Modal - Per T1 Folder Management spec
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateFolder, validateFolderName } from '@/services/folderService';
import type { FolderNode } from '@/types/folder';
import { useToast } from '@/hooks/use-toast';

interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FolderNode;
  onSuccess: () => void;
}

export const RenameFolderModal: React.FC<RenameFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
  onSuccess
}) => {
  const { toast } = useToast();
  const [name, setName] = useState(folder.name);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(folder.name);
      setError(null);
    }
  }, [isOpen, folder.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    
    // Validate name
    const validation = validateFolderName(trimmedName);
    if (!validation.valid) {
      setError(validation.error || 'Invalid folder name');
      return;
    }

    if (trimmedName === folder.name) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await updateFolder(folder.id, { name: trimmedName });
      toast({
        title: 'Folder renamed',
        description: `Folder renamed to "${trimmedName}"`
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for "{folder.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
              maxLength={100}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
