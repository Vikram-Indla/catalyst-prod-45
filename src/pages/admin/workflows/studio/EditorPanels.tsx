/**
 * Workflow Studio editor — contextual property panels (P2.3).
 *
 * TransitionPanel: type, requires-reason/comment, allowed roles (+ assignee/
 * reporter/bypass flags), guards with evidence badges from the runtime's
 * GUARD_EVIDENCE_REGISTRY. StatusPanel: label, category, lifecycle flags,
 * set-initial, delete with rewire. All edits go through the P1 draft RPCs.
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  CatalystTag,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Textfield,
  type SelectOption,
} from '@/components/ads';
import type {
  WfVersionStatus,
  WfVersionTransition,
} from '@/hooks/workflow-v2/useWorkflowFoundation';
import {
  useDeleteDraftStatus,
  useDeleteDraftTransition,
  useSetTransitionGuards,
  useSetTransitionRoles,
  useTransitionDetail,
  useUpsertDraftStatus,
  useUpsertDraftTransition,
  type TransitionGuardInput,
  type TransitionRoleInput,
} from '@/hooks/workflow-v2/useWorkflowDraft';
import { GUARD_EVIDENCE_REGISTRY } from '@/lib/workflow/canonical/runtime';

const TRANSITION_TYPES = [
  'forward', 'backward', 'exception', 'reopen', 'cancel', 'reject', 'defer', 'rollback',
] as const;

const GUARD_TYPES = [
  'required_field', 'approval', 'brd_attached', 'figma_attached',
  'acceptance_criteria_present', 'assignee_required', 'child_completion',
  'test_coverage', 'qa_signoff', 'uat_signoff', 'no_open_blocker_critical',
  'release_readiness', 'deployment_window', 'deployment_evidence', 'rca',
  'reason_required', 'comment_required', 'smoke_evidence',
] as const;

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const opt = (v: string): SelectOption => ({ value: v, label: v });

const panelStyles: React.CSSProperties = {
  width: 300,
  flexShrink: 0,
  borderLeft: '1px solid var(--ds-border)',
  padding: '12px 16px',
  overflowY: 'auto',
  background: 'var(--ds-surface)',
};

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)', flex: 1 }}>{title}</span>
      <Button appearance="subtle" spacing="compact" onClick={onClose}>✕</Button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', margin: '12px 0 4px' }}>
      {children}
    </div>
  );
}

// ── Transition panel ─────────────────────────────────────────────────────────
export function TransitionPanel({
  versionId,
  transition,
  isDraft,
  onClose,
  onError,
}: {
  versionId: string;
  transition: WfVersionTransition;
  isDraft: boolean;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const detail = useTransitionDetail(transition.id);
  const upsertTransition = useUpsertDraftTransition(versionId);
  const setRoles = useSetTransitionRoles(versionId);
  const setGuards = useSetTransitionGuards(versionId);
  const deleteTransition = useDeleteDraftTransition(versionId);

  const [newRole, setNewRole] = useState('');
  const [newGuard, setNewGuard] = useState<SelectOption | null>(null);

  const roles = detail.data?.roles ?? [];
  const guards = detail.data?.guards ?? [];

  const patchTransition = (patch: Record<string, unknown>) =>
    upsertTransition.mutate(
      {
        id: transition.id,
        from_status_key: transition.from_status_key,
        to_status_key: transition.to_status_key,
        ...patch,
      },
      { onError }
    );

  const saveRoles = (next: TransitionRoleInput[]) =>
    setRoles.mutate({ transitionId: transition.id, roles: next }, { onError });
  const saveGuards = (next: TransitionGuardInput[]) =>
    setGuards.mutate({ transitionId: transition.id, guards: next }, { onError });

  return (
    <aside style={panelStyles} aria-label="Transition properties">
      <PanelHeader
        title={`${transition.from_status_key ?? '(any)'} → ${transition.to_status_key}`}
        onClose={onClose}
      />

      {detail.isError && (
        <SectionMessage appearance="error" title="Couldn't load transition detail">
          {(detail.error as Error)?.message}
        </SectionMessage>
      )}
      {detail.isLoading && <Spinner size="small" />}

      <FieldLabel>Type</FieldLabel>
      <Select usePortal
        options={TRANSITION_TYPES.map(opt)}
        value={opt(transition.transition_type)}
        onChange={(o) => o && isDraft && patchTransition({ transition_type: o.value })}
        isDisabled={!isDraft}
        ariaLabel="Transition type"
      />

      <FieldLabel>Requirements</FieldLabel>
      <Checkbox
        label="Requires reason"
        isChecked={transition.requires_reason}
        isDisabled={!isDraft}
        onChange={(e) => patchTransition({ requires_reason: e.target.checked })}
      />
      <Checkbox
        label="Requires comment"
        isChecked={transition.requires_comment}
        isDisabled={!isDraft}
        onChange={(e) => patchTransition({ requires_comment: e.target.checked })}
      />

      <FieldLabel>Allowed roles</FieldLabel>
      {roles.length === 0 && (
        <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
          No role restriction — anyone may run this transition.
        </p>
      )}
      {roles.map((r) => (
        <div key={r.id} style={{ border: '1px solid var(--ds-border)', borderRadius: 4, padding: '4px 8px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-100)', flex: 1 }}>{r.role_group}</span>
            {isDraft && (
              <Button
                appearance="subtle"
                spacing="compact"
                onClick={() => saveRoles(roles.filter((x) => x.id !== r.id))}
              >
                Remove
              </Button>
            )}
          </div>
          <Checkbox
            label="Assignee may run"
            isChecked={r.allow_assignee}
            isDisabled={!isDraft}
            onChange={(e) =>
              saveRoles(roles.map((x) => (x.id === r.id ? { ...x, allow_assignee: e.target.checked } : x)))
            }
          />
          <Checkbox
            label="Reporter may run"
            isChecked={r.allow_reporter}
            isDisabled={!isDraft}
            onChange={(e) =>
              saveRoles(roles.map((x) => (x.id === r.id ? { ...x, allow_reporter: e.target.checked } : x)))
            }
          />
          <Checkbox
            label="Super-admin bypass"
            isChecked={r.allow_super_admin_bypass}
            isDisabled={!isDraft}
            onChange={(e) =>
              saveRoles(roles.map((x) => (x.id === r.id ? { ...x, allow_super_admin_bypass: e.target.checked } : x)))
            }
          />
        </div>
      ))}
      {isDraft && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Textfield
            value={newRole}
            onChange={(e) => setNewRole((e.target as HTMLInputElement).value)}
            placeholder="Role group (e.g. eng_lead)"
          />
          <Button
            spacing="compact"
            isDisabled={!newRole.trim()}
            onClick={() => {
              saveRoles([...roles, { role_group: newRole.trim() }]);
              setNewRole('');
            }}
          >
            Add
          </Button>
        </div>
      )}

      <FieldLabel>Guards</FieldLabel>
      {guards.length === 0 && (
        <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
          No guards on this transition.
        </p>
      )}
      {guards.map((g) => {
        const reg = GUARD_EVIDENCE_REGISTRY[g.guard_type];
        return (
          <div key={g.id} style={{ border: '1px solid var(--ds-border)', borderRadius: 4, padding: '4px 8px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, flex: 1 }}>{g.guard_type}</span>
              <CatalystTag
                color={reg?.blockingSafe ? 'green' : 'yellow'}
                text={reg?.blockingSafe ? 'evidence' : 'advisory'}
              />
              {isDraft && (
                <Button
                  appearance="subtle"
                  spacing="compact"
                  onClick={() => saveGuards(guards.filter((x) => x.id !== g.id))}
                >
                  Remove
                </Button>
              )}
            </div>
            <Checkbox
              label="Blocking"
              isChecked={g.is_blocking}
              isDisabled={!isDraft}
              onChange={(e) =>
                saveGuards(guards.map((x) => (x.id === g.id ? { ...x, is_blocking: e.target.checked } : x)))
              }
            />
            {reg && (
              <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', margin: 0 }}>
                {reg.note}
              </p>
            )}
          </div>
        );
      })}
      {isDraft && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Select usePortal
              options={GUARD_TYPES.filter((t) => !guards.some((g) => g.guard_type === t)).map(opt)}
              value={newGuard}
              onChange={setNewGuard}
              placeholder="Add guard…"
              ariaLabel="Add guard"
            />
          </div>
          <Button
            spacing="compact"
            isDisabled={!newGuard}
            onClick={() => {
              if (!newGuard) return;
              const reg = GUARD_EVIDENCE_REGISTRY[newGuard.value];
              saveGuards([
                ...guards,
                { guard_type: newGuard.value, is_blocking: reg?.blockingSafe === true },
              ]);
              setNewGuard(null);
            }}
          >
            Add
          </Button>
        </div>
      )}

      {isDraft && (
        <div style={{ marginTop: 16 }}>
          <Button
            appearance="danger"
            spacing="compact"
            onClick={() => deleteTransition.mutate(transition.id, { onSuccess: onClose, onError })}
          >
            Delete transition
          </Button>
        </div>
      )}
    </aside>
  );
}

// ── Status panel ─────────────────────────────────────────────────────────────
export function StatusPanel({
  versionId,
  status,
  allStatuses,
  isDraft,
  onClose,
  onError,
}: {
  versionId: string;
  status: WfVersionStatus;
  allStatuses: WfVersionStatus[];
  isDraft: boolean;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const upsertStatus = useUpsertDraftStatus(versionId);
  const deleteStatus = useDeleteDraftStatus(versionId);

  const [label, setLabel] = useState(status.display_label);
  const [rewireTo, setRewireTo] = useState<SelectOption | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    setLabel(status.display_label);
    setConfirmingDelete(false);
    setRewireTo(null);
  }, [status.status_key, status.display_label]);

  const patch = (p: Record<string, unknown>) =>
    upsertStatus.mutate(
      {
        status_key: status.status_key,
        display_label: status.display_label,
        category: status.category as 'todo' | 'in_progress' | 'done',
        sort_order: status.sort_order,
        is_initial: status.is_initial,
        is_terminal: status.is_terminal,
        is_exception: status.is_exception,
        supports_reopen: status.supports_reopen,
        requires_reason: status.requires_reason,
        color_token: status.color_token,
        lifecycle_group: status.lifecycle_group,
        ...p,
      },
      { onError }
    );

  const rewireOptions = allStatuses
    .filter((s) => s.status_key !== status.status_key)
    .map((s) => ({ value: s.status_key, label: s.display_label }));

  return (
    <aside style={panelStyles} aria-label="Status properties">
      <PanelHeader title={status.display_label} onClose={onClose} />

      <FieldLabel>Name</FieldLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        <Textfield
          value={label}
          onChange={(e) => setLabel((e.target as HTMLInputElement).value)}
          isDisabled={!isDraft}
        />
        {isDraft && label.trim() !== status.display_label && (
          <Button spacing="compact" appearance="primary" onClick={() => patch({ display_label: label.trim() })}>
            Save
          </Button>
        )}
      </div>
      <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4 }}>
        key: <code>{status.status_key}</code> (frozen)
      </p>

      <FieldLabel>Category</FieldLabel>
      <Select usePortal
        options={CATEGORY_OPTIONS}
        value={CATEGORY_OPTIONS.find((o) => o.value === status.category) ?? null}
        onChange={(o) => o && isDraft && patch({ category: o.value })}
        isDisabled={!isDraft}
        ariaLabel="Status category"
      />

      <FieldLabel>Flags</FieldLabel>
      <Checkbox
        label="Initial status"
        isChecked={status.is_initial}
        isDisabled={!isDraft || status.is_initial}
        onChange={() => patch({ is_initial: true })}
      />
      <Checkbox
        label="Terminal"
        isChecked={status.is_terminal}
        isDisabled={!isDraft}
        onChange={(e) => patch({ is_terminal: e.target.checked })}
      />
      <Checkbox
        label="Exception"
        isChecked={status.is_exception}
        isDisabled={!isDraft}
        onChange={(e) => patch({ is_exception: e.target.checked })}
      />
      <Checkbox
        label="Supports reopen"
        isChecked={status.supports_reopen}
        isDisabled={!isDraft}
        onChange={(e) => patch({ supports_reopen: e.target.checked })}
      />
      <Checkbox
        label="Entering requires reason"
        isChecked={status.requires_reason}
        isDisabled={!isDraft}
        onChange={(e) => patch({ requires_reason: e.target.checked })}
      />

      {isDraft && (
        <div style={{ marginTop: 16 }}>
          {!confirmingDelete ? (
            <Button appearance="danger" spacing="compact" onClick={() => setConfirmingDelete(true)}>
              Delete status…
            </Button>
          ) : (
            <div style={{ border: '1px solid var(--ds-border-danger)', borderRadius: 4, padding: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-100)', marginBottom: 8 }}>
                Re-point inbound transitions to (optional — otherwise they are removed):
              </p>
              <Select usePortal
                options={rewireOptions}
                value={rewireTo}
                onChange={setRewireTo}
                placeholder="Rewire target…"
                ariaLabel="Rewire target"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button appearance="subtle" spacing="compact" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button
                  appearance="danger"
                  spacing="compact"
                  onClick={() =>
                    deleteStatus.mutate(
                      { statusKey: status.status_key, rewireTo: rewireTo?.value ?? null },
                      { onSuccess: onClose, onError }
                    )
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
