/**
 * CreateReleaseModal — Release Operations (Phase 4b)
 *
 * Rebuilt 2026-06-18 on @atlaskit/modal-dialog + @atlaskit/select +
 * @atlaskit/datetime-picker + @atlaskit/textfield (was a hand-rolled overlay +
 * shadcn Popover/Calendar + --cp-* tokens). Captures the richer release fields
 * (release_type, target_env, product, managers, planned dates) with validation.
 *
 * target_date is NOT NULL on rh_releases — mirrored from the planned release
 * date. New releases start at status 'draft' (lifecycle stage 1).
 */
import React, { useEffect, useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { DatePicker } from '@atlaskit/datetime-picker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateRelease, useUpdateRelease } from '@/hooks/useReleaseHub';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';
import { useConfigOptions } from '@/hooks/releases/useReleaseConfig';

/** When `release` is passed the modal is in EDIT mode (prefill + update);
 *  otherwise it creates a new release. */
interface Props { onClose: () => void; release?: any }
interface Opt { label: string; value: string }

// Fallback option sets — used only if the admin config (rh_config_options)
// has not loaded yet. The canonical lists are managed at /admin/release-ops.
const FALLBACK_RELEASE_TYPES: Opt[] = [
  { label: 'Regular', value: 'regular' },
  { label: 'Minor', value: 'minor' },
  { label: 'Major', value: 'major' },
  { label: 'Hotfix', value: 'hotfix' },
  { label: 'Emergency', value: 'emergency' },
];

const FALLBACK_TARGET_ENVS: Opt[] = [
  { label: 'QA', value: 'qa' },
  { label: 'Beta', value: 'beta' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'production' },
];

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600,
  color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4,
};
const errStyle: React.CSSProperties = {
  fontFamily: RH.fontBody, fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 4,
};

export function CreateReleaseModal({ onClose, release }: Props) {
  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease();
  const isEdit = !!release;

  const [name, setName] = useState(release?.name ?? '');
  const [version, setVersion] = useState(release?.version ?? '');
  const humanize = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const [releaseType, setReleaseType] = useState<Opt | null>(() => release?.release_type ? { label: humanize(release.release_type), value: release.release_type } : null);
  const [targetEnv, setTargetEnv] = useState<Opt | null>(() => release?.target_env ? { label: humanize(release.target_env), value: release.target_env } : null);
  const [productId, setProductId] = useState<Opt | null>(null);
  const [plannedStart, setPlannedStart] = useState(release?.planned_start_date ?? '');
  const [plannedRelease, setPlannedRelease] = useState(release?.planned_release_date ?? release?.target_date ?? '');
  const [releaseManager, setReleaseManager] = useState<Opt | null>(null);
  const [productOwner, setProductOwner] = useState<Opt | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['release-hub', 'create', 'products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, name, code').order('name');
      return (data ?? []) as { id: string; name: string; code: string | null }[];
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ['release-hub', 'create', 'users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').not('full_name', 'is', null).order('full_name');
      return (data ?? []) as { id: string; full_name: string | null }[];
    },
  });

  const productOpts: Opt[] = useMemo(() => products.map((p) => ({ label: p.code ? `${p.name} (${p.code})` : p.name, value: p.id })), [products]);
  const userOpts: Opt[] = useMemo(() => users.map((u) => ({ label: u.full_name ?? 'Unknown', value: u.id })), [users]);

  // Admin-managed option lists (rh_config_options) with static fallback.
  const releaseTypeCfg = useConfigOptions('release_type');
  const targetEnvCfg = useConfigOptions('target_env');
  const releaseTypeOpts: Opt[] = useMemo(() => releaseTypeCfg.length ? releaseTypeCfg.map((o) => ({ label: o.label, value: o.value })) : FALLBACK_RELEASE_TYPES, [releaseTypeCfg]);
  const targetEnvOpts: Opt[] = useMemo(() => targetEnvCfg.length ? targetEnvCfg.map((o) => ({ label: o.label, value: o.value })) : FALLBACK_TARGET_ENVS, [targetEnvCfg]);

  // Edit mode: resolve product/manager/owner ids → select options once loaded.
  useEffect(() => {
    if (!release) return;
    if (release.product_id) setProductId((cur) => cur ?? productOpts.find((o) => o.value === release.product_id) ?? null);
    if (release.release_manager_id) setReleaseManager((cur) => cur ?? userOpts.find((o) => o.value === release.release_manager_id) ?? null);
    if (release.product_owner_id) setProductOwner((cur) => cur ?? userOpts.find((o) => o.value === release.product_owner_id) ?? null);
  }, [release, productOpts, userOpts]);

  const errors = {
    name: !name.trim() ? 'Name is required' : '',
    releaseType: !releaseType ? 'Release type is required' : '',
    targetEnv: !targetEnv ? 'Target environment is required' : '',
    plannedRelease: !plannedRelease ? 'Planned release date is required' : '',
  };
  const isValid = !errors.name && !errors.releaseType && !errors.targetEnv && !errors.plannedRelease;

  const handleSubmit = () => {
    setSubmitted(true);
    setFormError('');
    if (!isValid) return;

    if (isEdit) {
      updateRelease.mutate(
        {
          id: release.id,
          name: name.trim(),
          target_date: plannedRelease,
          planned_release_date: plannedRelease,
          planned_start_date: plannedStart || null,
          release_type: releaseType!.value,
          target_env: targetEnv!.value,
          product_id: productId?.value || null,
          version: version.trim() || null,
          release_manager_id: releaseManager?.value || null,
          product_owner_id: productOwner?.value || null,
        },
        {
          onSuccess: () => { catalystToast.success('Release updated'); onClose(); },
          onError: (err: any) => { setFormError(err?.message || 'Failed to update release'); catalystToast.error('Failed to update release'); },
        },
      );
      return;
    }

    createRelease.mutate(
      {
        name: name.trim(),
        target_date: plannedRelease,
        planned_release_date: plannedRelease,
        planned_start_date: plannedStart || undefined,
        release_type: releaseType!.value,
        target_env: targetEnv!.value,
        product_id: productId?.value || undefined,
        version: version.trim() || undefined,
        release_manager_id: releaseManager?.value || undefined,
        product_owner_id: productOwner?.value || undefined,
        source: 'catalyst',
        status: 'draft',
      },
      {
        onSuccess: () => { catalystToast.success('Release created'); onClose(); },
        onError: (err: any) => { setFormError(err?.message || 'Failed to create release'); catalystToast.error('Failed to create release'); },
      },
    );
  };

  const busy = createRelease.isPending || updateRelease.isPending;

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium">
        <ModalHeader hasCloseButton>
          <ModalTitle>{isEdit ? 'Edit release' : 'New release'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {formError && (
            <div style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: 'var(--ds-text-danger, #AE2A19)', background: 'var(--ds-background-danger, #FFECEB)', padding: 8, borderRadius: 4, marginBottom: 16 }}>
              {formError}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="rel-name">Name *</label>
            <Textfield id="rel-name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="e.g. Q2 2026 Platform Release" />
            {submitted && errors.name && <div style={errStyle}>{errors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Release type *</label>
              <Select inputId="rel-type" options={releaseTypeOpts} value={releaseType} onChange={(v) => setReleaseType(v as Opt)} placeholder="Select type" spacing="compact" menuPosition="fixed" />
              {submitted && errors.releaseType && <div style={errStyle}>{errors.releaseType}</div>}
            </div>
            <div>
              <label style={labelStyle}>Target environment *</label>
              <Select inputId="rel-env" options={targetEnvOpts} value={targetEnv} onChange={(v) => setTargetEnv(v as Opt)} placeholder="Select environment" spacing="compact" menuPosition="fixed" />
              {submitted && errors.targetEnv && <div style={errStyle}>{errors.targetEnv}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Product</label>
              <Select inputId="rel-product" options={productOpts} value={productId} onChange={(v) => setProductId(v as Opt)} placeholder="Select product" isClearable spacing="compact" menuPosition="fixed" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="rel-version">Version</label>
              <Textfield id="rel-version" value={version} onChange={(e) => setVersion((e.target as HTMLInputElement).value)} placeholder="e.g. v2.0" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Planned start</label>
              <DatePicker value={plannedStart} onChange={setPlannedStart} placeholder="Select date" />
            </div>
            <div>
              <label style={labelStyle}>Planned release *</label>
              <DatePicker value={plannedRelease} onChange={setPlannedRelease} placeholder="Select date" />
              {submitted && errors.plannedRelease && <div style={errStyle}>{errors.plannedRelease}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <label style={labelStyle}>Release manager</label>
              <Select inputId="rel-rm" options={userOpts} value={releaseManager} onChange={(v) => setReleaseManager(v as Opt)} placeholder="Select user" isClearable spacing="compact" menuPosition="fixed" />
            </div>
            <div>
              <label style={labelStyle}>Product owner</label>
              <Select inputId="rel-po" options={userOpts} value={productOwner} onChange={(v) => setProductOwner(v as Opt)} placeholder="Select user" isClearable spacing="compact" menuPosition="fixed" />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={handleSubmit} isDisabled={busy} isLoading={busy}>
            {isEdit ? 'Save changes' : 'Create release'}
          </Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}
