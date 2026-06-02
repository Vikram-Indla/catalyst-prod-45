/**
 * BrMoveProductDialog — moves a Business Request to a different product.
 *
 * Mirrors MoveIssueDialog but queries `products` instead of `ph_jira_projects`
 * and writes `business_requests.product_id` via the parent's updateField callback.
 *
 * C10 from the Product branch gap report.
 */
import React, { useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';

interface ProductOption {
  label: string;
  value: string;   // products.id (UUID)
  code: string;
}

interface BrMoveProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestKey?: string | null;
  requestTitle?: string | null;
  currentProductId?: string | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
  /** Called after successful move so the parent can close the panel. */
  onMoved?: () => void;
}

export function BrMoveProductDialog({
  isOpen,
  onClose,
  requestKey,
  requestTitle,
  currentProductId,
  onUpdate,
  onMoved,
}: BrMoveProductDialogProps) {
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [moving, setMoving] = useState(false);

  const { data: products = [], isLoading } = useQuery<ProductOption[]>({
    queryKey: ['br-move-products'],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((p: { id: string; name: string; code: string }) => ({
        label: `${p.name} (${p.code})`,
        value: p.id,
        code: p.code,
      }));
    },
    staleTime: 60_000,
  });

  const options = products.filter((p) => p.value !== currentProductId);

  const handleConfirm = async () => {
    if (!selected) return;
    setMoving(true);
    try {
      await onUpdate('product_id', selected.value);
      catalystToast.success(`Moved to ${selected.label}`);
      onMoved?.();
      onClose();
    } catch {
      catalystToast.error('Move failed');
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Move to product</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{
          fontSize: 14,
          color: token('color.text', '#292A2E'),
          marginBottom: 12,
          fontFamily: 'var(--cp-font-body)',
        }}>
          Move <strong>{requestKey ?? 'this request'}</strong>
          {requestTitle ? ` — ${requestTitle}` : ''} to a different product.
        </p>
        <Select<ProductOption>
          inputId="br-move-product-select"
          options={options}
          value={selected}
          onChange={(opt) => setSelected(opt as ProductOption | null)}
          isLoading={isLoading}
          isSearchable
          placeholder="Search products…"
          menuPortalTarget={document.body}
          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={moving}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleConfirm}
          isDisabled={!selected || moving}
        >
          {moving ? 'Moving…' : 'Move'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

export default BrMoveProductDialog;
