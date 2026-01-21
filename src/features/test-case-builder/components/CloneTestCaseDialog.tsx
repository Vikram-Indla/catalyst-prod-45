// =====================================================
// CLONE TEST CASE DIALOG
// Dialog for cloning/duplicating test cases
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Copy, FolderOpen } from 'lucide-react';
import { useCloneTestCase } from '@/hooks/test-cases/useVersionHistory';
import { toast } from 'sonner';

interface CloneTestCaseDialogProps {
  caseId: string;
  currentTitle: string;
  trigger?: React.ReactNode;
  onCloned?: (newCaseId: string) => void;
}

export function CloneTestCaseDialog({ 
  caseId, 
  currentTitle, 
  trigger,
  onCloned 
}: CloneTestCaseDialogProps) {
  const cloneCase = useCloneTestCase();
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(`${currentTitle} (Copy)`);
  const [targetFolderId, setTargetFolderId] = useState('');

  const handleClone = async () => {
    try {
      const newCaseId = await cloneCase.mutateAsync({
        caseId,
        newTitle: newTitle.trim() || undefined,
        targetFolderId: targetFolderId.trim() || undefined,
      });
      
      toast.success('Test case cloned successfully');
      setIsOpen(false);
      onCloned?.(newCaseId);
    } catch (error) {
      toast.error('Failed to clone test case');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-1" />
            Clone
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Test Case
          </DialogTitle>
          <DialogDescription>
            Create a copy of this test case with all steps and requirement links.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newTitle">New Title</Label>
            <Input
              id="newTitle"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter title for the cloned test case"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="targetFolder" className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4" />
              Target Folder (optional)
            </Label>
            <Input
              id="targetFolder"
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              placeholder="Leave empty to clone in same folder"
            />
            <p className="text-xs text-muted-foreground">
              Enter folder ID or leave empty to keep in the same folder
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleClone} 
            disabled={cloneCase.isPending || !newTitle.trim()}
          >
            {cloneCase.isPending ? 'Cloning...' : 'Clone Test Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
