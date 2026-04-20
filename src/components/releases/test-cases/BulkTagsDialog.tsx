/**
 * Bulk Tags Dialog
 * Add or remove tags from selected test cases
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tags, X, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lozenge } from '@/components/ads';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface BulkTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onApplyTags: (tagsToAdd: string[], tagsToRemove: string[]) => void;
}

// Common tags from the system
const SUGGESTED_TAGS = [
  'smoke', 'regression', 'critical', 'flaky', 'automated', 'manual',
  'p0', 'p1', 'p2', 'security', 'performance', 'integration',
  'ui', 'api', 'database', 'auth', 'mobile', 'desktop',
];

export function BulkTagsDialog({
  open,
  onOpenChange,
  selectedCount,
  onApplyTags,
}: BulkTagsDialogProps) {
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  const handleAddNewTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tagsToAdd.includes(tag)) {
      setTagsToAdd([...tagsToAdd, tag]);
      setNewTag('');
    }
  };

  const handleToggleAddTag = (tag: string) => {
    if (tagsToAdd.includes(tag)) {
      setTagsToAdd(tagsToAdd.filter(t => t !== tag));
    } else {
      setTagsToAdd([...tagsToAdd, tag]);
    }
  };

  const handleToggleRemoveTag = (tag: string) => {
    if (tagsToRemove.includes(tag)) {
      setTagsToRemove(tagsToRemove.filter(t => t !== tag));
    } else {
      setTagsToRemove([...tagsToRemove, tag]);
    }
  };

  const handleApply = () => {
    onApplyTags(tagsToAdd, tagsToRemove);
    onOpenChange(false);
    setTagsToAdd([]);
    setTagsToRemove([]);
    setNewTag('');
  };

  const hasChanges = tagsToAdd.length > 0 || tagsToRemove.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Tags className="w-5 h-5" />
            </div>
            Manage Tags
          </DialogTitle>
          <DialogDescription>
            Add or remove tags from {selectedCount} test case{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'add' | 'remove')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Tags
              {tagsToAdd.length > 0 && (
                <Lozenge appearance="default">{tagsToAdd.length}</Lozenge>
              )}
            </TabsTrigger>
            <TabsTrigger value="remove" className="gap-2">
              <X className="w-3.5 h-3.5" />
              Remove Tags
              {tagsToRemove.length > 0 && (
                <Lozenge appearance="default">{tagsToRemove.length}</Lozenge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            {/* Add new tag input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                className="flex-1"
              />
              <Button onClick={handleAddNewTag} disabled={!newTag.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Selected tags to add */}
            {tagsToAdd.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tags to add</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tagsToAdd.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleAddTag(tag)}
                      className="inline-flex items-center gap-1"
                    >
                      <Lozenge appearance="inprogress">{tag}</Lozenge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested tags */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Suggested tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter(t => !tagsToAdd.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleAddTag(tag)}
                    className="inline-flex items-center gap-1"
                  >
                    <Lozenge appearance="default">{tag}</Lozenge>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="remove" className="space-y-4 mt-4">
            {/* Tags to remove */}
            {tagsToRemove.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tags to remove</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tagsToRemove.map((tag) => (
                    <Badge
                      key={tag}
                      variant="destructive"
                      className="gap-1 cursor-pointer"
                      onClick={() => handleToggleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available tags to remove */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select tags to remove</Label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter(t => !tagsToRemove.includes(t)).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-colors",
                      "hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                    )}
                    onClick={() => handleToggleRemoveTag(tag)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasChanges}>
            Apply Changes
            {hasChanges && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {tagsToAdd.length + tagsToRemove.length}
              </Badge>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
