/**
 * CATALYST TESTS - Create Test From Work Item
 * Modal for creating new test case from work item context
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateTestFromWorkItem } from '@/hooks/useWorkItemLinking';
import { useTestFolders } from '@/hooks/useTestManagement';
import type { WorkItemType } from '@/types/workItemLinking.types';

interface CreateTestFromWorkItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemId: string;
  workItemType: WorkItemType;
  workItemTitle: string;
  workItemDescription?: string;
}

export const CreateTestFromWorkItem: React.FC<CreateTestFromWorkItemProps> = ({
  open,
  onOpenChange,
  workItemId,
  workItemType,
  workItemTitle,
  workItemDescription,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<'manual' | 'automated' | 'bdd'>('manual');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [folderId, setFolderId] = useState<string | undefined>();
  const [autoLink, setAutoLink] = useState(true);

  const { data: folders = [] } = useTestFolders();
  const createMutation = useCreateTestFromWorkItem();

  // Pre-populate form when work item changes
  useEffect(() => {
    if (open) {
      setTitle(`Test: ${workItemTitle}`);
      setDescription(workItemDescription || '');
      
      // Auto-suggest test type based on work item type
      if (workItemType === 'feature') {
        setTestType('manual');
        setPriority('high');
      } else if (workItemType === 'defect') {
        setTestType('manual');
        setPriority('critical');
      } else if (workItemType === 'epic') {
        setTestType('manual');
        setPriority('high');
      }
    }
  }, [open, workItemTitle, workItemDescription, workItemType]);

  const handleCreate = () => {
    createMutation.mutate(
      {
        work_item_id: workItemId,
        work_item_type: workItemType,
        title,
        description,
        test_type: testType,
        priority,
        folder_id: folderId,
        auto_link: autoLink,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setTitle('');
          setDescription('');
          setTestType('manual');
          setPriority('high');
          setFolderId(undefined);
          setAutoLink(true);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Create Test Case from {workItemType} {workItemId.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Create a new test case pre-populated with context from this work item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter test case title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this test verifies"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="bdd">BDD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder (optional)" />
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-link"
              checked={autoLink}
              onCheckedChange={(checked) => setAutoLink(checked as boolean)}
            />
            <label
              htmlFor="auto-link"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Automatically link to this {workItemType}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create & Link Test Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
