/**
 * CreateReleaseModal — inline release creation for product module.
 *
 * AtlasKit modal + CatalystDatePicker for start/end dates.
 * Enforces no-duplicate names per product scope.
 */
import React, { useState, useCallback } from 'react';
import ModalDialog, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { Field, HelperMessage, ErrorMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { useCreateProductRelease } from '@/hooks/product/useProductReleases';
import type { ProductRelease } from '@/hooks/product/useProductReleases';

interface Props {
  isOpen: boolean;
  productId?: string | null;
  onClose: () => void;
  onCreated: (release: ProductRelease) => void;
}

export function CreateReleaseModal({ isOpen, productId, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMutation = useCreateProductRelease();

  const reset = useCallback(() => {
    setName('');
    setStartDate(null);
    setEndDate(null);
    setNameError(null);
    setSubmitError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Release name is required');
      return;
    }
    setNameError(null);
    setSubmitError(null);
    try {
      const release = await createMutation.mutateAsync({
        name: trimmed,
        product_id: productId ?? null,
        start_date: startDate,
        end_date: endDate,
      });
      reset();
      onCreated(release);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create release');
    }
  }, [name, productId, startDate, endDate, createMutation, reset, onCreated]);

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={handleClose} width="small">
      <ModalHeader>
        <ModalTitle>Create release</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Field name="release-name" label="Release name" isRequired>
          {() => (
            <>
              <Textfield
                name="release-name"
                value={name}
                onChange={(e) => {
                  setName((e.target as HTMLInputElement).value);
                  setNameError(null);
                }}
                placeholder="e.g. Release 1.0"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
              />
              {nameError && <ErrorMessage>{nameError}</ErrorMessage>}
            </>
          )}
        </Field>

        <div style={{ marginTop: 16 }}>
          <Field name="release-start" label="Start date">
            {() => (
              <CatalystDatePicker
                value={startDate}
                onChange={(d) => setStartDate(d ? (d instanceof Date ? d.toISOString().split('T')[0] : String(d)) : null)}
                placeholder="Select start date"
              />
            )}
          </Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field name="release-end" label="End date">
            {() => (
              <CatalystDatePicker
                value={endDate}
                onChange={(d) => setEndDate(d ? (d instanceof Date ? d.toISOString().split('T')[0] : String(d)) : null)}
                placeholder="Select end date"
                minDate={startDate ? new Date(startDate) : undefined}
              />
            )}
          </Field>
        </div>

        {submitError && (
          <div style={{ marginTop: 12, color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-400)' }}>
            {submitError}
          </div>
        )}

        <HelperMessage>
          Release names must be unique within a product.
        </HelperMessage>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={() => void handleSubmit()}
          isLoading={createMutation.isPending}
          isDisabled={!name.trim()}
        >
          Create release
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

export default CreateReleaseModal;
