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
import { useCreateFolder } from '@/hooks/useFolders';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentFolderId?: string | null;
  parentFolderName?: string;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  projectId,
  parentFolderId,
  parentFolderName,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const createFolder = useCreateFolder(projectId);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        parentId: parentFolderId || null,
        projectId,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isSubmitting = createFolder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {parentFolderId ? 'Create Subfolder' : 'Create Folder'}
            </DialogTitle>
            {parentFolderName && (
              <DialogDescription>
                Creating subfolder in "{parentFolderName}"
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              maxLength={100}
              className="mt-2"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {name.length}/100 characters
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
