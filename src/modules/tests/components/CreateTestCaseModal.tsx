/**
 * Create Test Case Modal
 * Full-featured modal for creating new test cases
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Tag, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  runMutationWithAudit,
  createPipelineContext,
  validateRequired,
  validateLength,
  PipelineError,
} from '../lib/actionPipeline';

interface CreateTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopeType: 'program' | 'project';
  scopeId: string;
  onSuccess?: (id: string) => void;
  defaultFolderId?: string | null;
}

const INITIAL_FORM = {
  title: '',
  description: '',
  objective: '',
  preconditions: '',
  status: 'draft',
  priority: 'medium',
  test_type: 'manual',
  component: '',
  folder_id: '',
  labels: [] as string[],
};

export function CreateTestCaseModal({
  open,
  onOpenChange,
  scopeType,
  scopeId,
  onSuccess,
  defaultFolderId,
}: CreateTestCaseModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ ...INITIAL_FORM, folder_id: defaultFolderId || '' });
  const [labelInput, setLabelInput] = useState('');

  // Reset form when modal opens with default folder
  React.useEffect(() => {
    if (open) {
      setFormData({ ...INITIAL_FORM, folder_id: defaultFolderId || '' });
    }
  }, [open, defaultFolderId]);

  // Fetch folders for dropdown
  const { data: folders = [] } = useQuery({
    queryKey: ['test-folders', scopeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_folders')
        .select('id, name')
        .eq('program_id', scopeId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Validate
      validateRequired(formData, ['title']);
      validateLength(formData.title, 'Title', 1, 500);
      
      const context = createPipelineContext(
        user.id,
        scopeType,
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );

      return runMutationWithAudit(formData, {
        context,
        action: 'create',
        entityType: 'test_cases',
        activityType: 'created',
        successMessage: 'Test case created',
        queryClient,
        invalidateKeys: [
          ['test-cases', scopeId],
          ['test-metrics', scopeId],
        ],
        mutationFn: async (input) => {
          const { data, error } = await supabase
            .from('test_cases')
            .insert({
              title: input.title.trim(),
              description: input.description || null,
              objective: input.objective || null,
              preconditions: input.preconditions || null,
              status: input.status as any,
              priority: input.priority as any,
              test_type: input.test_type as any,
              component: input.component || null,
              folder_id: input.folder_id || null,
              labels: input.labels.length > 0 ? input.labels : null,
              program_id: scopeType === 'program' ? scopeId : null,
              project_id: scopeType === 'project' ? scopeId : null,
              created_by: user.id,
            })
            .select()
            .single();
          if (error) throw new PipelineError('unknown', error.message);
          return data;
        },
        getAuditInfo: (input, result) => ({
          entityId: result.id,
          entityTitle: input.title,
          description: `Created test case "${input.title}"`,
        }),
      });
    },
    onSuccess: (result) => {
      setFormData(INITIAL_FORM);
      onOpenChange(false);
      onSuccess?.(result.data.id);
    },
  });

  const addLabel = () => {
    const label = labelInput.trim();
    if (label && !formData.labels.includes(label)) {
      setFormData(prev => ({ ...prev, labels: [...prev.labels, label] }));
      setLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setFormData(prev => ({ ...prev, labels: prev.labels.filter(l => l !== label) }));
  };

  const handleClose = () => {
    setFormData(INITIAL_FORM);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-surface-1 border-border-default max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Create Test Case
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Title *</label>
            <Input
              placeholder="Test case title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-9 text-sm bg-surface-2"
            />
          </div>

          {/* Row: Status, Priority, Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">Status</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="h-9 text-xs bg-surface-2"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface-1">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">Priority</label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger className="h-9 text-xs bg-surface-2"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface-1">
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">Type</label>
              <Select value={formData.test_type} onValueChange={(v) => setFormData({ ...formData, test_type: v })}>
                <SelectTrigger className="h-9 text-xs bg-surface-2"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface-1">
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="bdd">BDD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Description</label>
            <Textarea
              placeholder="Describe what this test case validates..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm bg-surface-2 min-h-[80px]"
            />
          </div>

          {/* Objective */}
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Objective</label>
            <Input
              placeholder="What is the goal of this test?"
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              className="h-9 text-sm bg-surface-2"
            />
          </div>

          {/* Preconditions */}
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Preconditions</label>
            <Textarea
              placeholder="What conditions must be met before running this test?"
              value={formData.preconditions}
              onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
              className="text-sm bg-surface-2 min-h-[60px]"
            />
          </div>

          {/* Row: Folder, Component */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">Folder</label>
              <Select value={formData.folder_id || ''} onValueChange={(v) => setFormData({ ...formData, folder_id: v })}>
                <SelectTrigger className="h-9 text-xs bg-surface-2">
                  <FolderOpen className="h-3 w-3 mr-1 text-text-tertiary" />
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent className="bg-surface-1">
                  <SelectItem value="">No folder</SelectItem>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-text-tertiary mb-1 block">Component</label>
              <Input
                placeholder="e.g. Login, Dashboard"
                value={formData.component}
                onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                className="h-9 text-sm bg-surface-2"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">Labels</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add label and press Enter"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                className="h-9 text-sm bg-surface-2 flex-1"
              />
              <Button variant="outline" size="sm" onClick={addLabel} className="h-9">
                <Tag className="h-3 w-3" />
              </Button>
            </div>
            {formData.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.labels.map(label => (
                  <Badge key={label} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => removeLabel(label)}>
                    {label}
                    <span className="text-text-tertiary">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!formData.title.trim() || createMutation.isPending}
            className="bg-accent-primary text-white"
          >
            {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
