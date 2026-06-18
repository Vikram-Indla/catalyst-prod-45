/**
 * CreateSopTemplateModal — Release Operations (Phase 9).
 * @atlaskit modal capturing a reusable SOP template + its ordered steps
 * (title/type/env/mandatory). Steps are copied into a change as executable
 * rh_sop_steps via useApplySopTemplate.
 */
import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import Toggle from '@atlaskit/toggle';
import { useCreateSopTemplate, type NewSopTemplateStep } from '@/hooks/useReleaseHub';
import { catalystToast } from '@/lib/catalystToast';
import { X, Plus } from '@/lib/atlaskit-icons';
import { RH } from '@/constants/releasehub.design';

interface Props { onClose: () => void }
interface Opt { label: string; value: string }

const STEP_TYPES: Opt[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'Script', value: 'script' },
  { label: 'Deployment', value: 'deployment' },
  { label: 'Validation', value: 'validation' },
  { label: 'Communication', value: 'communication' },
  { label: 'Rollback', value: 'rollback' },
];
const ENVS: Opt[] = [
  { label: 'QA', value: 'qa' },
  { label: 'Beta', value: 'beta' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'production' },
];
const CATEGORIES: Opt[] = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Integration', value: 'integration' },
  { label: 'Database', value: 'database' },
  { label: 'Full stack', value: 'full_stack' },
  { label: 'Configuration', value: 'configuration' },
];

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4 };
const errStyle: React.CSSProperties = { fontFamily: RH.fontBody, fontSize: 11, color: 'var(--ds-text-danger, #AE2A19)', marginTop: 4 };

interface StepDraft { title: string; type: string; env: string; mandatory: boolean }

export function CreateSopTemplateModal({ onClose }: Props) {
  const create = useCreateSopTemplate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Opt | null>(null);
  const [env, setEnv] = useState<Opt | null>(null);
  const [steps, setSteps] = useState<StepDraft[]>([{ title: '', type: '', env: '', mandatory: true }]);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const nameErr = !name.trim() ? 'Name is required' : '';
  const validSteps = steps.filter((s) => s.title.trim());
  const isValid = !nameErr && validSteps.length > 0;

  const addStep = () => setSteps((s) => [...s, { title: '', type: '', env: '', mandatory: true }]);
  const updateStep = (i: number, patch: Partial<StepDraft>) => setSteps((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    setSubmitted(true);
    setFormError('');
    if (!isValid) return;
    const payloadSteps: NewSopTemplateStep[] = validSteps.map((s) => ({ title: s.title.trim(), stepType: s.type || undefined, environment: s.env || undefined, isMandatory: s.mandatory }));
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined, deployment_category: category?.value || undefined, target_env: env?.value || undefined, steps: payloadSteps },
      {
        onSuccess: () => { catalystToast.success('SOP template created'); onClose(); },
        onError: (err: any) => { setFormError(err?.message || 'Failed to create template'); catalystToast.error('Failed to create template'); },
      },
    );
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large">
        <ModalHeader hasCloseButton><ModalTitle>New SOP template</ModalTitle></ModalHeader>
        <ModalBody>
          {formError && (
            <div style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: 'var(--ds-text-danger, #AE2A19)', background: 'var(--ds-background-danger, #FFECEB)', padding: 8, borderRadius: 4, marginBottom: 16 }}>{formError}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="sop-name">Name *</label>
            <Textfield id="sop-name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="e.g. Standard frontend deploy" />
            {submitted && nameErr && <div style={errStyle}>{nameErr}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Deployment category</label>
              <Select inputId="sop-cat" options={CATEGORIES} value={category} onChange={(v) => setCategory(v as Opt)} placeholder="Select category" isClearable spacing="compact" menuPosition="fixed" />
            </div>
            <div>
              <label style={labelStyle}>Target environment</label>
              <Select inputId="sop-env" options={ENVS} value={env} onChange={(v) => setEnv(v as Opt)} placeholder="Select environment" isClearable spacing="compact" menuPosition="fixed" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="sop-desc">Description</label>
            <TextArea id="sop-desc" value={description} onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)} placeholder="Optional" minimumRows={2} />
          </div>

          <h3 style={{ fontFamily: RH.fontDisplay, fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: '8px 0' }}>Steps *</h3>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', minWidth: 16 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <Textfield value={s.title} onChange={(e) => updateStep(i, { title: (e.target as HTMLInputElement).value })} placeholder="Step title" isCompact />
              </div>
              <div style={{ width: 150 }}>
                <Select inputId={`sop-step-type-${i}`} options={STEP_TYPES} value={STEP_TYPES.find((o) => o.value === s.type) ?? null} onChange={(v) => updateStep(i, { type: (v as Opt)?.value ?? '' })} placeholder="Type" spacing="compact" menuPosition="fixed" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Toggle id={`sop-step-mand-${i}`} isChecked={s.mandatory} onChange={() => updateStep(i, { mandatory: !s.mandatory })} />
                <span style={{ fontFamily: RH.fontBody, fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)' }}>Required</span>
              </div>
              <button onClick={() => removeStep(i)} aria-label="Remove step" style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #626F86)', padding: 4 }}>
                <X size={14} style={{ color: 'var(--ds-text-subtlest, #626F86)' }} />
              </button>
            </div>
          ))}
          {submitted && validSteps.length === 0 && <div style={errStyle}>Add at least one step</div>}
          <button onClick={addStep} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 13, fontWeight: 500, color: 'var(--ds-link, #0C66E4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
            <Plus size={14} style={{ color: 'var(--ds-link, #0C66E4)' }} /> Add step
          </button>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={handleSubmit} isDisabled={create.isPending} isLoading={create.isPending}>Create template</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}
