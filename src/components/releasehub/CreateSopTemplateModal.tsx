/**
 * CreateSopTemplateModal — Release Operations SOP template create/edit (Phase 4).
 * Template-level fields + ordered step editor (type, role, commit/evidence/
 * mandatory/rollback flags, offset, duration) with up/down reorder. Technical
 * step types default commit-required. Steps become executable rh_sop_steps via
 * apply-template. Canonical @atlaskit modal.
 */
import React, { useEffect, useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import Toggle from '@atlaskit/toggle';
import { useUpsertSopTemplate, useTemplateDetail, type TemplateStepDraft } from '@/hooks/useSopRunbook';
import { catalystToast } from '@/lib/catalystToast';
import { X, Plus, ArrowUp, ArrowDown } from '@/lib/atlaskit-icons';
import { RH } from '@/constants/releasehub.design';

interface Props { onClose: () => void; templateId?: string }
interface Opt { label: string; value: string }

const TECHNICAL = ['frontend', 'backend', 'integration', 'database', 'configuration'];
const STEP_TYPES: Opt[] = [
  { label: 'Frontend', value: 'frontend' }, { label: 'Backend', value: 'backend' }, { label: 'Database', value: 'database' },
  { label: 'Integration', value: 'integration' }, { label: 'Configuration', value: 'configuration' }, { label: 'Validation', value: 'validation' },
  { label: 'Communication', value: 'communication' }, { label: 'Rollback', value: 'rollback' }, { label: 'Manual', value: 'manual' }, { label: 'Script', value: 'script' },
];
const ENVS: Opt[] = [{ label: 'QA', value: 'qa' }, { label: 'Beta', value: 'beta' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'production' }];
const CATEGORIES: Opt[] = [{ label: 'Frontend', value: 'frontend' }, { label: 'Backend', value: 'backend' }, { label: 'Integration', value: 'integration' }, { label: 'Database', value: 'database' }, { label: 'Full stack', value: 'full_stack' }, { label: 'Configuration', value: 'configuration' }];
const RISKS: Opt[] = [{ label: 'All changes', value: 'all' }, { label: 'High risk+', value: 'high' }, { label: 'Critical only', value: 'critical' }];

const lbl: React.CSSProperties = { display: 'block', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 };
const err: React.CSSProperties = { fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', marginTop: 4 };
const emptyStep = (): TemplateStepDraft => ({ title: '', stepType: '', defaultAssignedRole: '', environment: '', commitRequired: false, evidenceRequired: false, isMandatory: true, rollback: false, offsetMinutes: null, durationMinutes: null });

export function CreateSopTemplateModal({ onClose, templateId }: Props) {
  const isEdit = !!templateId;
  const upsert = useUpsertSopTemplate();
  const { data: detail } = useTemplateDetail(templateId ?? null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Opt | null>(null);
  const [env, setEnv] = useState<Opt | null>(null);
  const [estDuration, setEstDuration] = useState('');
  const [risk, setRisk] = useState<Opt | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<TemplateStepDraft[]>([emptyStep()]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (detail) {
      setName(detail.name); setDescription(detail.description ?? '');
      setCategory(CATEGORIES.find((o) => o.value === detail.deploymentCategory) ?? null);
      setEnv(ENVS.find((o) => o.value === detail.targetEnv) ?? null);
      setEstDuration(detail.estimatedDurationMinutes ? String(detail.estimatedDurationMinutes) : '');
      setRisk(RISKS.find((o) => o.value === detail.riskApplicability) ?? null);
      setIsActive(detail.isActive);
      setSteps(detail.steps.length ? detail.steps : [emptyStep()]);
    }
  }, [detail]);

  const nameErr = !name.trim() ? 'Name is required' : '';
  const validSteps = steps.filter((s) => s.title.trim());
  const activeErr = isActive && validSteps.length === 0 ? 'An active template must have at least one step' : '';
  const isValid = !nameErr && !activeErr && validSteps.length > 0;

  const update = (i: number, patch: Partial<TemplateStepDraft>) => setSteps((s) => s.map((x, idx) => {
    if (idx !== i) return x;
    const next = { ...x, ...patch };
    // technical type → default commit-required on
    if (patch.stepType && TECHNICAL.includes(patch.stepType) && x.stepType !== patch.stepType) next.commitRequired = true;
    if (patch.stepType === 'rollback') next.rollback = true;
    return next;
  }));
  const move = (i: number, dir: -1 | 1) => setSteps((s) => { const j = i + dir; if (j < 0 || j >= s.length) return s; const c = [...s]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const submit = () => {
    setSubmitted(true);
    if (!isValid) return;
    upsert.mutate(
      { id: templateId, name: name.trim(), description: description.trim() || undefined, deploymentCategory: category?.value, targetEnv: env?.value, estimatedDurationMinutes: estDuration ? Math.max(0, parseInt(estDuration, 10) || 0) : null, riskApplicability: risk?.value, isActive, steps: validSteps },
      { onSuccess: () => { catalystToast.success(isEdit ? 'SOP template updated' : 'SOP template created'); onClose(); }, onError: () => catalystToast.error('Failed to save template') },
    );
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="x-large">
        <ModalHeader hasCloseButton><ModalTitle>{isEdit ? 'Edit SOP template' : 'New SOP template'}</ModalTitle></ModalHeader>
        <ModalBody>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl} htmlFor="sop-name">Name *</label>
            <Textfield id="sop-name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="e.g. Standard production backend deploy" />
            {submitted && nameErr && <div style={err}>{nameErr}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div><label style={lbl}>Deployment category</label><Select inputId="sop-cat" options={CATEGORIES} value={category} onChange={(v) => setCategory(v as Opt)} placeholder="Category" isClearable spacing="compact" menuPosition="fixed" /></div>
            <div><label style={lbl}>Target environment</label><Select inputId="sop-env" options={ENVS} value={env} onChange={(v) => setEnv(v as Opt)} placeholder="Environment" isClearable spacing="compact" menuPosition="fixed" /></div>
            <div><label style={lbl}>Estimated duration (min)</label><Textfield id="sop-est" type="number" value={estDuration} onChange={(e) => setEstDuration((e.target as HTMLInputElement).value)} placeholder="e.g. 90" /></div>
            <div><label style={lbl}>Risk applicability</label><Select inputId="sop-risk" options={RISKS} value={risk} onChange={(v) => setRisk(v as Opt)} placeholder="Applies to" isClearable spacing="compact" menuPosition="fixed" /></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl} htmlFor="sop-desc">Description</label>
            <TextArea id="sop-desc" value={description} onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)} placeholder="Optional" minimumRows={2} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Toggle id="sop-active" isChecked={isActive} onChange={() => setIsActive((v) => !v)} />
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>Active (available to apply)</span>
            {submitted && activeErr && <span style={err}>{activeErr}</span>}
          </div>

          <h3 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--ds-text)', margin: '8px 0' }}>Steps *</h3>
          {steps.map((s, i) => (
            <div key={i} style={{ border: `1px solid var(--ds-border)`, borderRadius: 6, padding: 10, marginBottom: 8, background: s.rollback ? 'var(--ds-background-warning)' : 'var(--ds-surface-raised)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest)', minWidth: 16 }}>{i + 1}</span>
                <div style={{ flex: 1 }}><Textfield value={s.title} onChange={(e) => update(i, { title: (e.target as HTMLInputElement).value })} placeholder="Step title" isCompact /></div>
                <div style={{ width: 150 }}><Select inputId={`st-type-${i}`} options={STEP_TYPES} value={STEP_TYPES.find((o) => o.value === s.stepType) ?? null} onChange={(v) => update(i, { stepType: (v as Opt)?.value ?? '' })} placeholder="Type" spacing="compact" menuPosition="fixed" /></div>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Up" style={iconBtn(i === 0)}><ArrowUp size={14} style={{ color: 'var(--ds-icon-subtle)' }} /></button>
                <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Down" style={iconBtn(i === steps.length - 1)}><ArrowDown size={14} style={{ color: 'var(--ds-icon-subtle)' }} /></button>
                <button onClick={() => setSteps((x) => x.filter((_, idx) => idx !== i))} aria-label="Remove" style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} style={{ color: 'var(--ds-icon-subtle)' }} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingLeft: 24 }}>
                <div style={{ width: 130 }}><Textfield value={s.defaultAssignedRole} onChange={(e) => update(i, { defaultAssignedRole: (e.target as HTMLInputElement).value })} placeholder="Owner role" isCompact /></div>
                <div style={{ width: 90 }}><Textfield type="number" value={s.offsetMinutes ?? ''} onChange={(e) => update(i, { offsetMinutes: (e.target as HTMLInputElement).value ? parseInt((e.target as HTMLInputElement).value, 10) : null })} placeholder="offset m" isCompact /></div>
                <div style={{ width: 90 }}><Textfield type="number" value={s.durationMinutes ?? ''} onChange={(e) => update(i, { durationMinutes: (e.target as HTMLInputElement).value ? parseInt((e.target as HTMLInputElement).value, 10) : null })} placeholder="dur m" isCompact /></div>
                <Flag label="Commit" on={s.commitRequired} onToggle={() => update(i, { commitRequired: !s.commitRequired })} id={`c-${i}`} />
                <Flag label="Evidence" on={s.evidenceRequired} onToggle={() => update(i, { evidenceRequired: !s.evidenceRequired })} id={`e-${i}`} />
                <Flag label="Mandatory" on={s.isMandatory} onToggle={() => update(i, { isMandatory: !s.isMandatory })} id={`m-${i}`} />
                <Flag label="Rollback" on={s.rollback} onToggle={() => update(i, { rollback: !s.rollback })} id={`r-${i}`} />
              </div>
            </div>
          ))}
          {submitted && validSteps.length === 0 && <div style={err}>Add at least one step</div>}
          <button onClick={() => setSteps((s) => [...s, emptyStep()])} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
            <Plus size={14} style={{ color: 'var(--ds-link)' }} /> Add step
          </button>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={submit} isDisabled={upsert.isPending} isLoading={upsert.isPending}>{isEdit ? 'Save changes' : 'Create template'}</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}

const iconBtn = (disabled: boolean): React.CSSProperties => ({ display: 'flex', background: 'transparent', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 4 });
function Flag({ label, on, onToggle, id }: { label: string; on: boolean; onToggle: () => void; id: string }) {
  return (
    <label htmlFor={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
      <Toggle id={id} isChecked={on} onChange={onToggle} />
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>{label}</span>
    </label>
  );
}
