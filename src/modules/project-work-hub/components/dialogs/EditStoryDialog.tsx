/**
 * Edit Story Dialog — loads existing story and allows editing
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import { Loader2 } from '@/lib/atlaskit-icons';

interface EditStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  storyId: string;
  projectId: string;
}

export const EditStoryDialog: React.FC<EditStoryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  storyId,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featureId, setFeatureId] = useState<string>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [status, setStatus] = useState<string>('open');

  // Fetch story data
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ['story-detail', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!storyId,
  });

  // Populate form
  useEffect(() => {
    if (story) {
      setTitle(story.title || '');
      setDescription(story.description || '');
      setFeatureId(story.feature_id || '');
      setAcceptanceCriteria((story as any).acceptance_criteria || '');
      setStatus((story as any).status || 'open');
    }
  }, [story]);

  // Fetch features for parent selector
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['features-for-story', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const updateStory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('stories')
        .update({
          title: title.trim(),
          name: title.trim(),
          description: description.trim() || null,
          feature_id: featureId || null,
          acceptance_criteria: acceptanceCriteria.trim() || null,
          status,
        } as any)
        .eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['story-detail', storyId] });
      toast.success('Story updated', 'The story has been updated successfully.');
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Failed to update story', error.message);
    },
  });

  const isValid = title.trim().length > 0;

  if (!isOpen) return null;

  if (storyLoading) {
    return (
      <Modal onClose={onClose} width="medium">
        <ModalBody>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 className="animate-spin" size="large" />
          </div>
        </ModalBody>
      </Modal>
    );
  }

  const featureOptions = features?.map((f) => ({
    label: f.display_id ? `${f.display_id}: ${f.name}` : f.name,
    value: f.id,
  })) || [];

  const statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'In Review', value: 'in_review' },
    { label: 'Done', value: 'done' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Edit Story {(story as any)?.story_key ? `— ${(story as any).story_key}` : ''}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="title" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Title <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
            </label>
            <Textfield
              id="title"
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="Enter story title"
              isDisabled={updateStory.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="feature" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Feature
            </label>
            <Select
              inputId="feature"
              options={featureOptions}
              value={featureOptions.find((o) => o.value === featureId)}
              onChange={(opt: any) => setFeatureId(opt ? opt.value : '')}
              placeholder={featuresLoading ? 'Loading features...' : 'Select parent feature'}
              isDisabled={featuresLoading || updateStory.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="status" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Status
            </label>
            <Select
              inputId="status"
              options={statusOptions}
              value={statusOptions.find((o) => o.value === status)}
              onChange={(opt: any) => setStatus(opt ? opt.value : '')}
              isDisabled={updateStory.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="description" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Description
            </label>
            <TextArea
              id="description"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Enter story description (optional)"
              minimumRows={3}
              isDisabled={updateStory.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="acceptance" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Acceptance Criteria
            </label>
            <TextArea
              id="acceptance"
              value={acceptanceCriteria}
              onChange={(e: any) => setAcceptanceCriteria(e.target.value)}
              placeholder="Enter acceptance criteria (optional)"
              minimumRows={3}
              isDisabled={updateStory.isPending}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={updateStory.isPending}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={() => updateStory.mutate()}
          isDisabled={!isValid || updateStory.isPending}
          iconBefore={updateStory.isPending ? <Loader2 size="small" /> : undefined}
        >
          {updateStory.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
