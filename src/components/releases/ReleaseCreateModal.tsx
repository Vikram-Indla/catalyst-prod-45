/**
 * ReleaseCreateModal — Create release dialog.
 *
 * Jira parity layout:
 *   - Header subtitle: "Required fields are marked with an asterisk *"
 *   - Release name * (required, validated)
 *   - Start date / Release date  (side-by-side row)
 *   - Product * (single-select autofill)
 *   - Description (optional textarea)
 *   - Footer: Cancel + Save
 */
import React, { useState, useMemo } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateRelease } from '@/hooks/releases/useCreateRelease';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProductSelect, type ProductOption } from './ReleaseFilters';

interface ReleaseCreateModalProps {
  isOpen: boolean;
  projectKey: string;
  projectId: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 12,
  color: 'var(--ds-text, #172B4D)',
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ds-text-danger, #AE2A19)',
  marginTop: 4,
};

const asterisk = (
  <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
);

const todayIso = () => new Date().toISOString().split('T')[0];

export function ReleaseCreateModal({
  isOpen,
  projectKey,
  projectId,
  onClose,
  onSuccess,
}: ReleaseCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: todayIso(),
    release_date: todayIso(),
    product_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const createMutation = useCreateRelease();

  // Products = ph_projects
  const { data: productsRaw } = useQuery({
    queryKey: ['ph-projects-for-release-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string; key: string; name: string }>;
    },
    staleTime: 5 * 60_000,
    enabled: isOpen,
  });

  const productOptions: ProductOption[] = useMemo(
    () => (productsRaw ?? []).map((p) => ({ id: p.id, name: p.name, tag: p.key })),
    [productsRaw],
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) next.name = 'Release name is required';
    else if (trimmedName.length > 255) next.name = 'Release name must not exceed 255 characters';

    if (!formData.product_id) next.product_id = 'Product is required';

    if (formData.start_date && formData.release_date) {
      const s = new Date(formData.start_date);
      const r = new Date(formData.release_date);
      if (s > r) next.release_date = 'Release date must be on or after start date';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!validate()) return;

    const payload: CreateReleasePayload = {
      project_id: formData.product_id,
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      ...(formData.start_date && { start_date: formData.start_date }),
      ...(formData.release_date && { release_date: formData.release_date }),
    };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        catalystToast.success(`Release "${result.name}" created`);
        onSuccess?.(result);
        handleClose();
      },
      onError: (error: any) => {
        catalystToast.error(error?.message || 'Failed to create release');
      },
    });
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      start_date: todayIso(),
      release_date: todayIso(),
      product_id: '',
    });
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="small">
          <ModalHeader hasCloseButton>
            <ModalTitle>Create release</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #505258)' }}>
                Required fields are marked with an asterisk
                <span style={{ color: 'var(--ds-text-danger, #AE2A19)', marginLeft: 2 }}>*</span>
              </div>

              {/* Release name */}
              <div>
                <label style={labelStyle} htmlFor="release-name">
                  Release name{asterisk}
                </label>
                <Textfield
                  id="release-name"
                  value={formData.name}
                  onChange={(e) => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    setFormData((p) => ({ ...p, name: v }));
                    if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                  }}
                  maxLength={255}
                  autoFocus
                  isInvalid={submitted && !!errors.name}
                  aria-required="true"
                  aria-invalid={submitted && !!errors.name}
                  aria-describedby={submitted && errors.name ? 'name-error' : undefined}
                />
                {submitted && errors.name && (
                  <div id="name-error" role="alert" style={errStyle}>
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Start date / Release date (side by side) */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start date</label>
                  <CatalystDatePicker
                    value={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={(date) => setFormData((p) => ({
                      ...p,
                      start_date: date ? date.toISOString().split('T')[0] : '',
                    }))}
                    placeholder="Start date"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Release date</label>
                  <CatalystDatePicker
                    value={formData.release_date ? new Date(formData.release_date) : null}
                    onChange={(date) => {
                      setFormData((p) => ({
                        ...p,
                        release_date: date ? date.toISOString().split('T')[0] : '',
                      }));
                      if (errors.release_date) setErrors((p) => ({ ...p, release_date: '' }));
                    }}
                    placeholder="Release date"
                  />
                  {submitted && errors.release_date && (
                    <div role="alert" style={errStyle}>
                      {errors.release_date}
                    </div>
                  )}
                </div>
              </div>

              {/* Product (single-select autofill) */}
              <div>
                <label style={labelStyle}>
                  Product{asterisk}
                </label>
                <ProductSelect
                  options={productOptions}
                  value={formData.product_id || null}
                  onChange={(id) => {
                    setFormData((p) => ({ ...p, product_id: id ?? '' }));
                    if (errors.product_id) setErrors((p) => ({ ...p, product_id: '' }));
                  }}
                  placeholder="Select a product"
                  searchPlaceholder="Search products"
                  hasError={submitted && !!errors.product_id}
                />
                {submitted && errors.product_id && (
                  <div role="alert" style={errStyle}>
                    {errors.product_id}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle} htmlFor="release-description">
                  Description
                </label>
                <TextArea
                  id="release-description"
                  placeholder="Optional release notes"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.currentTarget.value }))}
                  minimumRows={3}
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
              isLoading={createMutation.isPending}
              isDisabled={createMutation.isPending}
              onClick={handleSubmit}
            >
              Save
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
