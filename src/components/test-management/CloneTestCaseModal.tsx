/**
 * Clone Test Case Modal - Per T3 Case Management spec
 * Allows cloning a test case with options
 */

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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TestCase, TestFolder } from '@/types/test-management';

interface CloneTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: TestCase;
  folders: TestFolder[];
  onSuccess: () => void;
}

export const CloneTestCaseModal: React.FC<CloneTestCaseModalProps> = ({
  isOpen,
  onClose,
  testCase,
  folders,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: `Copy of ${testCase.title}`,
    folder_id: testCase.folder_id || '',
    include_steps: true,
    include_parameters: true,
    include_attachments: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in');
      }

      // Create cloned test case
      const { data: newCase, error: caseError } = await supabase
        .from('test_cases')
        .insert({
          title: formData.title.trim(),
          description: testCase.description,
          preconditions: testCase.preconditions,
          expected_result: testCase.expected_result,
          test_type: testCase.test_type,
          priority: testCase.priority,
          status: 'draft', // Always start as draft
          folder_id: formData.folder_id || null,
          program_id: testCase.program_id,
          created_by: user.id
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Clone steps if selected
      if (formData.include_steps) {
        const { data: steps } = await supabase
          .from('test_steps')
          .select('*')
          .eq('test_case_id', testCase.id)
          .order('step_order');

        if (steps && steps.length > 0) {
          const newSteps = steps.map(step => ({
            test_case_id: newCase.id,
            step_order: step.step_order,
            action: step.action,
            expected_result: step.expected_result
          }));

          await supabase.from('test_steps').insert(newSteps);
        }
      }

      // Clone parameters if selected
      if (formData.include_parameters) {
        const { data: params } = await supabase
          .from('test_data_parameters')
          .select('*')
          .eq('test_case_id', testCase.id);

        if (params && params.length > 0) {
          const newParams = params.map(param => ({
            test_case_id: newCase.id,
            parameter_name: param.parameter_name,
            parameter_type: param.parameter_type
          }));

          await supabase.from('test_data_parameters').insert(newParams);
        }
      }

      toast({
        title: 'Test case cloned',
        description: `"${formData.title}" has been created`
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error cloning test case',
        description: error.message || 'Failed to clone test case',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Test Case</DialogTitle>
          <DialogDescription>
            Create a copy of "{testCase.title}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-title">New Title</Label>
            <Input
              id="clone-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title for cloned test case"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clone-folder">Target Folder</Label>
            <Select
              value={formData.folder_id || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, folder_id: value === 'none' ? '' : value })
              }
            >
              <SelectTrigger id="clone-folder">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Include in Clone</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-steps"
                checked={formData.include_steps}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, include_steps: checked === true })
                }
              />
              <label htmlFor="include-steps" className="text-sm">
                Test Steps
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-parameters"
                checked={formData.include_parameters}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, include_parameters: checked === true })
                }
              />
              <label htmlFor="include-parameters" className="text-sm">
                Parameters & Test Data
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-attachments"
                checked={formData.include_attachments}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, include_attachments: checked === true })
                }
              />
              <label htmlFor="include-attachments" className="text-sm">
                Attachments
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
              disabled={isLoading}
            >
              {isLoading ? 'Cloning...' : 'Clone Test Case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
