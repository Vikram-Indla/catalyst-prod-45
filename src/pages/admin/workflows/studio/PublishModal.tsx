/** Publish confirmation modal — validates the draft, surfaces refusals. */
import { useState } from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionMessage,
  Spinner,
} from '@/components/ads';
import type { WfVersion } from '@/hooks/workflow-v2/useWorkflowFoundation';
import { usePublishVersion, useValidateDraft } from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_LABELS } from './entities';

export function PublishModal({
  version,
  onClose,
  onPublished,
}: {
  version: Pick<WfVersion, 'id' | 'entity_key' | 'version_no'>;
  onClose: () => void;
  onPublished?: () => void;
}) {
  const validation = useValidateDraft(version.id);
  const publish = usePublishVersion();
  const [publishError, setPublishError] = useState<string | null>(null);

  const issues = validation.data?.issues ?? [];
  const canPublish = validation.data?.ok === true && !publish.isPending;

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          Publish {ENTITY_LABELS[version.entity_key] ?? version.entity_key} v{version.version_no}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {validation.isLoading && <Spinner size="medium" />}
        {validation.isError && (
          <SectionMessage appearance="error" title="Couldn't validate this draft">
            {(validation.error as Error)?.message}
          </SectionMessage>
        )}
        {validation.data?.ok === false && (
          <SectionMessage appearance="warning" title="Fix these before publishing">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {issues.map((i, idx) => (
                <li key={idx}>
                  <code style={{ fontSize: 'var(--ds-font-size-100)' }}>{i.code}</code> — {i.detail}
                </li>
              ))}
            </ul>
          </SectionMessage>
        )}
        {validation.data?.ok === true && !publishError && (
          <p style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
            Publishing makes this version immutable and the runtime starts enforcing it
            immediately. The current published version is superseded and schemes are
            re-pointed. If this draft removed statuses that live items still use, the
            publish is refused with the list of statuses needing a remap.
          </p>
        )}
        {publishError && (
          <SectionMessage appearance="error" title="Publish refused">
            {publishError}
          </SectionMessage>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          isDisabled={!canPublish}
          onClick={() =>
            publish.mutate(
              { versionId: version.id },
              {
                onSuccess: () => {
                  onPublished?.();
                  onClose();
                },
                onError: (e) => setPublishError((e as Error).message),
              }
            )
          }
        >
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
