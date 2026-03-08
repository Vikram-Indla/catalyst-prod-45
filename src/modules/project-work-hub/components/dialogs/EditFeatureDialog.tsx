/**
 * Edit Feature Dialog — loads existing feature and allows editing
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import { Loader2 } from 'lucide-react';

interface EditFeatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  featureId: string;
  projectId: string;
}

export const EditFeatureDialog: React.FC<EditFeatureDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  featureId,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [epicId, setEpicId] = useState<string>('');
  const [status, setStatus] = useState<string>('active');

  // Fetch feature data
  const { data: feature, isLoading: featureLoading } = useQuery({
    queryKey: ['feature-detail', featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('id', featureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!featureId,
  });

  // Populate form
  useEffect(() => {
    if (feature) {
      setName(feature.name || '');
      setDescription(feature.description || '');
      setEpicId(feature.epic_id || '');
      setStatus((feature as any).status || 'active');
    }
  }, [feature]);

  // Fetch epics for parent selector
  const { data: epics, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-for-feature', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const updateFeature = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('features')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          epic_id: epicId || null,
          status,
        } as any)
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['feature-detail', featureId] });
      toast.success('Feature updated', 'The feature has been updated successfully.');
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to update feature', error.message);
    },
  });

  const isValid = name.trim().length > 0;

  if (featureLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Feature {feature?.display_id ? `— ${feature.display_id}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter feature name"
              disabled={updateFeature.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="epic">Epic</Label>
            <Select value={epicId} onValueChange={setEpicId} disabled={epicsLoading || updateFeature.isPending}>
              <SelectTrigger>
                <SelectValue placeholder={epicsLoading ? 'Loading epics...' : 'Select parent epic'} />
              </SelectTrigger>
              <SelectContent>
                {epics?.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.epic_key ? `${epic.epic_key}: ` : ''}{epic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={updateFeature.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter feature description (optional)"
              rows={3}
              disabled={updateFeature.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateFeature.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => updateFeature.mutate()}
            disabled={!isValid || updateFeature.isPending}
          >
            {updateFeature.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
