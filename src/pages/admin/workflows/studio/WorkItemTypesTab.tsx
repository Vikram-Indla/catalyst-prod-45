/**
 * Workflow Studio — Work item types tab (P3.2).
 * Data-driven type registry: hierarchy levels, all types (system + custom),
 * create custom types (main or subtask), edit presentation/wiring, parent
 * rules, archive. System type identity is frozen server-side.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  CatalystTag,
  Checkbox,
  EmptyState,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Textfield,
  type SelectOption,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { WorkItemTypeIcon } from '@/components/icons';
import { useWfVersions } from '@/hooks/workflow-v2/useWorkflowFoundation';
import {
  useArchiveWorkItemType,
  useHierarchyLevels,
  useParentRules,
  useSetParentRules,
  useUpsertHierarchyLevel,
  useUpsertWorkItemType,
  useWorkItemTypes,
  type WorkItemTypeRow,
} from '@/hooks/workflow-v2/useWorkItemTypes';
import { useCreateDraft } from '@/hooks/workflow-v2/useWorkflowDraft';
import { ENTITY_LABELS, statusKeyFromLabel } from './entities';

const GROUP_OPTIONS: SelectOption[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'qa', label: 'QA' },
  { value: 'business', label: 'Business' },
  { value: 'technical', label: 'Technical' },
];

const ICON_OPTIONS: SelectOption[] = [
  'story', 'task', 'epic', 'sub-task', 'qa-bug', 'feature', 'change-request',
  'production-incident', 'business-request', 'business-gap', 'api-requirement',
  'frontend', 'backend', 'integration', 'figma', 'brd-task', 'uat-finding', 'release',
].map((v) => ({ value: v, label: v }));

export function WorkItemTypesTab() {
  const navigate = useNavigate();
  const levels = useHierarchyLevels();
  const types = useWorkItemTypes();
  const rules = useParentRules();
  const versions = useWfVersions();
  const upsert = useUpsertWorkItemType();
  const createDraft = useCreateDraft();
  const archive = useArchiveWorkItemType();
  const setRules = useSetParentRules();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const onError = (e: unknown) => setActionError((e as Error).message);

  const selected = (types.data ?? []).find((t) => t.id === selectedId) ?? null;

  const levelName = (id: string | null) => {
    const l = (levels.data ?? []).find((x) => x.id === id);
    return l ? `L${l.level_rank + 1} · ${l.name}` : '—';
  };

  const publishedFor = (entityKey: string | null) =>
    entityKey
      ? (versions.data ?? []).find((v) => v.entity_key === entityKey && v.lifecycle === 'published') ?? null
      : null;

  const columns: Column<WorkItemTypeRow>[] = [
    {
      id: 'type',
      label: 'Type',
      flex: true,
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <WorkItemTypeIcon type={row.icon} size={16} />
          <span style={{ fontWeight: 600 }}>{row.display_name}</span>
          {row.is_system ? <CatalystTag text="system" color="grey" /> : <CatalystTag text="custom" color="blue" />}
          {!row.is_enabled && <Lozenge appearance="removed">disabled</Lozenge>}
        </span>
      ),
    },
    { id: 'kind', label: 'Kind', width: 10, cell: ({ row }) => <span>{row.kind}</span> },
    {
      id: 'group',
      label: 'Group',
      width: 10,
      cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{row.group_key}</span>,
    },
    { id: 'level', label: 'Level', width: 16, cell: ({ row }) => <span>{levelName(row.hierarchy_level_id)}</span> },
    {
      id: 'workflow',
      label: 'Workflow',
      width: 20,
      cell: ({ row }) => {
        const pub = publishedFor(row.entity_key);
        if (pub) {
          return (
            <Button
              appearance="subtle"
              spacing="compact"
              onClick={() => navigate(`/admin/workflows/${pub.id}/edit`)}
            >
              {`${ENTITY_LABELS[row.entity_key ?? ''] ?? row.display_name} v${pub.version_no}`}
            </Button>
          );
        }
        // F1: every type with an entity namespace can start its own workflow.
        if (row.entity_key) {
          return (
            <Button
              appearance="subtle"
              spacing="compact"
              isDisabled={createDraft.isPending}
              onClick={() =>
                createDraft.mutate(
                  { entityKey: row.entity_key as string },
                  {
                    onSuccess: (id) => navigate(`/admin/workflows/${id}/edit`),
                    onError,
                  }
                )
              }
            >
              Create workflow
            </Button>
          );
        }
        return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
  ];

  const loadError = levels.error ?? types.error ?? rules.error;

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
      <div style={{ flex: 1, minWidth: 0, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {actionError && (
          <SectionMessage
            appearance="error"
            title="Action failed"
            actions={[{ key: 'x', text: 'Dismiss', onClick: () => setActionError(null) }]}
          >
            {actionError}
          </SectionMessage>
        )}

        {/* Hierarchy levels (P6: CRUD up to 10) */}
        <HierarchyLevelsCard onError={onError} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600 }}>All types</span>
          <Button appearance="primary" spacing="compact" onClick={() => { setCreating(true); setSelectedId(null); }}>
            Create type
          </Button>
        </div>

        {loadError ? (
          <SectionMessage
            appearance="error"
            title="Couldn't load the type registry"
            actions={[{ key: 'r', text: 'Retry', onClick: () => { levels.refetch(); types.refetch(); rules.refetch(); } }]}
          >
            {(loadError as Error).message}
          </SectionMessage>
        ) : types.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size="medium" />
          </div>
        ) : (types.data ?? []).length === 0 ? (
          <EmptyState header="No work item types" description="Seed migration missing — run 20260703100000." />
        ) : (
          <JiraTable<WorkItemTypeRow>
            columns={columns}
            data={types.data ?? []}
            getRowId={(r) => r.id}
            onRowClick={(row) => { setSelectedId(row.id); setCreating(false); }}
            density="compact"
            ariaLabel="Work item types"
          />
        )}
      </div>

      {(selected || creating) && (
        <TypeDetailPanel
          key={selected?.id ?? 'new'}
          type={creating ? null : selected}
          allTypes={types.data ?? []}
          levels={levels.data ?? []}
          rules={rules.data ?? []}
          onClose={() => { setSelectedId(null); setCreating(false); }}
          onSave={(input) =>
            upsert.mutate(input, {
              onSuccess: (id) => { setCreating(false); setSelectedId(id); },
              onError,
            })
          }
          onArchive={(id) => archive.mutate(id, { onSuccess: () => setSelectedId(null), onError })}
          onSaveRules={(childId, parents) =>
            setRules.mutate({ childTypeId: childId, parentTypeIds: parents }, { onError })
          }
          saving={upsert.isPending || setRules.isPending}
        />
      )}
    </div>
  );
}

// ── Hierarchy levels card (P6: add/rename/toggle, hard cap 10) ───────────────
function HierarchyLevelsCard({ onError }: { onError: (e: unknown) => void }) {
  const levels = useHierarchyLevels();
  const upsertLevel = useUpsertHierarchyLevel();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const rows = levels.data ?? [];
  const nextRank = rows.length ? Math.max(...rows.map((l) => l.level_rank)) + 1 : 0;
  const atCap = nextRank > 9;

  return (
    <div style={{ border: '1px solid var(--ds-border)', borderRadius: 6, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Hierarchy</span>
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', flex: 1 }}>
          up to 10 levels; types attach to a level · click a level to rename
        </span>
        {!adding ? (
          <Button spacing="compact" isDisabled={atCap} onClick={() => setAdding(true)}>
            {atCap ? 'Max 10 levels' : '+ Add level'}
          </Button>
        ) : (
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Textfield
              value={newName}
              onChange={(e) => setNewName((e.target as HTMLInputElement).value)}
              placeholder={`L${nextRank + 1} name…`}
              autoFocus
            />
            <Button
              appearance="primary"
              spacing="compact"
              isDisabled={!newName.trim() || upsertLevel.isPending}
              onClick={() =>
                upsertLevel.mutate(
                  { level_rank: nextRank, name: newName.trim() },
                  { onSuccess: () => { setNewName(''); setAdding(false); }, onError }
                )
              }
            >
              Add
            </Button>
            <Button appearance="subtle" spacing="compact" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </span>
        )}
      </div>
      {levels.isLoading ? (
        <Spinner size="small" />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {rows.map((l) =>
            editingId === l.id ? (
              <span key={l.id} style={{ display: 'inline-flex', gap: 4 }}>
                <Textfield
                  value={editName}
                  onChange={(e) => setEditName((e.target as HTMLInputElement).value)}
                  autoFocus
                />
                <Button
                  appearance="primary"
                  spacing="compact"
                  isDisabled={!editName.trim()}
                  onClick={() =>
                    upsertLevel.mutate(
                      { id: l.id, name: editName.trim() },
                      { onSuccess: () => setEditingId(null), onError }
                    )
                  }
                >
                  Save
                </Button>
                <Button
                  appearance="subtle"
                  spacing="compact"
                  onClick={() =>
                    upsertLevel.mutate(
                      { id: l.id, is_enabled: !l.is_enabled },
                      { onSuccess: () => setEditingId(null), onError }
                    )
                  }
                >
                  {l.is_enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button appearance="subtle" spacing="compact" onClick={() => setEditingId(null)}>
                  ✕
                </Button>
              </span>
            ) : (
              <button
                key={l.id}
                type="button"
                onClick={() => { setEditingId(l.id); setEditName(l.name); }}
                style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                aria-label={`Edit level ${l.name}`}
              >
                <CatalystTag color={l.is_enabled ? 'blue' : 'grey'} text={`L${l.level_rank + 1} ${l.name}`} />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail / create panel ────────────────────────────────────────────────────
function TypeDetailPanel({
  type,
  allTypes,
  levels,
  rules,
  onClose,
  onSave,
  onArchive,
  onSaveRules,
  saving,
}: {
  type: WorkItemTypeRow | null; // null = create mode
  allTypes: WorkItemTypeRow[];
  levels: { id: string; level_rank: number; name: string }[];
  rules: { child_type_id: string; parent_type_id: string | null }[];
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => void;
  onArchive: (id: string) => void;
  onSaveRules: (childTypeId: string, parents: (string | null)[]) => void;
  saving: boolean;
}) {
  const isCreate = type === null;
  const [name, setName] = useState(type?.display_name ?? '');
  const [icon, setIcon] = useState<SelectOption | null>(
    type ? { value: type.icon, label: type.icon } : null
  );
  const [kind, setKind] = useState<'standard' | 'subtask'>(type?.kind ?? 'standard');
  const [group, setGroup] = useState<SelectOption | null>(
    GROUP_OPTIONS.find((o) => o.value === (type?.group_key ?? 'standard')) ?? null
  );
  const [levelId, setLevelId] = useState<SelectOption | null>(null);

  const levelOptions: SelectOption[] = levels.map((l) => ({
    value: l.id,
    label: `L${l.level_rank + 1} · ${l.name}`,
  }));
  const currentLevel = type
    ? levelOptions.find((o) => o.value === type.hierarchy_level_id) ?? null
    : null;

  const myRules = type ? rules.filter((r) => r.child_type_id === type.id) : [];
  const parentIds = new Set(myRules.map((r) => r.parent_type_id));
  const parentCandidates = allTypes.filter((t) => t.kind === 'standard' && t.id !== type?.id);

  const [draftParents, setDraftParents] = useState<Set<string | null> | null>(null);
  const effectiveParents = draftParents ?? parentIds;

  const toggleParent = (id: string | null) => {
    const next = new Set(effectiveParents);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDraftParents(next);
  };

  return (
    <aside
      aria-label="Type detail"
      style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid var(--ds-border)',
        padding: '12px 16px',
        overflowY: 'auto',
        background: 'var(--ds-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, flex: 1 }}>{isCreate ? 'Create type' : type!.display_name}</span>
        {!isCreate && type!.is_system && <CatalystTag text="system" color="grey" />}
        <Button appearance="subtle" spacing="compact" onClick={onClose}>✕</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Name</div>
          <Textfield
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            isDisabled={!isCreate && type!.is_system}
            placeholder="e.g. Risk"
          />
        </div>

        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Icon</div>
          <Select usePortal options={ICON_OPTIONS} value={icon} onChange={setIcon} placeholder="Pick icon…" ariaLabel="Icon" />
        </div>

        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Kind</div>
          {isCreate ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <Checkbox label="Main" isChecked={kind === 'standard'} onChange={() => setKind('standard')} />
              <Checkbox label="Subtask" isChecked={kind === 'subtask'} onChange={() => setKind('subtask')} />
            </div>
          ) : (
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{type!.kind}</span>
          )}
        </div>

        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Group</div>
          <Select usePortal options={GROUP_OPTIONS} value={group} onChange={setGroup} ariaLabel="Group" />
        </div>

        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Hierarchy level</div>
          <Select usePortal usePortal
            options={levelOptions}
            value={levelId ?? currentLevel}
            onChange={setLevelId}
            placeholder="No level"
            ariaLabel="Hierarchy level"
          />
        </div>

        <Button
          appearance="primary"
          isDisabled={saving || !name.trim()}
          onClick={() =>
            onSave({
              ...(type ? { id: type.id } : { type_key: statusKeyFromLabel(name) }),
              display_name: name.trim(),
              icon: icon?.value ?? 'task',
              kind,
              group_key: (group?.value as string) ?? 'standard',
              hierarchy_level_id: (levelId ?? currentLevel)?.value ?? null,
            })
          }
        >
          {saving ? 'Saving…' : isCreate ? 'Create' : 'Save changes'}
        </Button>

        {!isCreate && (
          <>
            <div>
              <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
                Allowed parents
              </div>
              {/* CRE compliance (C1): system types' hierarchy is governed by the
                  locked RULE_TABLE.md — these rows mirror Grid B and are
                  read-only here. Only custom types are editable. */}
              {type!.is_system && (
                <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', margin: '0 0 4px' }}>
                  Governed by the Catalyst Rules Engine (RULE_TABLE.md Grid B) — read-only mirror.
                </p>
              )}
              <Checkbox
                label="May be root (no parent)"
                isChecked={effectiveParents.has(null)}
                isDisabled={type!.is_system}
                onChange={() => toggleParent(null)}
              />
              {parentCandidates.map((p) => (
                <Checkbox
                  key={p.id}
                  label={p.display_name}
                  isChecked={effectiveParents.has(p.id)}
                  isDisabled={type!.is_system}
                  onChange={() => toggleParent(p.id)}
                />
              ))}
              {draftParents && !type!.is_system && (
                <Button
                  spacing="compact"
                  appearance="primary"
                  isDisabled={saving}
                  onClick={() => {
                    onSaveRules(type!.id, [...draftParents]);
                    setDraftParents(null);
                  }}
                >
                  Save parent rules
                </Button>
              )}
            </div>

            {!type!.is_system && (
              <Button appearance="danger" spacing="compact" onClick={() => onArchive(type!.id)}>
                Archive type
              </Button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
