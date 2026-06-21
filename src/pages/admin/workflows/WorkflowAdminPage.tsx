import React, { useState, useEffect } from 'react';
import Tabs from '@atlaskit/tabs';
import { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import { AutoDismissFlag, FlagGroup } from '@atlaskit/flag';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import ErrorIcon from '@atlaskit/icon/glyph/error';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ListIcon from '@atlaskit/icon/glyph/list';
import GridIcon from '@atlaskit/icon/glyph/table';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { StatusRegistryTable } from '@/components/admin/StatusRegistryTable';
import { StatusRegistryCards } from '@/components/admin/StatusRegistryCards';
import { EditStatusModal } from '@/components/admin/EditStatusModal';
import { WorkflowTypePanel } from '@/components/admin/WorkflowTypePanel';
import { TaskStatusRegistry } from '@/components/admin/TaskStatusRegistry';
import {
  useWorkflowStatuses,
  useCreateStatus,
  useUpdateStatus,
  useArchiveStatus,
  type WorkflowStatusWithTypes,
} from '@/hooks/useWorkflowStatuses';
import { useAllStatusConsumers } from '@/hooks/useStatusConsumers';
import { WORK_ITEM_TYPES, type WorkItemType } from '@/hooks/useTypeWorkflow';
import type { StatusCategory } from '@/constants/statusCategoryColors';
import { usePhProjects } from '@/hooks/useProjects';
import {
  useSeedProjectFromDefaults,
  useResetProjectWorkflow,
  useExportProjectAsDefault,
} from '@/hooks/useWorkflowDefaults';

// ── Module type routing ──────────────────────────────────────────────────────

type ModuleKey = 'project' | 'product' | 'incident';

const MODULE_TYPES: Record<ModuleKey, WorkItemType[]> = {
  project: WORK_ITEM_TYPES.filter(
    (t): t is WorkItemType =>
      !['Business Request', 'BRD Task', 'Production Incident'].includes(t)
  ),
  product: ['Business Request', 'BRD Task'],
  incident: ['Production Incident'],
};

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'cards';

interface FlagItem {
  id: number;
  type: 'success' | 'error';
  title: string;
  description?: string;
}

const RESPONSIVE_BREAKPOINT = 1024;

function useViewport() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return width;
}

// ── Inner: status registry + type tabs for a given module ────────────────────

interface WorkflowContentProps {
  projectKey: string;
  moduleTypes: WorkItemType[];
  statuses: WorkflowStatusWithTypes[];
  statusesLoading: boolean;
  consumersMap: Record<string, string[]>;
  searchQuery: string;
  viewMode: ViewMode;
  forcedCards: boolean;
  setSearchQuery: (q: string) => void;
  setViewMode: (v: ViewMode) => void;
  onOpenCreate: () => void;
  onOpenEdit: (s: WorkflowStatusWithTypes) => void;
  onDeleteRequest: (s: WorkflowStatusWithTypes) => void;
  onFeedback: (type: 'success' | 'error', title: string, desc?: string) => void;
  activeTypeIndex: number;
  setActiveTypeIndex: (i: number) => void;
}

function WorkflowContent({
  projectKey,
  moduleTypes,
  statuses,
  statusesLoading,
  consumersMap,
  searchQuery,
  viewMode,
  forcedCards,
  setSearchQuery,
  setViewMode,
  onOpenCreate,
  onOpenEdit,
  onDeleteRequest,
  onFeedback,
  activeTypeIndex,
  setActiveTypeIndex,
}: WorkflowContentProps) {
  const effectiveViewMode: ViewMode = forcedCards ? 'cards' : viewMode;

  return (
    <>
      {/* Status registry */}
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
              Status registry
              {statuses.length > 0 && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--ds-text-subtle, #505258)',
                  }}
                >
                  ({statuses.length} status{statuses.length !== 1 ? 'es' : ''} · shared by all
                  work item types)
                </span>
              )}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--ds-text-subtle, #505258)',
                margin: '4px 0 0',
                maxWidth: 680,
              }}
            >
              Statuses are project-scoped and defined once. Each work item type selects which
              statuses it uses and which transitions are allowed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 220 }}>
              <Textfield
                name="status-search"
                placeholder="Search statuses…"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                elemBeforeInput={
                  <span
                    style={{ paddingLeft: 8, color: 'var(--ds-text-subtlest, #6B778C)' }}
                  >
                    <SearchIcon label="" size="small" />
                  </span>
                }
              />
            </div>
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
            <Button appearance="primary" onClick={onOpenCreate}>
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
            onEdit={onOpenEdit}
            onDelete={onDeleteRequest}
          />
        ) : (
          <StatusRegistryCards
            statuses={statuses}
            consumersMap={consumersMap}
            searchQuery={searchQuery}
            onEdit={onOpenEdit}
            onDelete={onDeleteRequest}
          />
        )}
      </section>

      {/* Per-type workflow tabs */}
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
            Workflows
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: 'var(--ds-text-subtle, #42526E)',
              }}
            >
              (per work item type)
            </span>
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--ds-text-subtle, #505258)',
              margin: '4px 0 0',
            }}
          >
            Each work item type has its own workflow: a subset of registry statuses, one initial
            status, and its own transition rules.
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
            id={`workflow-type-tabs-${projectKey}`}
            selected={activeTypeIndex}
            onChange={setActiveTypeIndex}
          >
            <TabList>
              {moduleTypes.map((type) => (
                <Tab key={type}>{type}</Tab>
              ))}
            </TabList>

            {moduleTypes.map((type, idx) => (
              <TabPanel key={type}>
                {activeTypeIndex === idx && (
                  <WorkflowTypePanel
                    projectKey={projectKey}
                    workItemType={type}
                    allRegistryStatuses={statuses}
                    onFeedback={(t, title, desc) => onFeedback(t, title, desc)}
                  />
                )}
              </TabPanel>
            ))}
          </Tabs>
        </div>
      </section>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function WorkflowAdminPage() {
  // Project selector
  const { data: phProjects = [], isLoading: projectsLoading } = usePhProjects();
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>('');

  useEffect(() => {
    if (phProjects.length > 0 && !selectedProjectKey) {
      const bau = phProjects.find((p) => p.key === 'BAU');
      setSelectedProjectKey(bau?.key ?? phProjects[0].key);
    }
  }, [phProjects, selectedProjectKey]);

  const projectKey = selectedProjectKey || 'BAU';

  const projectOptions = phProjects.map((p) => ({
    value: p.key,
    label: `${p.key} — ${p.name}`,
  }));
  const selectedProjectOption = projectOptions.find((o) => o.value === projectKey) ?? null;

  // Workflow data
  const { data: statuses = [], isLoading: statusesLoading } = useWorkflowStatuses(projectKey);
  const statusIds = statuses.map((s) => s.id);
  const { data: consumersMap = {} } = useAllStatusConsumers(statusIds);

  const createStatus = useCreateStatus(projectKey);
  const updateStatus = useUpdateStatus(projectKey);
  const archiveStatus = useArchiveStatus(projectKey);

  // Default mutations
  const seedMut = useSeedProjectFromDefaults(projectKey);
  const resetMut = useResetProjectWorkflow(projectKey);
  const exportMut = useExportProjectAsDefault(projectKey);

  // UI state
  const [moduleTabIndex, setModuleTabIndex] = useState(0);
  const [projectTypeIndex, setProjectTypeIndex] = useState(0);
  const [productTypeIndex, setProductTypeIndex] = useState(0);
  const [incidentTypeIndex, setIncidentTypeIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowStatusWithTypes | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<WorkflowStatusWithTypes | null>(
    null
  );
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [flagCounter, setFlagCounter] = useState(0);

  const viewport = useViewport();
  const forcedCards = viewport < RESPONSIVE_BREAKPOINT;

  function addFlag(type: FlagItem['type'], title: string, description?: string) {
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
    if (consumers.length > 0) return;
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
              msg.includes('uq_status_name')
                ? `"${data.name}" already exists.`
                : 'Failed to save status.',
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
              msg.includes('uq_status_name')
                ? `"${data.name}" already exists.`
                : 'Failed to create status.',
              msg
            );
          },
        }
      );
    }
  }

  function handleSeed() {
    seedMut.mutate(undefined, {
      onSuccess: () => addFlag('success', `Default workflow seeded for ${projectKey}.`),
      onError: (err: unknown) =>
        addFlag('error', 'Seed failed.', (err as Error)?.message),
    });
  }

  function handleConfirmReset() {
    setResetConfirmOpen(false);
    resetMut.mutate(undefined, {
      onSuccess: () => addFlag('success', `Workflow for ${projectKey} reset to defaults.`),
      onError: (err: unknown) =>
        addFlag('error', 'Reset failed.', (err as Error)?.message),
    });
  }

  function handleConfirmExport() {
    setExportConfirmOpen(false);
    exportMut.mutate(undefined, {
      onSuccess: () =>
        addFlag('success', `${projectKey} workflow exported as global default.`),
      onError: (err: unknown) =>
        addFlag('error', 'Export failed.', (err as Error)?.message),
    });
  }

  const isSaving = createStatus.isPending || updateStatus.isPending;
  const isWorkflowTab = moduleTabIndex < 3;

  const contentProps = {
    projectKey,
    statuses,
    statusesLoading,
    consumersMap,
    searchQuery,
    viewMode,
    forcedCards,
    setSearchQuery,
    setViewMode,
    onOpenCreate: handleOpenCreate,
    onOpenEdit: handleOpenEdit,
    onDeleteRequest: handleDeleteRequest,
    onFeedback: addFlag,
  };

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
            One status registry per project. Each work item type selects which statuses it uses
            and which transitions are allowed. Changes apply in real time.
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Project selector + action strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
              flexWrap: 'wrap',
              padding: '12px 16px',
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              borderRadius: 6,
              border: '1px solid var(--ds-border, #DFE1E6)',
            }}
          >
            <div style={{ width: 300 }}>
              <Select
                inputId="workflow-project-selector"
                options={projectOptions}
                value={selectedProjectOption}
                isLoading={projectsLoading}
                placeholder="Select project…"
                onChange={(opt: { value: string; label: string } | null) => {
                  if (opt) setSelectedProjectKey(opt.value);
                }}
              />
            </div>

            <div
              style={{
                width: 1,
                height: 24,
                background: 'var(--ds-border, #DFE1E6)',
                margin: '0 4px',
              }}
            />

            <Button
              appearance="subtle"
              isDisabled={!isWorkflowTab || seedMut.isPending}
              onClick={handleSeed}
            >
              {seedMut.isPending ? <Spinner size="small" /> : 'Seed from defaults'}
            </Button>

            <Button
              appearance="subtle"
              isDisabled={!isWorkflowTab || exportMut.isPending}
              onClick={() => setExportConfirmOpen(true)}
            >
              Set as global default
            </Button>

            <Button
              appearance="subtle"
              isDisabled={!isWorkflowTab || resetMut.isPending}
              onClick={() => setResetConfirmOpen(true)}
            >
              {resetMut.isPending ? <Spinner size="small" /> : 'Reset to defaults'}
            </Button>
          </div>

          {/* Module tabs */}
          <Tabs id="workflow-module-tabs" selected={moduleTabIndex} onChange={setModuleTabIndex}>
            <TabList>
              <Tab>Projects</Tab>
              <Tab>Product (BR)</Tab>
              <Tab>Incidents</Tab>
              <Tab>Tasks</Tab>
            </TabList>

            {/* Projects tab */}
            <TabPanel>
              {moduleTabIndex === 0 && (
                <div style={{ paddingTop: 24 }}>
                  <WorkflowContent
                    {...contentProps}
                    moduleTypes={MODULE_TYPES.project}
                    activeTypeIndex={projectTypeIndex}
                    setActiveTypeIndex={setProjectTypeIndex}
                  />
                </div>
              )}
            </TabPanel>

            {/* Product (BR) tab */}
            <TabPanel>
              {moduleTabIndex === 1 && (
                <div style={{ paddingTop: 24 }}>
                  <WorkflowContent
                    {...contentProps}
                    moduleTypes={MODULE_TYPES.product}
                    activeTypeIndex={productTypeIndex}
                    setActiveTypeIndex={setProductTypeIndex}
                  />
                </div>
              )}
            </TabPanel>

            {/* Incidents tab */}
            <TabPanel>
              {moduleTabIndex === 2 && (
                <div style={{ paddingTop: 24 }}>
                  <WorkflowContent
                    {...contentProps}
                    moduleTypes={MODULE_TYPES.incident}
                    activeTypeIndex={incidentTypeIndex}
                    setActiveTypeIndex={setIncidentTypeIndex}
                  />
                </div>
              )}
            </TabPanel>

            {/* Tasks tab — Catalyst-native task statuses */}
            <TabPanel>
              {moduleTabIndex === 3 && (
                <div style={{ paddingTop: 24 }}>
                  <TaskStatusRegistry />
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>

        {/* Edit / Create modal */}
        <EditStatusModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          status={editTarget}
          allStatuses={statuses}
          consumers={editTarget ? (consumersMap[editTarget.id] ?? []) : []}
          onSave={handleSave}
          onDelete={
            editTarget
              ? () => {
                  setEditModalOpen(false);
                  setDeleteConfirmTarget(editTarget);
                }
              : undefined
          }
          isSaving={isSaving}
        />

        {/* Delete status confirm */}
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
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 16,
                  fontWeight: 653,
                  color: 'var(--ds-text-danger, #AE2A19)',
                }}
              >
                Delete status?
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
                Delete <strong>{deleteConfirmTarget.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button appearance="subtle" onClick={() => setDeleteConfirmTarget(null)}>
                  Cancel
                </Button>
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

        {/* Reset to defaults confirm */}
        {resetConfirmOpen && (
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
            onClick={() => setResetConfirmOpen(false)}
          >
            <div
              style={{
                background: 'var(--ds-surface, #FFFFFF)',
                borderRadius: 8,
                padding: 24,
                maxWidth: 460,
                width: '90%',
                boxShadow: 'var(--ds-shadow-overlay, 0 4px 24px rgba(9,30,66,0.25))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 16,
                  fontWeight: 653,
                  color: 'var(--ds-text-warning, #974F0C)',
                }}
              >
                Reset to defaults?
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
                This clears all type-status assignments for <strong>{projectKey}</strong> and
                re-seeds from the global default template. Custom assignments will be lost.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button appearance="subtle" onClick={() => setResetConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  appearance="warning"
                  isLoading={resetMut.isPending}
                  onClick={handleConfirmReset}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Set as global default confirm */}
        {exportConfirmOpen && (
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
            onClick={() => setExportConfirmOpen(false)}
          >
            <div
              style={{
                background: 'var(--ds-surface, #FFFFFF)',
                borderRadius: 8,
                padding: 24,
                maxWidth: 460,
                width: '90%',
                boxShadow: 'var(--ds-shadow-overlay, 0 4px 24px rgba(9,30,66,0.25))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 16,
                  fontWeight: 653,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Set as global default?
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
                This overwrites the global default template with <strong>{projectKey}</strong>'s
                current workflow configuration. New projects will be seeded from this template.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button appearance="subtle" onClick={() => setExportConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  isLoading={exportMut.isPending}
                  onClick={handleConfirmExport}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Toast flags */}
        <FlagGroup
          onDismissed={(id) =>
            setFlags((prev) => prev.filter((f) => f.id !== Number(id)))
          }
        >
          {flags.map((flag) => (
            <AutoDismissFlag
              key={flag.id}
              id={flag.id}
              title={flag.title}
              description={flag.description}
              icon={
                flag.type === 'success' ? (
                  <SuccessIcon
                    label="Success"
                    primaryColor="var(--ds-icon-success, #22A06B)"
                  />
                ) : (
                  <ErrorIcon
                    label="Error"
                    primaryColor="var(--ds-icon-danger, #AE2A19)"
                  />
                )
              }
            />
          ))}
        </FlagGroup>
      </div>
    </AdminGuard>
  );
}
