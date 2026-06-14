import React, { useState, useCallback, useEffect } from 'react';
import Tabs from '@atlaskit/tabs';
import { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import { AutoDismissFlag, FlagGroup } from '@atlaskit/flag';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import SearchIcon from '@atlaskit/icon/glyph/search';
import GridIcon from '@atlaskit/icon/glyph/table';
import ListIcon from '@atlaskit/icon/glyph/list';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { StatusRegistryTable } from '@/components/admin/StatusRegistryTable';
import { StatusRegistryCards } from '@/components/admin/StatusRegistryCards';
import { EditStatusModal } from '@/components/admin/EditStatusModal';
import { WorkflowTypePanel } from '@/components/admin/WorkflowTypePanel';
import {
  useWorkflowStatuses,
  useCreateStatus,
  useUpdateStatus,
  useArchiveStatus,
  type WorkflowStatusWithTypes,
} from '@/hooks/useWorkflowStatuses';
import { useAllStatusConsumers } from '@/hooks/useStatusConsumers';
import {
  WORK_ITEM_TYPES,
  type WorkItemType,
} from '@/hooks/useTypeWorkflow';
import type { StatusCategory } from '@/constants/statusCategoryColors';
import { useDefaultProject } from '@/hooks/useProjects';

type ViewMode = 'table' | 'cards';

interface Flag {
  id: number;
  type: 'success' | 'error';
  title: string;
  description?: string;
}

const RESPONSIVE_BREAKPOINT = 1024;

function useViewport() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function WorkflowAdminPage() {
  const { data: defaultProject } = useDefaultProject();
  const projectKey = defaultProject?.key ?? 'BAU';

  const { data: statuses = [], isLoading: statusesLoading } = useWorkflowStatuses(projectKey);
  const statusIds = statuses.map((s) => s.id);
  const { data: consumersMap = {} } = useAllStatusConsumers(statusIds);

  const createStatus = useCreateStatus(projectKey);
  const updateStatus = useUpdateStatus(projectKey);
  const archiveStatus = useArchiveStatus(projectKey);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeTypeIndex, setActiveTypeIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowStatusWithTypes | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<WorkflowStatusWithTypes | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [flagCounter, setFlagCounter] = useState(0);

  const viewport = useViewport();
  const forcedCards = viewport < RESPONSIVE_BREAKPOINT;
  const effectiveViewMode: ViewMode = forcedCards ? 'cards' : viewMode;

  function addFlag(type: Flag['type'], title: string, description?: string) {
    const id = flagCounter + 1;
    setFlagCounter(id);
    setFlags((prev) => [...prev, { id, type, title, description }]);
  }

  function handleOpenCreate() {
    setEditTarget(null);
    setEditModalOpen(true);
  }

  function handleOpenEdit(status: WorkflowStatusWithTypes) {
    setEditTarget(status);
    setEditModalOpen(true);
  }

  function handleDeleteRequest(status: WorkflowStatusWithTypes) {
    const consumers = consumersMap[status.id] ?? [];
    if (consumers.length > 0) return; // button is disabled, shouldn't reach here
    setDeleteConfirmTarget(status);
  }

  function handleConfirmDelete() {
    if (!deleteConfirmTarget) return;
    archiveStatus.mutate(deleteConfirmTarget.id, {
      onSuccess: () => {
        addFlag('success', `Status "${deleteConfirmTarget.name}" deleted.`);
        setDeleteConfirmTarget(null);
      },
      onError: (err: unknown) => {
        addFlag('error', 'Failed to delete status.', (err as Error)?.message);
        setDeleteConfirmTarget(null);
      },
    });
  }

  function handleSave(data: {
    name: string;
    category: StatusCategory;
    color: string;
    position: number;
    isDefault: boolean;
    typeAssignments: string[];
  }) {
    if (editTarget) {
      updateStatus.mutate(
        {
          id: editTarget.id,
          name: data.name,
          category: data.category,
          color: data.color,
          position: data.position,
          is_default: data.isDefault,
          typeAssignments: data.typeAssignments,
        },
        {
          onSuccess: () => {
            addFlag('success', 'Status updated.');
            setEditModalOpen(false);
          },
          onError: (err: unknown) => {
            const msg = (err as Error)?.message ?? '';
            addFlag(
              'error',
              msg.includes('uq_status_name') ? `"${data.name}" already exists.` : 'Failed to save status.',
              msg
            );
          },
        }
      );
    } else {
      createStatus.mutate(
        {
          name: data.name,
          category: data.category,
          color: data.color,
          position: data.position,
          typeAssignments: data.typeAssignments,
        },
        {
          onSuccess: () => {
            addFlag('success', `Status "${data.name}" created.`);
            setEditModalOpen(false);
          },
          onError: (err: unknown) => {
            const msg = (err as Error)?.message ?? '';
            addFlag(
              'error',
              msg.includes('uq_status_name') ? `"${data.name}" already exists.` : 'Failed to create status.',
              msg
            );
          },
        }
      );
    }
  }

  const isSaving = createStatus.isPending || updateStatus.isPending;

  return (
    <AdminGuard>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--ds-surface, #FFFFFF)',
          color: 'var(--ds-text, #172B4D)',
          fontFamily: "var(--ds-font-family-body, 'Atlassian Sans', sans-serif)",
        }}
      >
        {/* Page header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 653,
              color: 'var(--ds-text, #172B4D)',
              margin: 0,
              lineHeight: '28px',
            }}
          >
            Workflows
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--ds-text-subtle, #42526E)',
              margin: '4px 0 0',
              maxWidth: 600,
            }}
          >
            One status registry, one workflow per work item type. Statuses are defined once below; each work item type selects which statuses it uses and which transitions are allowed. Changes sync to all components in real time.
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Section A — Status registry */}
          <section style={{ marginBottom: 40 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 653,
                    color: 'var(--ds-text, #292A2E)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  Status registry{' '}
                  {statuses.length > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ds-text-subtle, #505258)' }}>
                      ({statuses.length} status{statuses.length !== 1 ? 'es' : ''} · shared by all work item types)
                    </span>
                  )}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #505258)', margin: '4px 0 0', maxWidth: 680 }}>
                  Statuses are project-scoped and defined once. The "Available for" column controls which work item types can use each status — edit it from the status's Work item types tab.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Search */}
                <div style={{ width: 220 }}>
                  <Textfield
                    name="status-search"
                    placeholder="Search statuses…"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                    elemBeforeInput={
                      <span style={{ paddingLeft: 8, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                        <SearchIcon label="" size="small" />
                      </span>
                    }
                  />
                </div>
                {/* View toggle — hidden on mobile */}
                {!forcedCards && (
                  <div
                    style={{
                      display: 'flex',
                      border: '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <Button
                      appearance={viewMode === 'table' ? 'primary' : 'subtle'}
                      iconBefore={ListIcon}
                      aria-label="Table view"
                      onClick={() => setViewMode('table')}
                    />
                    <Button
                      appearance={viewMode === 'cards' ? 'primary' : 'subtle'}
                      iconBefore={GridIcon}
                      aria-label="Card view"
                      onClick={() => setViewMode('cards')}
                    />
                  </div>
                )}
                <Button appearance="primary" onClick={handleOpenCreate}>
                  Create status
                </Button>
              </div>
            </div>

            {statusesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Spinner size="large" />
              </div>
            ) : effectiveViewMode === 'table' ? (
              <StatusRegistryTable
                statuses={statuses}
                consumersMap={consumersMap}
                searchQuery={searchQuery}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRequest}
              />
            ) : (
              <StatusRegistryCards
                statuses={statuses}
                consumersMap={consumersMap}
                searchQuery={searchQuery}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRequest}
              />
            )}
          </section>

          {/* Section B — Per-type workflows */}
          <section>
            <div style={{ marginBottom: 12 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 653,
                  color: 'var(--ds-text, #172B4D)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                Workflows{' '}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ds-text-subtle, #42526E)' }}>
                  (per work item type)
                </span>
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, #505258)', margin: '4px 0 0' }}>
                Each work item type has its own workflow: a subset of registry statuses, one initial status, and its own transition rules. Global rules apply to every type and are managed once.
              </p>
            </div>

            <div
              style={{
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                overflow: 'clip',
              }}
            >
              <Tabs
                id="workflow-type-tabs"
                selected={activeTypeIndex}
                onChange={setActiveTypeIndex}
              >
                <TabList>
                  {WORK_ITEM_TYPES.map((type) => (
                    <Tab key={type}>{type}</Tab>
                  ))}
                </TabList>

                {WORK_ITEM_TYPES.map((type, idx) => (
                  <TabPanel key={type}>
                    {activeTypeIndex === idx && (
                      <WorkflowTypePanel
                        projectKey={projectKey}
                        workItemType={type as WorkItemType}
                        allRegistryStatuses={statuses}
                        onFeedback={(type, title, description) => addFlag(type, title, description)}
                      />
                    )}
                  </TabPanel>
                ))}
              </Tabs>
            </div>
          </section>
        </div>

        {/* Edit / Create modal */}
        <EditStatusModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          status={editTarget}
          allStatuses={statuses}
          consumers={editTarget ? (consumersMap[editTarget.id] ?? []) : []}
          onSave={handleSave}
          onDelete={editTarget ? () => { setEditModalOpen(false); setDeleteConfirmTarget(editTarget); } : undefined}
          isSaving={isSaving}
        />

        {/* Delete confirm */}
        {deleteConfirmTarget && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--ds-blanket, rgba(9,30,66,0.54))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500,
            }}
            onClick={() => setDeleteConfirmTarget(null)}
          >
            <div
              style={{
                background: 'var(--ds-surface, #FFFFFF)',
                borderRadius: 8,
                padding: 24,
                maxWidth: 420,
                width: '90%',
                boxShadow: 'var(--ds-shadow-overlay, 0 4px 24px rgba(9,30,66,0.25))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 653, color: 'var(--ds-text-danger, #AE2A19)' }}>
                Delete status?
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
                Delete <strong>{deleteConfirmTarget.name}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button appearance="subtle" onClick={() => setDeleteConfirmTarget(null)}>Cancel</Button>
                <Button
                  appearance="danger"
                  isLoading={archiveStatus.isPending}
                  onClick={handleConfirmDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        <FlagGroup onDismissed={(id) => setFlags((prev) => prev.filter((f) => f.id !== Number(id)))}>
          {flags.map((flag) => (
            <AutoDismissFlag
              key={flag.id}
              id={flag.id}
              title={flag.title}
              description={flag.description}
              icon={
                flag.type === 'success'
                  ? <SuccessIcon label="Success" primaryColor="var(--ds-icon-success, #22A06B)" />
                  : <ErrorIcon label="Error" primaryColor="var(--ds-icon-danger, #AE2A19)" />
              }
            />
          ))}
        </FlagGroup>
      </div>
    </AdminGuard>
  );
}
