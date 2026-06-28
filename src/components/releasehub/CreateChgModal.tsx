/**
 * CreateChgModal — Create / Map Change (Release Operations, Phase 7b)
 *
 * Rebuilt 2026-06-18 on @atlaskit/modal-dialog + select + datetime-picker +
 * textfield + button/new (was a hand-rolled overlay + shadcn + --cp-*).
 * Captures the richer change fields plus the two product-owner-flagged
 * surfaces: **Approvers** (each becomes a pending rh_change_signoffs row) and
 * **Notify** subscribers (rh_notify_subscribers). Optionally maps the change
 * to a release on create.
 */
import React, { useMemo, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { DatePicker } from '@atlaskit/datetime-picker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { useCreateChange } from '@/hooks/useReleaseHub';
import { catalystToast } from '@/lib/catalystToast';
import { X, Plus } from '@/lib/atlaskit-icons';
import { RH } from '@/constants/releasehub.design';
import { useConfigOptions, useReleaseConfig } from '@/hooks/releases/useReleaseConfig';

interface Props { onClose: () => void; initialSource?: 'catalyst' | 'external' }
interface Opt { label: string; value: string }

// Fallback option sets — used only until admin config (rh_config_options)
// loads. Canonical lists managed at /admin/release-ops.
const FALLBACK_CHANGE_TYPES: Opt[] = [
  { label: 'Standard', value: 'standard' },
  { label: 'Normal', value: 'normal' },
  { label: 'Emergency', value: 'emergency' },
  { label: 'Hotfix', value: 'hotfix' },
];
const FALLBACK_TARGET_ENVS: Opt[] = [
  { label: 'QA', value: 'qa' },
  { label: 'Beta', value: 'beta' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'production' },
];
const FALLBACK_DEPLOY_CATEGORIES: Opt[] = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Integration', value: 'integration' },
  { label: 'Database', value: 'database' },
  { label: 'Full stack', value: 'full_stack' },
  { label: 'Configuration', value: 'configuration' },
];
const FALLBACK_RISKS: Opt[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];
const FALLBACK_APPROVAL_ROLES: Opt[] = [
  { label: 'QA', value: 'qa' },
  { label: 'UAT', value: 'uat' },
  { label: 'Product owner', value: 'product_owner' },
  { label: 'Project manager', value: 'project_manager' },
  { label: 'Change manager', value: 'change_manager' },
];

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4 };
const errStyle: React.CSSProperties = { fontFamily: RH.fontBody, fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 4 };

interface Approver { userId: string; role: string }

export function CreateChgModal({ onClose, initialSource = 'catalyst' }: Props) {
  const createChange = useCreateChange();

  const [source, setSource] = useState<'catalyst' | 'external'>(initialSource);
  const [externalSystem, setExternalSystem] = useState('');
  const [externalNumber, setExternalNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<Opt | null>(null);
  const [targetEnv, setTargetEnv] = useState<Opt | null>(null);
  const [deployCategory, setDeployCategory] = useState<Opt | null>(null);
  const [risk, setRisk] = useState<Opt | null>(null);
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [releaseId, setReleaseId] = useState<Opt | null>(null);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [notifyIds, setNotifyIds] = useState<Opt[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: releases = [] } = useQuery({
    queryKey: ['release-hub', 'create-chg', 'releases'],
    queryFn: async () => {
      const { data } = await supabase.from('rh_releases').select('id, name').order('name');
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const { data: approvedProfiles = [] } = useApprovedProfiles();

  const releaseOpts: Opt[] = useMemo(() => releases.map((r) => ({ label: r.name, value: r.id })), [releases]);
  const userOpts: Opt[] = useMemo(() => approvedProfiles.map((p) => ({ label: p.name, value: p.id })), [approvedProfiles]);

  // Admin-managed option lists (rh_config_options) with static fallback.
  const { data: config } = useReleaseConfig();
  const changeTypeCfg = useConfigOptions('change_type');
  const targetEnvCfg = useConfigOptions('target_env');
  const deployCatCfg = useConfigOptions('deployment_category');
  const riskCfg = useConfigOptions('risk_level');
  const roleCfg = useConfigOptions('approval_role');
  const toOpts = (cfg: { label: string; value: string }[], fallback: Opt[]): Opt[] => cfg.length ? cfg.map((o) => ({ label: o.label, value: o.value })) : fallback;
  const CHANGE_TYPES = useMemo(() => toOpts(changeTypeCfg, FALLBACK_CHANGE_TYPES), [changeTypeCfg]);
  const TARGET_ENVS = useMemo(() => toOpts(targetEnvCfg, FALLBACK_TARGET_ENVS), [targetEnvCfg]);
  const DEPLOY_CATEGORIES = useMemo(() => toOpts(deployCatCfg, FALLBACK_DEPLOY_CATEGORIES), [deployCatCfg]);
  const RISKS = useMemo(() => toOpts(riskCfg, FALLBACK_RISKS), [riskCfg]);
  const APPROVAL_ROLES = useMemo(() => toOpts(roleCfg, FALLBACK_APPROVAL_ROLES), [roleCfg]);

  const isExternal = source === 'external';
  const errors = {
    title: !title.trim() ? 'Title is required' : '',
    changeType: !changeType ? 'Change type is required' : '',
    targetEnv: !targetEnv ? 'Target environment is required' : '',
    risk: !risk ? 'Risk is required' : '',
    externalSystem: isExternal && !externalSystem.trim() ? 'External system is required' : '',
    externalNumber: isExternal && !externalNumber.trim() ? 'External change number is required' : '',
  };
  const isValid = !errors.title && !errors.changeType && !errors.targetEnv && !errors.risk && !errors.externalSystem && !errors.externalNumber;

  const addApprover = () => setApprovers((a) => [...a, { userId: '', role: '' }]);
  const updateApprover = (i: number, patch: Partial<Approver>) => setApprovers((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeApprover = (i: number) => setApprovers((a) => a.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setSubmitted(true);
    setFormError('');
    if (!isValid) return;
    setSaving(true);
    try {
      let chgNumber: string;
      if (isExternal) {
        chgNumber = externalNumber.trim();
      } else {
        // Sequential Catalyst change number. Prefix + padding are admin-configurable
        // (rh_config_settings); fall back to CAT-CHG- / 4 if config not loaded.
        const prefix = String(config?.settings?.change_number_prefix ?? 'CAT-CHG-');
        const pad = Math.max(1, Math.min(8, parseInt(String(config?.settings?.change_number_padding ?? 4), 10) || 4));
        const { count } = await supabase.from('rh_changes').select('*', { count: 'exact', head: true }).eq('source', 'catalyst');
        chgNumber = `${prefix}${String((count ?? 0) + 1).padStart(pad, '0')}`;
      }

      const change = await createChange.mutateAsync({
        chg_number: chgNumber,
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'new',
        risk_level: risk!.value,
        change_type: changeType!.value,
        target_env: targetEnv!.value,
        deployment_category: deployCategory?.value || undefined,
        window_start: windowStart || undefined,
        window_end: windowEnd || undefined,
        release_id: releaseId?.value || undefined,
        source,
        external_system: isExternal ? externalSystem.trim() : undefined,
      } as any);

      const changeId = (change as any)?.id as string | undefined;
      if (changeId) {
        const validApprovers = approvers.filter((a) => a.userId && a.role);
        if (validApprovers.length > 0) {
          await supabase.from('rh_change_signoffs').insert(
            validApprovers.map((a) => ({ change_id: changeId, signoff_role: a.role, stage: a.role, assigned_to: a.userId, status: 'pending' })),
          );
        }
        if (notifyIds.length > 0) {
          await supabase.from('rh_notify_subscribers').insert(
            notifyIds.map((n) => ({ item_type: 'change', item_id: changeId, user_id: n.value })),
          );
        }
      }
      catalystToast.success('Change created');
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create change');
      catalystToast.error('Failed to create change');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large">
        <ModalHeader hasCloseButton>
          <ModalTitle>Create / map change record</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {formError && (
            <div style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: 'var(--ds-text-danger, #AE2A19)', background: 'var(--ds-background-danger, #FFECEB)', padding: 8, borderRadius: 4, marginBottom: 16 }}>{formError}</div>
          )}

          {/* Change source toggle (Catalyst-generated vs external system) */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Change source *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {([['catalyst', 'Catalyst change number'], ['external', 'External change number']] as const).map(([val, lbl]) => {
                const active = source === val;
                return (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSource(val)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)', border: `1px solid ${active ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #DFE1E6)'}`, background: active ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface, #FFFFFF)' }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 8, flexShrink: 0, border: `2px solid ${active ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #DFE1E6)'}`, background: active ? 'var(--ds-background-selected-bold, #0C66E4)' : 'transparent' }} />
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle} htmlFor="chg-number">{isExternal ? 'External change number *' : 'Catalyst change key'}</label>
              {isExternal ? (
                <>
                  <Textfield id="chg-number" value={externalNumber} onChange={(e) => setExternalNumber((e.target as HTMLInputElement).value)} placeholder="e.g. CHG8841" />
                  {submitted && errors.externalNumber && <div style={errStyle}>{errors.externalNumber}</div>}
                </>
              ) : (
                <>
                  <Textfield id="chg-number" value="" isDisabled placeholder="Auto-generated (CAT-CHG-…)" />
                  <div style={{ fontFamily: RH.fontBody, fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', marginTop: 4 }}>Auto-generated</div>
                </>
              )}
            </div>
            <div>
              <label style={labelStyle} htmlFor="chg-extsys">{isExternal ? 'External system *' : 'External system'}</label>
              <Textfield id="chg-extsys" value={externalSystem} onChange={(e) => setExternalSystem((e.target as HTMLInputElement).value)} placeholder="e.g. ServiceNow" isDisabled={!isExternal} />
              {submitted && errors.externalSystem && <div style={errStyle}>{errors.externalSystem}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="chg-title">Title *</label>
            <Textfield id="chg-title" value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="Describe the change" />
            {submitted && errors.title && <div style={errStyle}>{errors.title}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Change type *</label>
              <Select inputId="chg-type" options={CHANGE_TYPES} value={changeType} onChange={(v) => setChangeType(v as Opt)} placeholder="Select type" spacing="compact" menuPosition="fixed" />
              {submitted && errors.changeType && <div style={errStyle}>{errors.changeType}</div>}
            </div>
            <div>
              <label style={labelStyle}>Risk *</label>
              <Select inputId="chg-risk" options={RISKS} value={risk} onChange={(v) => setRisk(v as Opt)} placeholder="Select risk" spacing="compact" menuPosition="fixed" />
              {submitted && errors.risk && <div style={errStyle}>{errors.risk}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Target environment *</label>
              <Select inputId="chg-env" options={TARGET_ENVS} value={targetEnv} onChange={(v) => setTargetEnv(v as Opt)} placeholder="Select environment" spacing="compact" menuPosition="fixed" />
              {submitted && errors.targetEnv && <div style={errStyle}>{errors.targetEnv}</div>}
            </div>
            <div>
              <label style={labelStyle}>Deployment category</label>
              <Select inputId="chg-cat" options={DEPLOY_CATEGORIES} value={deployCategory} onChange={(v) => setDeployCategory(v as Opt)} placeholder="Select category" isClearable spacing="compact" menuPosition="fixed" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Window start</label>
              <DatePicker value={windowStart} onChange={setWindowStart} placeholder="Select date" />
            </div>
            <div>
              <label style={labelStyle}>Window end</label>
              <DatePicker value={windowEnd} onChange={setWindowEnd} placeholder="Select date" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Map to release</label>
            <Select inputId="chg-release" options={releaseOpts} value={releaseId} onChange={(v) => setReleaseId(v as Opt)} placeholder="Unassigned" isClearable spacing="compact" menuPosition="fixed" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="chg-desc">Description</label>
            <TextArea id="chg-desc" value={description} onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)} placeholder="Optional details" minimumRows={2} />
          </div>

          {/* Approvers */}
          <h3 style={{ fontFamily: RH.fontDisplay, fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: '8px 0' }}>Approvers</h3>
          {approvers.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <Select inputId={`appr-user-${i}`} options={userOpts} value={userOpts.find((o) => o.value === a.userId) ?? null} onChange={(v) => updateApprover(i, { userId: (v as Opt)?.value ?? '' })} placeholder="Approver" spacing="compact" menuPosition="fixed" />
              </div>
              <div style={{ width: 180 }}>
                <Select inputId={`appr-role-${i}`} options={APPROVAL_ROLES} value={APPROVAL_ROLES.find((o) => o.value === a.role) ?? null} onChange={(v) => updateApprover(i, { role: (v as Opt)?.value ?? '' })} placeholder="Role" spacing="compact" menuPosition="fixed" />
              </div>
              <button onClick={() => removeApprover(i)} aria-label="Remove approver" style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #626F86))', padding: 4 }}>
                <X size={14} style={{ color: 'var(--ds-text-subtlest, #626F86)' }} />
              </button>
            </div>
          ))}
          <button onClick={addApprover} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: 'var(--ds-link, #0C66E4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}>
            <Plus size={14} style={{ color: 'var(--ds-link, #0C66E4)' }} /> Add approver
          </button>

          {/* Notify */}
          <h3 style={{ fontFamily: RH.fontDisplay, fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: '8px 0' }}>Notify</h3>
          <Select inputId="chg-notify" isMulti options={userOpts} value={notifyIds} onChange={(v) => setNotifyIds((v as Opt[]) ?? [])} placeholder="Add users to notify" spacing="compact" menuPosition="fixed" />
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={handleSubmit} isDisabled={saving} isLoading={saving}>Create change</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}
