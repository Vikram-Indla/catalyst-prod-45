/**
 * ReleaseCreateModal — Create or Edit release dialog.
 *
 * Modes:
 *   - Create: no `editingRelease` prop → blank form, useCreateRelease mutation
 *   - Edit:   `editingRelease` provided → prefilled form, useUpdateRelease mutation
 *
 * Layout (Jira parity):
 *   - Header subtitle: "Required fields are marked with an asterisk *"
 *   - Release name * (required, validated)
 *   - Start date / Release date  (side-by-side row)
 *   - Product * (single-select autofill)
 *   - Description (optional textarea)
 *   - Footer: Cancel + Save / Save changes
 */
import React, { useState, useMemo, useEffect } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateRelease } from '@/hooks/releases/useCreateRelease';
import { useUpdateRelease } from '@/hooks/releases/useUpdateRelease';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';
import { catalystFlag } from '@/lib/catalystFlag';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProductSelect, type ProductOption } from './ReleaseFilters';

interface ReleaseCreateModalProps {
  isOpen: boolean;
  projectKey: string;
  projectId: string;
  onClose: () => void;
  onSuccess?: (release: Release) => void;
  /** When provided, the modal switches to edit mode and pre-fills from this release. */
  editingRelease?: Release | null;
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

function emptyForm() {
  return {
    name: '',
    description: '',
    start_date: todayIso(),
    release_date: todayIso(),
    product_id: '',
  };
}

function formFromRelease(r: Release) {
  return {
    name: r.name ?? '',
    description: r.description ?? '',
    start_date: r.start_date ?? '',
    release_date: r.release_date ?? '',
    product_id: r.project_id ?? '',
  };
}

export function ReleaseCreateModal({
  isOpen,
  projectKey,
  projectId,
  onClose,
  onSuccess,
  editingRelease = null,
}: ReleaseCreateModalProps) {
  const isEdit = !!editingRelease;

  const [formData, setFormData] = useState(() =>
    editingRelease ? formFromRelease(editingRelease) : emptyForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Re-seed form whenever the modal re-opens or the target release changes
  useEffect(() => {
    if (!isOpen) return;
    setFormData(editingRelease ? formFromRelease(editingRelease) : emptyForm());
    setErrors({});
    setSubmitted(false);
  }, [isOpen, editingRelease]);

  const createMutation = useCreateRelease();
  const updateMutation = useUpdateRelease(editingRelease?.id ?? '');
  const pending = isEdit ? updateMutation.isPending : createMutation.isPending;

  // Products only — releases belong to products, not projects (projects use sprints).
  // Intersect ph_projects (FK source for releases.project_id) with products.code.
  const { data: productsRaw } = useQuery({
    queryKey: ['products-for-release-create'],
    queryFn: async () => {
      const [{ data: projects, error: pErr }, { data: prods, error: prErr }] = await Promise.all([
        supabase.from('ph_projects').select('id, key, name').order('name'),
        (supabase as any).from('products').select('code').eq('is_active', true),
      ]);
      if (pErr) throw new Error(pErr.message);
      if (prErr) throw new Error(prErr.message);
      const productCodes = new Set((prods ?? []).map((p: any) => p.code));
      return (projects ?? []).filter((p: any) => productCodes.has(p.key)) as Array<{
        id: string; key: string; name: string;
      }>;
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

    if (isEdit && editingRelease) {
      updateMutation.mutate(
        {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          start_date: formData.start_date || undefined,
          release_date: formData.release_date || undefined,
          product_id: formData.product_id,
        } as any,
        {
          onSuccess: (result) => {
            onSuccess?.(result);
            handleClose();
          },
          onError: (error: any) => {
            catalystFlag.error(error?.message || 'Failed to update release');
          },
        },
      );
      return;
    }

    const payload: CreateReleasePayload = {
      project_id: formData.product_id,
      name: formData.name.trim(),
      ...(formData.description.trim() && { description: formData.description.trim() }),
      ...(formData.start_date && { start_date: formData.start_date }),
      ...(formData.release_date && { release_date: formData.release_date }),
    };
    createMutation.mutate(payload, {
      onSuccess: (result) => {
        onSuccess?.(result);
        handleClose();
      },
      onError: (error: any) => {
        catalystFlag.error(error?.message || 'Failed to create release');
      },
    });
  };

  const handleClose = () => {
    setFormData(emptyForm());
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  const title = isEdit ? 'Edit release' : 'Create release';
  const ctaLabel = isEdit ? 'Save changes' : 'Save';

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width={867}>
          <ModalHeader hasCloseButton>
            <ModalTitle>{title}</ModalTitle>
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

              {/* Start date / Release date */}
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

              {/* Product */}
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
                  onChange={(e) => {
                    const v = (e.target as HTMLTextAreaElement).value;
                    setFormData((p) => ({ ...p, description: v }));
                  }}
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
              isLoading={pending}
              isDisabled={pending}
              onClick={handleSubmit}
            >
              {ctaLabel}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
