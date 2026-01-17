/**
 * New Folder Modal
 * Create a new folder in the repository - wired to Supabase
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderPlus } from 'lucide-react';
import { useCreateFolder, useProjects } from '@/hooks/test-management';
import { catalystToast } from '@/lib/catalystToast';

interface NewFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
  parentFolderName?: string;
}

export function NewFolderModal({ 
  open, 
  onOpenChange, 
  parentFolderId,
  parentFolderName 
}: NewFolderModalProps) {
  const [name, setName] = useState('');
  
  // Get current project
  const { data: projects } = useProjects();
  const projectId = projects?.[0]?.id;
  
  // Use real Supabase mutation
  const createFolder = useCreateFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !projectId) return;

    createFolder.mutate(
      {
        project_id: projectId,
        name: name.trim(),
        parent_id: parentFolderId || null,
      },
      {
        onSuccess: () => {
          setName('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-500" />
            New Folder
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {parentFolderName && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              Creating in: <span className="font-medium text-foreground">{parentFolderName}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Authentication Module"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={createFolder.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createFolder.isPending || !projectId}
            >
              {createFolder.isPending ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
