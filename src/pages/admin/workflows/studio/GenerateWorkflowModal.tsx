/**
 * Caty AI workflow generation (P4): prompt → server-validated preview →
 * accept as DRAFT. The AI can only ever produce drafts; publishing stays a
 * human action in the editor.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextArea from '@atlaskit/textarea';
import {
  Button,
  Lozenge,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionMessage,
  Select,
  Spinner,
  type SelectOption,
} from '@/components/ads';
import {
  useGenerateWorkflow,
  useImportGeneratedWorkflow,
  type GeneratedWorkflow,
} from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_GROUPS } from './entities';

const ENTITY_OPTIONS: SelectOption[] = ENTITY_GROUPS.flatMap((g) => g.entities)
  .filter((e) => !e.readOnly)
  .map((e) => ({ value: e.key, label: e.label }));

export function GenerateWorkflowModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const generate = useGenerateWorkflow();
  const importGen = useImportGeneratedWorkflow();

  const [entity, setEntity] = useState<SelectOption | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<{ cacheId: string; workflow: GeneratedWorkflow } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = generate.isPending || importGen.isPending;

  return (
    <Modal isOpen onClose={onClose} width="large">
      <ModalHeader>
        <ModalTitle>Generate workflow with Caty</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ maxWidth: 280 }}>
              <Select usePortal usePortal
                options={ENTITY_OPTIONS}
                value={entity}
                onChange={setEntity}
                placeholder="For work item type…"
                ariaLabel="Entity type"
              />
            </div>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the workflow… e.g. 'Defects need triage, a fix loop, QA verification, and a reason whenever something is rejected or reopened.'"
              minimumRows={5}
              resize="vertical"
            />
            <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', margin: 0 }}>
              Output lands as a draft for review — Caty never publishes. Requires no open
              draft with content for the chosen type.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{result.workflow.name}</span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                {result.workflow.statuses.length} statuses · {result.workflow.transitions.length} transitions
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.workflow.statuses.map((s) => (
                <span key={s.status_key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Lozenge
                    appearance={
                      s.category === 'done' ? 'success' : s.category === 'in_progress' ? 'inprogress' : 'default'
                    }
                  >
                    {s.display_label}
                  </Lozenge>
                  {s.is_initial && (
                    <span aria-label="initial" style={{ color: 'var(--ds-icon-warning)', fontSize: 'var(--ds-font-size-100)' }}>
                      ★
                    </span>
                  )}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
              {result.workflow.transitions.map((t, i) => (
                <div key={i}>
                  {t.from_status_key ?? '(any)'} → {t.to_status_key}
                  {t.transition_type !== 'forward' && (
                    <span style={{ color: 'var(--ds-text-subtlest)' }}> · {t.transition_type}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {busy && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Spinner size="medium" />
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12 }}>
            <SectionMessage appearance="error" title={result ? "Couldn't create the draft" : 'Generation failed'}>
              {error}
            </SectionMessage>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        {result && (
          <Button appearance="subtle" onClick={() => { setResult(null); setError(null); }}>
            ◀ Edit prompt
          </Button>
        )}
        {!result ? (
          <Button
            appearance="primary"
            isDisabled={busy || !entity || prompt.trim().length < 8}
            onClick={() => {
              setError(null);
              generate.mutate(
                { entityKey: entity!.value as string, prompt: prompt.trim() },
                {
                  onSuccess: (r) => setResult({ cacheId: r.cache_id, workflow: r.workflow }),
                  onError: (e) => setError((e as Error).message),
                }
              );
            }}
          >
            {generate.isPending ? 'Generating…' : 'Generate ⚡'}
          </Button>
        ) : (
          <Button
            appearance="primary"
            isDisabled={busy}
            onClick={() => {
              setError(null);
              importGen.mutate(
                { cacheId: result.cacheId, entityKey: entity?.value as string },
                {
                  onSuccess: (draftId) => {
                    onClose();
                    navigate(`/admin/workflows/${draftId}/edit`);
                  },
                  onError: (e) => setError((e as Error).message),
                }
              );
            }}
          >
            {importGen.isPending ? 'Creating draft…' : 'Accept as draft →'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
