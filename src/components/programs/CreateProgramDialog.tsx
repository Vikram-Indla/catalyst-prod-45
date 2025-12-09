import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { token } from '@atlaskit/tokens';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import { toast } from 'sonner';

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProgramDialog({ open, onOpenChange }: CreateProgramDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          name: name.trim(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-directory'] });
      queryClient.invalidateQueries({ queryKey: ['programs-header'] });
      toast.success('Program created successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to create program: ' + error.message);
    },
  });

  const handleClose = () => {
    setName('');
    setKey('');
    setDescription('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Program name is required');
      return;
    }
    createMutation.mutate();
  };

  const generateKey = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!key || key === generateKey(name)) {
      setKey(generateKey(value));
    }
  };

  return (
    <ModalTransition>
      {open && (
        <Modal onClose={handleClose} width="medium">
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              <ModalTitle>Create program</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200') }}>
                <div>
                  <label
                    htmlFor="program-name"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: token('color.text.subtle'),
                      marginBottom: token('space.050'),
                    }}
                  >
                    Name <span style={{ color: token('color.text.danger') }}>*</span>
                  </label>
                  <Textfield
                    id="program-name"
                    placeholder="Enter program name"
                    value={name}
                    onChange={(e) => handleNameChange((e.target as HTMLInputElement).value)}
                    isRequired
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    htmlFor="program-key"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: token('color.text.subtle'),
                      marginBottom: token('space.050'),
                    }}
                  >
                    Key
                  </label>
                  <Textfield
                    id="program-key"
                    placeholder="e.g., PROD"
                    value={key}
                    onChange={(e) => setKey((e.target as HTMLInputElement).value)}
                  />
                  <p
                    style={{
                      fontSize: '11px',
                      color: token('color.text.subtlest'),
                      marginTop: token('space.050'),
                    }}
                  >
                    A unique identifier for this program
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="program-description"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: token('color.text.subtle'),
                      marginBottom: token('space.050'),
                    }}
                  >
                    Description
                  </label>
                  <Textfield
                    id="program-description"
                    placeholder="Describe the purpose of this program"
                    value={description}
                    onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                type="submit"
                isDisabled={!name.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create program'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </ModalTransition>
  );
}
