/**
 * Bulk Operations Toolbar - Actions for selected test cases
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronDown,
  Trash2,
  FolderInput,
  Copy,
  Archive,
  Tag,
  Users,
  Play,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkOperationsToolbarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkMove: (ids: string[], folderId: string) => Promise<void>;
  onBulkCopy: (ids: string[], folderId: string) => Promise<void>;
  onBulkArchive: (ids: string[]) => Promise<void>;
  onBulkTag: (ids: string[], tags: string[]) => Promise<void>;
  onBulkAssign: (ids: string[], assigneeId: string) => Promise<void>;
  onBulkAddToCycle?: (ids: string[], cycleId: string) => Promise<void>;
  folders: Array<{ id: string; name: string }>;
  cycles?: Array<{ id: string; name: string }>;
  assignees?: Array<{ id: string; name: string }>;
}

export const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBulkDelete,
  onBulkMove,
  onBulkCopy,
  onBulkArchive,
  onBulkTag,
  onBulkAssign,
  onBulkAddToCycle,
  folders,
  cycles = [],
  assignees = [],
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onBulkDelete(selectedIds);
      setIsDeleteDialogOpen(false);
      onClearSelection();
      toast.success(`${selectedCount} test case(s) deleted`);
    } catch (error) {
      toast.error('Failed to delete test cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMove = async () => {
    if (!selectedFolderId) return;
    setIsLoading(true);
    try {
      await onBulkMove(selectedIds, selectedFolderId);
      setIsMoveDialogOpen(false);
      setSelectedFolderId('');
      onClearSelection();
      toast.success(`${selectedCount} test case(s) moved`);
    } catch (error) {
      toast.error('Failed to move test cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedFolderId) return;
    setIsLoading(true);
    try {
      await onBulkCopy(selectedIds, selectedFolderId);
      setIsCopyDialogOpen(false);
      setSelectedFolderId('');
      toast.success(`${selectedCount} test case(s) copied`);
    } catch (error) {
      toast.error('Failed to copy test cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await onBulkArchive(selectedIds);
      onClearSelection();
      toast.success(`${selectedCount} test case(s) archived`);
    } catch (error) {
      toast.error('Failed to archive test cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTag = async () => {
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) return;
    setIsLoading(true);
    try {
      await onBulkTag(selectedIds, tags);
      setIsTagDialogOpen(false);
      setTagInput('');
      toast.success(`Tags added to ${selectedCount} test case(s)`);
    } catch (error) {
      toast.error('Failed to add tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssigneeId) return;
    setIsLoading(true);
    try {
      await onBulkAssign(selectedIds, selectedAssigneeId);
      setIsAssignDialogOpen(false);
      setSelectedAssigneeId('');
      toast.success(`${selectedCount} test case(s) assigned`);
    } catch (error) {
      toast.error('Failed to assign test cases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCycle = async () => {
    if (!selectedCycleId || !onBulkAddToCycle) return;
    setIsLoading(true);
    try {
      await onBulkAddToCycle(selectedIds, selectedCycleId);
      setIsCycleDialogOpen(false);
      setSelectedCycleId('');
      toast.success(`${selectedCount} test case(s) added to cycle`);
    } catch (error) {
      toast.error('Failed to add to cycle');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-brand-gold/10 border border-brand-gold/30 rounded-lg">
        <Badge className="bg-brand-gold text-brand-dark">
          {selectedCount} selected
        </Badge>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setIsMoveDialogOpen(true)}>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCopyDialogOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsTagDialogOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAssignDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Assign Owner
              </DropdownMenuItem>
              {onBulkAddToCycle && cycles.length > 0 && (
                <DropdownMenuItem onClick={() => setIsCycleDialogOpen(true)}>
                  <Play className="h-4 w-4 mr-2" />
                  Add to Cycle
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test Cases</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete {selectedCount} test case(s)? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Test Cases</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Destination Folder</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
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
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={isLoading || !selectedFolderId}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              {isLoading ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Test Cases</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Destination Folder</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
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
            <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCopy}
              disabled={isLoading || !selectedFolderId}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              {isLoading ? 'Copying...' : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="regression, smoke, critical"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTag}
              disabled={isLoading || !tagInput.trim()}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              {isLoading ? 'Adding...' : 'Add Tags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isLoading || !selectedAssigneeId}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              {isLoading ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Cycle Dialog */}
      <Dialog open={isCycleDialogOpen} onOpenChange={setIsCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Test Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Cycle</Label>
              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCycleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToCycle}
              disabled={isLoading || !selectedCycleId}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              {isLoading ? 'Adding...' : 'Add to Cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
