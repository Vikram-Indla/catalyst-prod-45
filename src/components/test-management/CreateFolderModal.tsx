/**
 * CATALYST TESTS - Create Folder Modal
 * Modal for creating new test folders
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestFolder } from '@/types/test-management';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: TestFolder[];
  entityType: 'test_cases' | 'test_sets' | 'test_cycles';
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  folders,
  entityType,
}) => {
  const { programId } = useParams<{ programId: string }>();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string>('none');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!programId) throw new Error('Program ID is required');
      if (!name.trim()) throw new Error('Folder name is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Convert "none" to null for root level folders
      const parentId = parentFolderId === 'none' || !parentFolderId ? null : parentFolderId;

      const { data, error } = await supabase
        .from('test_folders')
        .insert({
          name: name.trim(),
          parent_folder_id: parentId,
          program_id: programId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-folders'] });
      toast.success('Folder created successfully');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });

  const handleClose = () => {
    setName('');
    setParentFolderId('none');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your test artifacts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Folder Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Folder</Label>
              <Select value={parentFolderId} onValueChange={setParentFolderId}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Select parent folder (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root level)</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
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
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold/90"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
