/**
 * ApplySopTemplateModal — Phase 4 §5. Select an active SOP template, preview the
 * executable steps + computed timing, then replace non-started steps or append.
 * Canonical ads/Modal. No drawer.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import { supabase } from '@/integrations/supabase/client';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ads/Modal';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { useSopTemplatesFull, useApplyTemplateWithTiming, previewTemplateSteps } from '@/hooks/useSopRunbook';
import { catalystToast } from '@/lib/catalystToast';
import { RH } from '@/constants/releasehub.design';

const T = { text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', border: 'var(--ds-border)', sunken: 'var(--ds-surface-sunken)', warning: 'var(--ds-text-warning)' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const titleCase = (v: string | null) => (!v ? '—' : v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '));

export function ApplySopTemplateModal({ changeId, change, existingCount, onClose }: { changeId: string; change: any; existingCount: number; onClose: () => void }) {
  const { data: templates = [] } = useSopTemplatesFull();
  const apply = useApplyTemplateWithTiming();
  const [sel, setSel] = useState<{ label: string; value: string } | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>(existingCount > 0 ? 'append' : 'replace');

  const plannedStart = change?.planned_start_at ?? change?.window_start ?? null;
  const activeTemplates = templates.filter((t) => t.isActive && t.stepCount > 0);
  const opts = activeTemplates.map((t) => ({ label: `${t.name} · ${t.stepCount} steps`, value: t.id }));
  const selectedTemplate = templates.find((t) => t.id === sel?.value);

  const { data: preview = [] } = useQuery({
    queryKey: ['release-hub', 'apply-preview', sel?.value, plannedStart],
    enabled: !!sel?.value,
    queryFn: async () => {
      const { data } = await supabase.from('rh_sop_template_steps').select('*').eq('template_id', sel!.value).order('step_no');
      return previewTemplateSteps(data ?? [], plannedStart);
    },
  });

  const missingOwners = useMemo(() => preview.filter((p) => !p.defaultOwnerId).length, [preview]);

  const doApply = () => {
    if (!sel) return;
    apply.mutate({ templateId: sel.value, changeId, mode, plannedStartAt: plannedStart, templateName: selectedTemplate?.name }, {
      onSuccess: (n) => { catalystToast.success(`Applied ${n} step${n === 1 ? '' : 's'} (${mode})`); onClose(); },
      onError: () => catalystToast.error('Failed to apply template'),
    });
  };

  return (
    <Modal isOpen onClose={onClose} width="large" aria-label="Apply SOP template">
      <ModalHeader><ModalTitle>Apply SOP template</ModalTitle></ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>Template (active, with steps)</label>
            <Select inputId="apply-tmpl" options={opts} value={sel} onChange={(v: any) => setSel(v)} placeholder="Select an SOP template" menuPosition="fixed" />
          </div>

          {!plannedStart && <SectionMessage appearance="warning" title="No planned window"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>This change has no planned start; step timings cannot be fully calculated. Set a planned window on the change for scheduled timings.</span></SectionMessage>}
          {sel && missingOwners > 0 && <SectionMessage appearance="warning" title="Assignment needed"><span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)' }}>{missingOwners} generated step(s) have no default owner — assign users in the runbook after applying.</span></SectionMessage>}

          {existingCount > 0 && (
            <div>
              <label style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>This change already has {existingCount} step(s)</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button appearance={mode === 'append' ? 'primary' : 'default'} spacing="compact" onClick={() => setMode('append')}>Append</Button>
                <Button appearance={mode === 'replace' ? 'primary' : 'default'} spacing="compact" onClick={() => setMode('replace')}>Replace not-started</Button>
              </div>
              <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, margin: '4px 0 0' }}>Replace removes only steps that have not started — executed history is preserved.</p>
            </div>
          )}

          {sel && preview.length > 0 && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ background: T.sunken, padding: '6px 12px', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest }}>Preview — {preview.length} steps will be generated</div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {preview.map((p) => (
                  <div key={p.stepNo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderTop: `1px solid ${T.border}` }}>
                    <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-100)', color: T.subtlest, minWidth: 18 }}>{p.stepNo}</span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}{p.isRollback ? ' ↩' : ''}</span>
                    <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtle }}>{titleCase(p.stepType)}</span>
                    <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{fmt(p.plannedStartAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" isDisabled={!sel || apply.isPending} onClick={doApply}>{mode === 'replace' && existingCount > 0 ? 'Replace & generate' : 'Generate steps'}</Button>
      </ModalFooter>
    </Modal>
  );
}

export default ApplySopTemplateModal;
