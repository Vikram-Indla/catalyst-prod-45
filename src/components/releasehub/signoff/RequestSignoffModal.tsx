/**
 * RequestSignoffModal — Phase 7 §8. Release/Change manager requests a sign-off:
 * scope (release|change) + entity + required role + approver + due + reason.
 * Prevents duplicate pending gates (enforced in useRequestSignoff). ads/Modal.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import TextArea from '@atlaskit/textarea';
import Textfield from '@atlaskit/textfield';
import { supabase } from '@/integrations/supabase/client';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ads/Modal';
import { useRequestSignoff } from '@/hooks/useSignoffGraph';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

interface Opt { label: string; value: string }
const lbl: React.CSSProperties = { display: 'block', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4, marginTop: 12 };
const ROLES: Opt[] = [
  { label: 'QA', value: 'qa' }, { label: 'UAT', value: 'uat' }, { label: 'Product owner', value: 'product_owner' },
  { label: 'Project manager', value: 'project_manager' }, { label: 'Release manager', value: 'release_manager' }, { label: 'Change manager', value: 'change_manager' },
];

export function RequestSignoffModal({ onClose, presetScope, presetEntityId }: { onClose: () => void; presetScope?: 'change' | 'release'; presetEntityId?: string }) {
  const request = useRequestSignoff();
  const [scope, setScope] = useState<'change' | 'release'>(presetScope ?? 'change');
  const [entity, setEntity] = useState<Opt | null>(null);
  const [role, setRole] = useState<Opt | null>(null);
  const [approver, setApprover] = useState<Opt | null>(null);
  const [due, setDue] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: entities = [] } = useQuery({
    queryKey: ['release-hub', 'signoff-entity-opts', scope],
    queryFn: async (): Promise<Opt[]> => {
      if (scope === 'release') { const { data } = await supabase.from('rh_releases').select('id, name').order('name'); return (data ?? []).map((r: any) => ({ label: r.name, value: r.id })); }
      const { data } = await supabase.from('rh_changes').select('id, chg_number, title').order('updated_at', { ascending: false }); return (data ?? []).map((c: any) => ({ label: `${c.chg_number} · ${c.title}`, value: c.id }));
    },
  });
  const { data: people = [] } = useQuery({ queryKey: ['release-hub', 'signoff-people'], staleTime: 60_000, queryFn: async (): Promise<Opt[]> => { const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name').limit(50); return (data ?? []).map((p: any) => ({ label: p.full_name || p.email || 'Unknown', value: p.id })); } });

  const entityId = presetEntityId ?? entity?.value;
  const valid = !!entityId && !!role;
  const submit = () => {
    setSubmitted(true); if (!valid) return;
    request.mutate({ scope, entityId: entityId!, role: role!.value, approverId: approver?.value, dueDate: due || undefined, reason: reason.trim() || undefined },
      { onSuccess: () => { catalystToast.success('Sign-off requested'); onClose(); }, onError: (e: any) => catalystToast.error(e?.message ?? 'Failed to request sign-off') });
  };

  return (
    <Modal isOpen onClose={onClose} width="medium" aria-label="Request sign-off">
      <ModalHeader><ModalTitle>Request sign-off</ModalTitle></ModalHeader>
      <ModalBody>
        {!presetScope && (
          <>
            <label style={{ ...lbl, marginTop: 0 }}>Scope</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance={scope === 'change' ? 'primary' : 'default'} spacing="compact" onClick={() => { setScope('change'); setEntity(null); }}>Change</Button>
              <Button appearance={scope === 'release' ? 'primary' : 'default'} spacing="compact" onClick={() => { setScope('release'); setEntity(null); }}>Release</Button>
            </div>
          </>
        )}
        {!presetEntityId && (<><label style={lbl}>{scope === 'release' ? 'Release' : 'Change'} <span style={{ color: 'var(--ds-text-danger)' }}>*</span></label>
          <Select inputId="so-entity" options={entities} value={entity} onChange={(v: any) => setEntity(v)} placeholder={`Select a ${scope}`} menuPosition="fixed" />
          {submitted && !entityId && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>Required</div>}</>)}
        <label style={lbl}>Required role <span style={{ color: 'var(--ds-text-danger)' }}>*</span></label>
        <Select inputId="so-role" options={ROLES} value={role} onChange={(v: any) => setRole(v)} placeholder="Approval role" menuPosition="fixed" />
        {submitted && !role && <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger)' }}>Required</div>}
        <label style={lbl}>Approver</label>
        <Select inputId="so-approver" options={people} value={approver} onChange={(v: any) => setApprover(v)} placeholder="Assign an approver (optional)" isClearable menuPosition="fixed" />
        <label style={lbl}>Due</label>
        <Textfield type="datetime-local" value={due} onChange={(e) => setDue((e.target as HTMLInputElement).value)} />
        <label style={lbl}>Request note</label>
        <TextArea value={reason} onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} placeholder="Optional context for the approver" minimumRows={2} />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={request.isPending} onClick={submit}>Request</Button>
      </ModalFooter>
    </Modal>
  );
}

export default RequestSignoffModal;
