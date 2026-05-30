/**
 * Edit Feature Dialog — loads existing feature and allows editing
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

  if (!isOpen) return null;

  if (featureLoading) {
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

  const epicOptions = epics?.map((epic) => ({
    label: epic.epic_key ? `${epic.epic_key}: ${epic.name}` : epic.name,
    value: epic.id,
  })) || [];

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Edit Feature {feature?.display_id ? `— ${feature.display_id}` : ''}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="name" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Name <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
            </label>
            <Textfield
              id="name"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
              placeholder="Enter feature name"
              isDisabled={updateFeature.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="epic" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Epic
            </label>
            <Select
              inputId="epic"
              options={epicOptions}
              value={epicOptions.find((o) => o.value === epicId)}
              onChange={(opt: any) => setEpicId(opt ? opt.value : '')}
              placeholder={epicsLoading ? 'Loading epics...' : 'Select parent epic'}
              isDisabled={epicsLoading || updateFeature.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="status" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Status
            </label>
            <Select
              inputId="status"
              options={statusOptions}
              value={statusOptions.find((o) => o.value === status)}
              onChange={(opt: any) => setStatus(opt ? opt.value : '')}
              isDisabled={updateFeature.isPending}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="description" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Description
            </label>
            <TextArea
              id="description"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Enter feature description (optional)"
              minimumRows={3}
              isDisabled={updateFeature.isPending}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={updateFeature.isPending}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={() => updateFeature.mutate()}
          isDisabled={!isValid || updateFeature.isPending}
          iconBefore={updateFeature.isPending ? <Loader2 size="small" /> : undefined}
        >
          {updateFeature.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
