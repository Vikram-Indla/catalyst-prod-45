/**
 * Create Folder Modal - Phase 5 Ruthless Rebuild
 * Actually creates folders and adds them to the sidebar
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MockFolder } from './mockCycleData';

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: MockFolder[];
  onCreate: (name: string, parentId: string | null) => void;
}

export function CreateFolderModal({
  open,
  onOpenChange,
  folders,
  onCreate,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('root');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), parentId === 'root' ? null : parentId);
    setName('');
    setParentId('root');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('');
      setParentId('root');
    }
    onOpenChange(newOpen);
  };

  // Flatten folders for parent selection
  const flatFolders = folders.reduce<{ id: string; name: string; depth: number }[]>((acc, folder) => {
    acc.push({ id: folder.id, name: folder.name, depth: 0 });
    folder.children.forEach(child => {
      acc.push({ id: child.id, name: child.name, depth: 1 });
    });
    return acc;
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name *</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Smoke Tests"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Parent Folder</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root Level (No Parent)</SelectItem>
                  {flatFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.depth > 0 ? '└─ ' : ''}{folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateFolderModal;
