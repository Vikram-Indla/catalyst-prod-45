/**
 * Publish confirmation modal — validates the draft, shows the status delta vs
 * the currently published version, and collects a remap target for every
 * removed status (the publish RPC refuses without full remap coverage).
 */
import { useMemo, useState } from 'react';
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
  useWfVersions,
  useWfVersionStatuses,
  type WfVersion,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
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
  const [remaps, setRemaps] = useState<Record<string, string>>({});

  // Delta vs the currently published version of the same entity.
  const versionsQuery = useWfVersions();
  const publishedVersion = (versionsQuery.data ?? []).find(
    (v) => v.entity_key === version.entity_key && v.lifecycle === 'published'
  );
  const draftStatuses = useWfVersionStatuses(version.id);
  const publishedStatuses = useWfVersionStatuses(publishedVersion?.id ?? null);

  const { added, removed } = useMemo(() => {
    const draftKeys = new Set((draftStatuses.data ?? []).map((s) => s.status_key));
    const pubKeys = new Set((publishedStatuses.data ?? []).map((s) => s.status_key));
    return {
      added: [...draftKeys].filter((k) => !pubKeys.has(k)),
      removed: [...pubKeys].filter((k) => !draftKeys.has(k)),
    };
  }, [draftStatuses.data, publishedStatuses.data]);

  const remapOptions: SelectOption[] = (draftStatuses.data ?? []).map((s) => ({
    value: s.status_key,
    label: s.display_label,
  }));

  const remapsComplete = removed.every((k) => !!remaps[k]);
  const deltaLoading =
    draftStatuses.isLoading || (publishedVersion && publishedStatuses.isLoading);
  const canPublish =
    validation.data?.ok === true && remapsComplete && !deltaLoading && !publish.isPending;

  const issues = validation.data?.issues ?? [];

  return (
    <Modal isOpen onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>
          Publish {ENTITY_LABELS[version.entity_key] ?? version.entity_key} v{version.version_no}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {(validation.isLoading || deltaLoading) && <Spinner size="medium" />}
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

        {validation.data?.ok === true && !deltaLoading && (
          <>
            {publishedVersion ? (
              <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginBottom: 12 }}>
                Replaces published v{publishedVersion.version_no}. The runtime enforces the new
                version immediately after publish.
              </p>
            ) : (
              <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginBottom: 12 }}>
                First published version for this entity.
              </p>
            )}

            {added.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
                  Added statuses
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {added.map((k) => (
                    <Lozenge key={k} appearance="new">{k}</Lozenge>
                  ))}
                </div>
              </div>
            )}

            {removed.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <SectionMessage appearance="warning" title="Removed statuses need a destination">
                  <p style={{ marginBottom: 8, fontSize: 'var(--ds-font-size-100)' }}>
                    Items sitting on a removed status are re-pointed via these remaps.
                  </p>
                  {removed.map((k) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Lozenge appearance="removed">{k}</Lozenge>
                      <span aria-hidden>→</span>
                      <div style={{ flex: 1 }}>
                        <Select usePortal usePortal
                          options={remapOptions}
                          value={remapOptions.find((o) => o.value === remaps[k]) ?? null}
                          onChange={(o) =>
                            setRemaps((prev) => ({ ...prev, [k]: (o?.value as string) ?? '' }))
                          }
                          placeholder="Remap to…"
                          ariaLabel={`Remap ${k}`}
                        />
                      </div>
                    </div>
                  ))}
                </SectionMessage>
              </div>
            )}

            {added.length === 0 && removed.length === 0 && publishedVersion && (
              <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                No statuses added or removed — transitions, roles, guards and metadata changes only.
              </p>
            )}
          </>
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
              { versionId: version.id, remaps },
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
