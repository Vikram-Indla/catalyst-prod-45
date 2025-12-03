/**
 * Create Folder Modal - Dialog for creating new folders
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFolder, validateFolderName } from '@/services/folderService';
import { FolderNode, EntityType } from '@/types/folder';
import { useToast } from '@/hooks/use-toast';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType: EntityType;
  programId: string;
  folders: FolderNode[];
  parentId?: string | null;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  programId,
  folders,
  parentId = null
}) => {
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateFolderName(name);
    if (!validation.valid) {
      toast({
        title: 'Invalid folder name',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert "none" to null for root level folders
      const parentIdValue = selectedParentId === 'none' || !selectedParentId ? null : selectedParentId;
      
      await createFolder({
        name,
        parent_id: parentIdValue,
        entity_type: entityType,
        program_id: programId
      });

      toast({
        title: 'Folder created',
        description: `"${name}" has been created successfully`
      });

      // Reset form state
      setName('');
      setSelectedParentId(parentId);
      
      // Trigger refresh callback
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error creating folder',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFolderOptions = (nodes: FolderNode[], prefix = ''): React.ReactNode => {
    return nodes.map((folder) => {
      if (folder.is_system) return null;
      
      return (
        <React.Fragment key={folder.id}>
          <SelectItem value={folder.id}>
            {prefix}{folder.name}
          </SelectItem>
          {folder.children.length > 0 && renderFolderOptions(folder.children, prefix + '  ')}
        </React.Fragment>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your {entityType.replace('_', ' ')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name *</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
            <Select value={selectedParentId || undefined} onValueChange={(value) => setSelectedParentId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="No parent (root level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root level)</SelectItem>
                {renderFolderOptions(folders)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
