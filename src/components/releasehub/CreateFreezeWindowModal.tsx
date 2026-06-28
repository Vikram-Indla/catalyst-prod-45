/**
 * CreateFreezeWindowModal — Release Operations (Phase 13).
 * @atlaskit modal capturing a freeze window (name, date range, env/product
 * scope, reason). New windows start at status 'scheduled'.
 */
import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { DatePicker } from '@atlaskit/datetime-picker';
import { useCreateFreezeWindow } from '@/hooks/useReleaseHub';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

interface Props { onClose: () => void }
interface Opt { label: string; value: string }

const ENVS: Opt[] = [
  { label: 'All environments', value: 'all' },
  { label: 'QA', value: 'qa' },
  { label: 'Beta', value: 'beta' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'production' },
];

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4 };
const errStyle: React.CSSProperties = { fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger, #AE2A19)', marginTop: 4 };

export function CreateFreezeWindowModal({ onClose }: Props) {
  const create = useCreateFreezeWindow();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [env, setEnv] = useState<Opt | null>(null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const errors = {
    name: !name.trim() ? 'Name is required' : '',
    start: !start ? 'Start date is required' : '',
    end: !end ? 'End date is required' : (start && end < start ? 'End must be on or after start' : ''),
  };
  const isValid = !errors.name && !errors.start && !errors.end;

  const handleSubmit = () => {
    setSubmitted(true);
    setFormError('');
    if (!isValid) return;
    create.mutate(
      { name: name.trim(), start_date: start, end_date: end, reason: reason.trim() || undefined, target_env: env?.value || 'all', applicability: 'all', status: 'scheduled' },
      {
        onSuccess: () => { catalystToast.success('Freeze window created'); onClose(); },
        onError: (err: any) => { setFormError(err?.message || 'Failed to create freeze window'); catalystToast.error('Failed to create freeze window'); },
      },
    );
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium">
        <ModalHeader hasCloseButton><ModalTitle>New freeze window</ModalTitle></ModalHeader>
        <ModalBody>
          {formError && (
            <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-danger, #AE2A19)', background: 'var(--ds-background-danger, #FFECEB)', padding: 8, borderRadius: 4, marginBottom: 16 }}>{formError}</div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="frz-name">Name *</label>
            <Textfield id="frz-name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="e.g. Year-end production freeze" />
            {submitted && errors.name && <div style={errStyle}>{errors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Start date *</label>
              <DatePicker value={start} onChange={setStart} placeholder="Select date" />
              {submitted && errors.start && <div style={errStyle}>{errors.start}</div>}
            </div>
            <div>
              <label style={labelStyle}>End date *</label>
              <DatePicker value={end} onChange={setEnd} placeholder="Select date" />
              {submitted && errors.end && <div style={errStyle}>{errors.end}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Environment scope</label>
            <Select inputId="frz-env" options={ENVS} value={env} onChange={(v) => setEnv(v as Opt)} placeholder="All environments" isClearable spacing="compact" menuPosition="fixed" />
          </div>

          <div>
            <label style={labelStyle} htmlFor="frz-reason">Reason</label>
            <TextArea id="frz-reason" value={reason} onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} placeholder="Why is this freeze in place?" minimumRows={2} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={handleSubmit} isDisabled={create.isPending} isLoading={create.isPending}>Create freeze window</Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}
