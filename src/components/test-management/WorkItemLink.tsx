import React, { useState } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';
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
import { useUpdateTestCase } from '@/hooks/useTestManagement';
import { useToast } from '@/hooks/use-toast';

interface WorkItemLinkProps {
  testCaseId: string;
  linkedWorkItemId?: string;
  linkedWorkItemType?: string;
}

export const WorkItemLink: React.FC<WorkItemLinkProps> = ({
  testCaseId,
  linkedWorkItemId,
  linkedWorkItemType
}) => {
  const { toast } = useToast();
  const updateMutation = useUpdateTestCase();

  const [isLinking, setIsLinking] = useState(false);
  const [workItemType, setWorkItemType] = useState<string>('story');
  const [workItemId, setWorkItemId] = useState('');

  const handleLink = async () => {
    if (!workItemId.trim()) {
      toast({
        title: 'Error',
        description: 'Work item ID is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: testCaseId,
        linked_work_item_type: workItemType as any,
        linked_work_item_id: workItemId
      });

      toast({
        title: 'Success',
        description: 'Work item linked successfully'
      });
      setIsLinking(false);
      setWorkItemId('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to link work item',
        variant: 'destructive'
      });
    }
  };

  const handleUnlink = async () => {
    try {
      await updateMutation.mutateAsync({
        id: testCaseId,
        linked_work_item_type: undefined,
        linked_work_item_id: undefined
      });

      toast({
        title: 'Success',
        description: 'Work item unlinked successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unlink work item',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label>Linked Work Item</Label>

      {linkedWorkItemId && linkedWorkItemType ? (
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg border border-border p-3">
          <LinkIcon className="h-4 w-4 text-brand-gold" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground capitalize">
              {linkedWorkItemType} #{linkedWorkItemId.slice(0, 8)}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUnlink}
            className="text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : isLinking ? (
        <div className="bg-muted/30 rounded-lg border border-dashed border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="work-item-type">Type</Label>
              <Select value={workItemType} onValueChange={setWorkItemType}>
                <SelectTrigger id="work-item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="defect">Defect</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-item-id">Work Item ID</Label>
              <Input
                id="work-item-id"
                value={workItemId}
                onChange={(e) => setWorkItemId(e.target.value)}
                placeholder="Enter work item ID"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleLink}
              disabled={updateMutation.isPending}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              Link
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLinking(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLinking(true)}
          className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Link Work Item
        </Button>
      )}
    </div>
  );
};
