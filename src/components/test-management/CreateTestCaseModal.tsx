import React, { useState } from 'react';
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
import { useCreateTestCase } from '@/hooks/useTestManagement';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TestFolder } from '@/types/test-management';

interface CreateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: TestFolder[];
}

export const CreateTestCaseModal: React.FC<CreateTestCaseModalProps> = ({
  isOpen,
  onClose,
  folders
}) => {
  const { toast } = useToast();
  const createMutation = useCreateTestCase();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preconditions: '',
    expected_result: '',
    test_type: 'manual' as 'manual' | 'automated' | 'bdd',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    status: 'draft' as 'draft' | 'approved' | 'deprecated',
    folder_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.title.length > 500) {
      newErrors.title = 'Title must be less than 500 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create test cases',
          variant: 'destructive'
        });
        return;
      }

      await createMutation.mutateAsync({
        ...formData,
        folder_id: formData.folder_id || undefined,
        created_by: user.id
      });

      toast({
        title: 'Success',
        description: 'Test case created successfully'
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create test case',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-brand-dark text-white p-6 -m-6 mb-0">
          <DialogTitle>Create New Test Case</DialogTitle>
          <DialogDescription className="text-gray-300">
            Fill in the details to create a new test case
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter test case title"
              maxLength={500}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter test case description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_type">Test Type</Label>
              <Select
                value={formData.test_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, test_type: value })
                }
              >
                <SelectTrigger id="test_type">
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
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger id="priority">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder">Folder</Label>
            <Select
              value={formData.folder_id}
              onValueChange={(value) =>
                setFormData({ ...formData, folder_id: value })
              }
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder="Select a folder (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Test Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
