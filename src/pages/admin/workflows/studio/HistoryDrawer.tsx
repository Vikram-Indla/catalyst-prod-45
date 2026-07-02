/** Version history drawer — list of an entity's versions + restore-as-draft. */
import { useNavigate } from 'react-router-dom';
import { Button, CatalystDrawer, Heading, Lozenge, SectionMessage, Spinner } from '@/components/ads';
import { useWfVersions } from '@/hooks/workflow-v2/useWorkflowFoundation';
import { useCreateDraft } from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_LABELS, LIFECYCLE_APPEARANCE, fmtDate } from './entities';

export function HistoryDrawer({
  entityKey,
  isOpen,
  onClose,
  onError,
}: {
  entityKey: string;
  isOpen: boolean;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const navigate = useNavigate();
  const versionsQuery = useWfVersions();
  const createDraft = useCreateDraft();

  const rows = (versionsQuery.data ?? [])
    .filter((v) => v.entity_key === entityKey)
    .sort((a, b) => b.version_no - a.version_no);

  const hasDraft = rows.some((r) => r.lifecycle === 'draft');

  return (
    <CatalystDrawer isOpen={isOpen} onClose={onClose} label="Version history" width="medium">
      <div style={{ padding: '16px 24px 24px 0' }}>
        <div style={{ marginBottom: 12 }}>
          <Heading as="h2" size="medium">
            {ENTITY_LABELS[entityKey] ?? entityKey} — version history
          </Heading>
        </div>
        {versionsQuery.isError && (
          <SectionMessage appearance="error" title="Couldn't load history">
            {(versionsQuery.error as Error)?.message}
          </SectionMessage>
        )}
        {versionsQuery.isLoading && <Spinner size="medium" />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((v) => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                padding: '8px 12px',
              }}
            >
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 32 }}>
                v{v.version_no}
              </span>
              <Lozenge appearance={LIFECYCLE_APPEARANCE[v.lifecycle] ?? 'default'}>{v.lifecycle}</Lozenge>
              <span style={{ flex: 1, fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                {v.notes ?? ''}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                {fmtDate(v.published_at ?? v.created_at)}
              </span>
              <Button
                appearance="subtle"
                spacing="compact"
                onClick={() => {
                  navigate(`/admin/workflows/${v.id}/edit`);
                  onClose();
                }}
              >
                Open
              </Button>
              {v.lifecycle !== 'draft' && !hasDraft && (
                <Button
                  spacing="compact"
                  isDisabled={createDraft.isPending}
                  onClick={() =>
                    createDraft.mutate(
                      { fromVersionId: v.id },
                      {
                        onSuccess: (id) => {
                          navigate(`/admin/workflows/${id}/edit`);
                          onClose();
                        },
                        onError,
                      }
                    )
                  }
                >
                  Restore as draft
                </Button>
              )}
            </div>
          ))}
        </div>
        {hasDraft && (
          <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 12 }}>
            An open draft already exists — discard or publish it before restoring another version.
          </p>
        )}
      </div>
    </CatalystDrawer>
  );
}
