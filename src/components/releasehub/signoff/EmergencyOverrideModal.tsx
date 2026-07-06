/**
 * EmergencyOverrideModal — Phase 7 §9. Release/Change manager requests an
 * emergency override to bypass a specific gate (sign-off / freeze / readiness).
 * Reason mandatory. Product Owner / Admin approves or rejects it from the
 * Sign-off Queue. ads/Modal, no drawer.
 */
import React, { useState } from 'react';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import TextArea from '@atlaskit/textarea';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ads/Modal';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { useRequestOverride } from '@/hooks/useSignoffGraph';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

interface Opt { label: string; value: string }
const GATES: Opt[] = [
  { label: 'Sign-off (approvals)', value: 'signoff' }, { label: 'Freeze window', value: 'freeze:production' },
  { label: 'Readiness', value: 'readiness' }, { label: 'Change gate', value: 'change' },
];

export function EmergencyOverrideModal({ onClose, changeId, releaseId, scope = 'change' }: { onClose: () => void; changeId?: string; releaseId?: string; scope?: 'change' | 'release' }) {
  const request = useRequestOverride();
  const [gate, setGate] = useState<Opt | null>(GATES[0]);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setSubmitted(true);
    if (!reason.trim() || !gate) return;
    request.mutate({ scope, changeId, releaseId, bypassedGate: gate.value, reason: reason.trim() },
      { onSuccess: () => { catalystToast.success('Emergency override requested — awaiting Product Owner / Admin approval'); onClose(); }, onError: (e: any) => catalystToast.error(e?.message ?? 'Failed to request override') });
  };

  return (
    <Modal isOpen onClose={onClose} width="medium" aria-label="Request emergency override">
      <ModalHeader><ModalTitle>Request emergency override</ModalTitle></ModalHeader>
      <ModalBody>
        <SectionMessage appearance="warning" title="Override is an audited exception">
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>This does not remove the original gate — it records a bypass request that a Product Owner or Admin must approve. The change/release stays visibly marked.</span>
        </SectionMessage>
        <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', margin: '12px 0 4px' }}>Gate to bypass</label>
        <Select inputId="ovr-gate" options={GATES} value={gate} onChange={(v: any) => setGate(v)} menuPosition="fixed" />
        <label style={{ display: 'block', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', margin: '12px 0 4px' }}>Reason <span style={{ color: 'var(--ds-text-danger)' }}>*</span></label>
        <TextArea value={reason} onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} placeholder="Why is an emergency override needed?" minimumRows={3} />
        {submitted && !reason.trim() && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)', marginTop: 4 }}>A reason is required.</div>}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="warning" isDisabled={request.isPending} onClick={submit}>Request override</Button>
      </ModalFooter>
    </Modal>
  );
}

export default EmergencyOverrideModal;
