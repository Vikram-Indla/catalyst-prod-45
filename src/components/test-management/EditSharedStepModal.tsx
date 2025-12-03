import React, { useState, useEffect } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useUpdateSharedStep } from '@/hooks/useSharedSteps';
import { useToast } from '@/hooks/use-toast';
import type { SharedTestStep } from '@/types/sharedSteps.types';

interface EditSharedStepModalProps {
  step: SharedTestStep | null;
  isOpen: boolean;
  onClose: () => void;
  onViewUsage?: () => void;
}

export const EditSharedStepModal: React.FC<EditSharedStepModalProps> = ({
  step,
  isOpen,
  onClose,
  onViewUsage,
}) => {
  const { toast } = useToast();
  const updateMutation = useUpdateSharedStep();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expected_result: '',
  });

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        description: step.description,
        expected_result: step.expected_result || '',
      });
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step) return;

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: step.id,
        ...formData,
      });
      toast({
        title: 'Success',
        description: `Updated shared step. ${step.usage_count} test case${step.usage_count !== 1 ? 's' : ''} updated.`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update shared step',
        variant: 'destructive',
      });
    }
  };

  if (!step) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shared Test Step</DialogTitle>
        </DialogHeader>

        {step.usage_count > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">Impact Warning</h4>
                <p className="text-sm text-orange-800 mb-2">
                  This step is used in <Badge variant="secondary">{step.usage_count}</Badge> test case{step.usage_count !== 1 ? 's' : ''}.
                  Updating will affect ALL linked test cases.
                </p>
                {onViewUsage && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={onViewUsage}
                    className="h-auto p-0 text-orange-700 hover:text-orange-900"
                  >
                    View {step.usage_count} affected test case{step.usage_count !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-expected">Expected Result (Optional)</Label>
            <Textarea
              id="edit-expected"
              value={formData.expected_result}
              onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              {updateMutation.isPending ? (
                <>Updating...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update All Test Cases
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
