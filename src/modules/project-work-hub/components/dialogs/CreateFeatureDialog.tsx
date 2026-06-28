import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { catalystToast as toast } from '@/lib/catalystToast';
import { Loader2 } from '@/lib/atlaskit-icons';

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

  const isValid = name.trim() !== '' && epicId !== '';
  const epicOptions = epics?.map((e) => ({
    label: e.epic_key ? `${e.epic_key}: ${e.name}` : e.name,
    value: e.id,
  })) || [];

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Create Feature</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="name" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Name <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
            </label>
            <Textfield
              id="name"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
              placeholder="Enter feature name"
              isDisabled={createFeature.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="epic" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>
              Epic <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
            </label>
            <Select
              inputId="epic"
              options={epicOptions}
              value={epicOptions.find((o) => o.value === epicId)}
              onChange={(opt: any) => setEpicId(opt ? opt.value : '')}
              placeholder={epicsLoading ? 'Loading epics...' : 'Select parent epic'}
              isDisabled={epicsLoading || createFeature.isPending}
              noOptionsMessage={() => 'No epics available. Create an epic first.'}
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
              placeholder="Enter feature description (optional)"
              minimumRows={3}
              isDisabled={createFeature.isPending}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={createFeature.isPending}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleSubmit}
          isDisabled={!isValid || createFeature.isPending}
          iconBefore={createFeature.isPending ? <Loader2 size="small" /> : undefined}
        >
          {createFeature.isPending ? 'Creating...' : 'Create Feature'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
