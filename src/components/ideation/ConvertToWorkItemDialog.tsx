// ==============================================
// CONVERT TO WORK ITEM DIALOG
// Based on Jira Align Ideation documentation
// ==============================================

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateIdea } from '@/hooks/useIdeation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Idea } from '@/types/ideation';

interface ConvertToWorkItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
  workItemType: 'Epic' | 'Feature' | 'Story';
}

export function ConvertToWorkItemDialog({
  open,
  onOpenChange,
  idea,
  workItemType,
}: ConvertToWorkItemDialogProps) {
  const [title, setTitle] = useState(idea?.title || '');
  const [description, setDescription] = useState(idea?.description || '');
  const [isConverting, setIsConverting] = useState(false);
  
  const updateIdea = useUpdateIdea();

  const handleConvert = async () => {
    if (!idea || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsConverting(true);
    try {
      let workItemId: string | null = null;
      
      // Create the work item based on type
      if (workItemType === 'Epic') {
        const { data, error } = await supabase
          .from('epics')
          .insert({
            name: title.trim(),
            description: description.trim(),
          })
          .select('id')
          .single();
        if (error) throw error;
        workItemId = data.id;
      } else if (workItemType === 'Feature') {
        // Features need name field and epic_id (nullable in some schemas)
        const { data, error } = await supabase
          .from('features')
          .insert({
            name: title.trim(),
            description: description.trim(),
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        workItemId = data.id;
      } else if (workItemType === 'Story') {
        const { data, error } = await supabase
          .from('stories')
          .insert({
            title: title.trim(),
            description: description.trim(),
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        workItemId = data.id;
      }

      // Update idea to link to work item and mark as Planned
      if (workItemId) {
        await updateIdea.mutateAsync({
          id: idea.id,
          work_item_id: workItemId,
          work_item_type: workItemType,
          status: 'Planned',
        });
      }

      toast.success(`Idea converted to ${workItemType}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to convert: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Reset form when idea changes
  if (idea && title !== idea.title) {
    setTitle(idea.title);
    setDescription(idea.description);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Convert to {workItemType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This will create a new {workItemType} from the idea "{idea?.title}" and link them together.
          </p>

          <div className="space-y-2">
            <Label htmlFor="title">{workItemType} Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${workItemType.toLowerCase()} title...`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Enter ${workItemType.toLowerCase()} description...`}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={isConverting}
            className="bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            {isConverting ? 'Converting...' : `Create ${workItemType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
