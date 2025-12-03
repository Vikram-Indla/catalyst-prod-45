import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { useCreateSharedStep } from '@/hooks/useSharedSteps';
import { useToast } from '@/hooks/use-toast';

interface CreateSharedStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

export const CreateSharedStepModal: React.FC<CreateSharedStepModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const createMutation = useCreateSharedStep();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expected_result: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync(formData);
      toast({
        title: 'Success',
        description: 'Shared test step created successfully',
      });
      handleClose();
      onSuccess?.(result.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create shared step',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setFormData({ title: '', description: '', expected_result: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Shared Test Step</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Login to application"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the test step in detail..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about actions to take and what to verify
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_result">Expected Result (Optional)</Label>
            <Textarea
              id="expected_result"
              value={formData.expected_result}
              onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
              placeholder="What should happen after this step..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              {createMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shared Step
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
