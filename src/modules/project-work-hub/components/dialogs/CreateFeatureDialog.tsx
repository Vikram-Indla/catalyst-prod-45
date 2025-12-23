import React, { useState } from 'react';
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

interface CreateFeatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projectId: string;
}

export const CreateFeatureDialog: React.FC<CreateFeatureDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [epicId, setEpicId] = useState<string>('');

  // Fetch real epics from database
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

  // Create feature mutation
  const createFeature = useMutation({
    mutationFn: async (featureData: { 
      name: string; 
      description?: string;
      project_id: string; 
      epic_id: string;
    }) => {
      const { data, error } = await supabase
        .from('features')
        .insert({
          name: featureData.name,
          description: featureData.description || null,
          project_id: featureData.project_id,
          epic_id: featureData.epic_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate work items query so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature created', 'The feature has been created successfully.');
      resetForm();
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to create feature', error.message);
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setEpicId('');
  };

  const handleSubmit = () => {
    if (!name.trim() || !epicId) return;

    createFeature.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      project_id: projectId,
      epic_id: epicId,
    });
  };

  const isValid = name.trim() && epicId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Feature</DialogTitle>
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
              disabled={createFeature.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="epic">
              Epic <span className="text-destructive">*</span>
            </Label>
            <Select value={epicId} onValueChange={setEpicId} disabled={epicsLoading || createFeature.isPending}>
              <SelectTrigger>
                <SelectValue placeholder={epicsLoading ? "Loading epics..." : "Select parent epic"} />
              </SelectTrigger>
              <SelectContent>
                {epics?.map((epic) => (
                  <SelectItem key={epic.id} value={epic.id}>
                    {epic.epic_key ? `${epic.epic_key}: ` : ''}{epic.name}
                  </SelectItem>
                ))}
                {epics?.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No epics available. Create an epic first.
                  </div>
                )}
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
              disabled={createFeature.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createFeature.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createFeature.isPending}
          >
            {createFeature.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
