/**
 * ProductReleasePicker — inline release selector for product module.
 *
 * Shows existing product_releases for a product, plus a "Create release…"
 * option that opens CreateReleaseModal inline. Persists selected value.
 */
import React, { useState, useCallback, useMemo } from 'react';
import Select from '@atlaskit/select';
import { useProductReleases } from '@/hooks/product/useProductReleases';
import type { ProductRelease } from '@/hooks/product/useProductReleases';
import { CreateReleaseModal } from './CreateReleaseModal';

const CREATE_SENTINEL = '__create__';

interface ReleaseOption {
  value: string;
  label: string;
  isCreate?: boolean;
}

interface Props {
  productId?: string | null;
  value: string | null;          // release_id uuid
  onChange: (releaseId: string | null, release: ProductRelease | null) => void;
  appearance?: 'default' | 'subtle';
  placeholder?: string;
  isDisabled?: boolean;
  inputId?: string;
}

export function ProductReleasePicker({
  productId,
  value,
  onChange,
  appearance = 'subtle',
  placeholder = 'Link to a release',
  isDisabled = false,
  inputId = 'product-release-picker',
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const { data: releases = [], isLoading } = useProductReleases(productId);

  const options = useMemo<ReleaseOption[]>(() => [
    ...releases.map((r) => ({ value: r.id, label: r.name })),
    { value: CREATE_SENTINEL, label: '+ Create release…', isCreate: true },
  ], [releases]);

  const selected = useMemo(
    () => options.find((o) => o.value === value && !o.isCreate) ?? null,
    [options, value],
  );

  const handleChange = useCallback((opt: ReleaseOption | null) => {
    if (!opt) { onChange(null, null); return; }
    if (opt.isCreate) {
      setShowCreate(true);
      return;
    }
    const rel = releases.find((r) => r.id === opt.value) ?? null;
    onChange(opt.value, rel);
  }, [releases, onChange]);

  const handleCreated = useCallback((release: ProductRelease) => {
    setShowCreate(false);
    onChange(release.id, release);
  }, [onChange]);

  const formatOptionLabel = useCallback((opt: ReleaseOption) => {
    if (opt.isCreate) {
      return (
        <span style={{ color: 'var(--ds-link)', fontWeight: 500 }}>
          {opt.label}
        </span>
      );
    }
    return <span>{opt.label}</span>;
  }, []);

  return (
    <>
      <Select<ReleaseOption>
        inputId={inputId}
        appearance={appearance}
        options={options}
        value={selected}
        onChange={handleChange as any}
        isLoading={isLoading}
        isClearable
        isDisabled={isDisabled}
        placeholder={placeholder}
        formatOptionLabel={formatOptionLabel}
        isOptionDisabled={() => false}
      />
      <CreateReleaseModal
        isOpen={showCreate}
        productId={productId}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

export default ProductReleasePicker;
