/**
 * WorkstreamFormModal — canonical create + edit/rename dialog for workstreams.
 * CAT-TASKS-20260627-001 Slice 5.
 *
 * Built on the same proven canonical stack as the Slice 1 Create Task modal:
 * PortalFix shell (@atlaskit/modal-dialog renders empty in this Vite build) +
 * @atlaskit/form Field + @atlaskit/textfield + @atlaskit/textarea +
 * @atlaskit/button/new + ADS flag toast. No hand-rolled modal/inputs/buttons.
 *
 * One component serves both "create" and "edit"/"rename" (mode prop), writing
 * through the existing useCreateWorkstream / useUpdateWorkstream hooks → the
 * task_workstreams table. Renaming = editing the name (the update hook also
 * re-derives slug + can update key_prefix).
 */
import { useState, useEffect, type ChangeEvent } from 'react';
import {
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@/components/workhub/create-story/PortalFix';
import { Field, ErrorMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { flag } from '@/components/shared/JiraTable/flags';
import { useCreateWorkstream, useUpdateWorkstream, type Workstream } from '../../hooks/useTaskWorkstreams';

// Workstream colour swatches. These are DATA values (the user-selectable
// task_workstreams.color hex column) — not design tokens — so literal hex is
// correct here.
const SWATCHES = ['#6554C0', '#0052CC', '#00857A', '#E2B203', '#E56910', '#CA3521', '#943D73', '#5E4DB2'];
const DEFAULT_COLOR = SWATCHES[0];

export interface WorkstreamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'create' for a new workstream, 'edit' to rename/edit an existing one. */
  mode: 'create' | 'edit';
  /** Required in edit mode — the workstream being edited. */
  workstream?: Workstream | null;
  onSaved?: () => void;
}

export function WorkstreamFormModal({ open, onOpenChange, mode, workstream, onSaved }: WorkstreamFormModalProps) {
  const [name, setName] = useState('');
  const [keyPrefix, setKeyPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMut = useCreateWorkstream();
  const updateMut = useUpdateWorkstream();
  const isPending = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && workstream) {
      setName(workstream.name ?? '');
      setKeyPrefix(workstream.key_prefix ?? '');
      setDescription(workstream.description ?? '');
      setColor(workstream.color || DEFAULT_COLOR);
    } else {
      setName('');
      setKeyPrefix('');
      setDescription('');
      setColor(DEFAULT_COLOR);
    }
    setErrors({});
  }, [open, mode, workstream]);

  const close = () => { if (!isPending) onOpenChange(false); };

  const handleSubmit = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (mode === 'create') {
      createMut.mutate(
        { name: name.trim(), description: description.trim() || undefined, color, keyPrefix: keyPrefix.trim() || undefined },
        {
          onSuccess: () => { flag.success(`Workstream "${name.trim()}" created`); onSaved?.(); onOpenChange(false); },
          onError: (e: Error) => flag.error('Could not create workstream', e.message),
        },
      );
    } else if (workstream) {
      updateMut.mutate(
        { id: workstream.id, updates: { name: name.trim(), description: description.trim() || null, color, key_prefix: keyPrefix.trim() || workstream.key_prefix } },
        {
          onSuccess: () => { flag.success('Workstream updated'); onSaved?.(); onOpenChange(false); },
          onError: (e: Error) => flag.error('Could not update workstream', e.message),
        },
      );
    }
  };

  return (
    <ModalTransition>
      {open && (
        <ModalDialog width="small" onClose={close} modalTitle={mode === 'create' ? 'Create workstream' : 'Edit workstream'}>
          <ModalHeader>
            <ModalTitle>{mode === 'create' ? 'Create workstream' : 'Edit workstream'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200') }}>
              <Field name="ws-name" label="Name" isRequired>
                {({ fieldProps: { id } }) => (
                  <>
                    <Textfield
                      id={id}
                      autoFocus
                      placeholder="e.g. Platform Delivery"
                      value={name}
                      isInvalid={!!errors.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    />
                    {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                  </>
                )}
              </Field>

              <Field name="ws-key" label="Key prefix">
                {({ fieldProps: { id } }) => (
                  <Textfield
                    id={id}
                    placeholder="Auto from name (e.g. PLA)"
                    value={keyPrefix}
                    maxLength={5}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setKeyPrefix(e.target.value.toUpperCase())}
                  />
                )}
              </Field>

              <Field name="ws-desc" label="Description">
                {({ fieldProps: { id } }) => (
                  <TextArea
                    id={id}
                    placeholder="What is this workstream for?"
                    value={description}
                    minimumRows={2}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  />
                )}
              </Field>

              <Field name="ws-color" label="Colour">
                {() => (
                  <div style={{ display: 'flex', gap: token('space.100'), flexWrap: 'wrap' }}>
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Colour ${c}`}
                        aria-pressed={color === c}
                        onClick={() => setColor(c)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: c,
                          cursor: 'pointer',
                          border: color === c
                            ? `2px solid ${token('color.border.focused')}`
                            : `2px solid ${token('color.border')}`,
                          boxShadow: color === c ? `0 0 0 2px ${token('elevation.surface')}` : 'none',
                          outline: 'none',
                        }}
                      />
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <div style={{ flex: 1 }} />
            <Button appearance="subtle" onClick={close} isDisabled={isPending}>Cancel</Button>
            <Button appearance="primary" onClick={handleSubmit} isLoading={isPending} isDisabled={isPending || !name.trim()}>
              {mode === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}

export default WorkstreamFormModal;
