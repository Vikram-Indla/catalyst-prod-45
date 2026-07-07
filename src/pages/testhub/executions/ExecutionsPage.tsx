/**
 * ExecutionsPage — /testhub/executions
 *
 * CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 slice E3: Test Executions are lab
 * containers (D-002 split) explicitly tied to sprint / release / project /
 * product / business request / custom scope. Cycles are dated attempts inside
 * an execution. Canonical JiraTable list + create modal with scope picker.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import SectionMessage from '@atlaskit/section-message';
import EmptyState from '@atlaskit/empty-state';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { supabase } from '@/integrations/supabase/client';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable, makeSummaryCell } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { Routes } from '@/lib/routes';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { Select } from '@/components/ads';
import {
  useTestExecutions,
  useCreateTestExecution,
  useDeleteTestExecution,
  type TmTestExecution,
  type ExecutionScopeType,
} from '@/hooks/test-management/useTestExecutions';
import { useSprintsByProject } from '@/hooks/test-management/useSprintsByProject';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { MoreHorizontal } from '@/lib/atlaskit-icons';
import { catalystToast } from '@/lib/catalystToast';

const SCOPE_LABEL: Record<ExecutionScopeType, string> = {
  sprint: 'Sprint',
  release: 'Release',
  project: 'Project',
  product: 'Product',
  business_request: 'Business request',
  custom: 'Custom',
};

const STATUS_APPEARANCE: Record<string, 'default' | 'inprogress' | 'success' | 'removed'> = {
  draft: 'default',
  active: 'inprogress',
  completed: 'success',
  archived: 'removed',
};

function useReleaseOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['ph-release-options'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}

export default function ExecutionsPage() {
  const { projectId, project } = useTestHubProject();
  const navigate = useNavigate();
  const { data: executions = [], isPending, isError, error, refetch } = useTestExecutions(projectId);
  const createExecution = useCreateTestExecution();
  const deleteExecution = useDeleteTestExecution();
  const [deleting, setDeleting] = useState<TmTestExecution | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState<ExecutionScopeType>('project');
  const [sprintId, setSprintId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  const { data: sprints = [] } = useSprintsByProject(scopeType === 'sprint' ? projectId : undefined);
  const { data: releases = [] } = useReleaseOptions(createOpen && scopeType === 'release');

  const columns: Column<TmTestExecution>[] = useMemo(() => [
    {
      id: 'key', label: 'Key', width: 10, alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>{row.execution_key}</span>
      ),
    },
    { id: 'name', label: 'Name', flex: true, alwaysVisible: true, cell: makeSummaryCell((r: TmTestExecution) => r.name) },
    {
      id: 'scope', label: 'Scope', width: 14,
      cell: ({ row }) => (
        <Lozenge appearance="default">{SCOPE_LABEL[row.lab_scope_type] ?? row.lab_scope_type}</Lozenge>
      ),
    },
    {
      id: 'status', label: 'Status', width: 10,
      cell: ({ row }) => (
        <Lozenge appearance={STATUS_APPEARANCE[row.status] ?? 'default'}>{row.status}</Lozenge>
      ),
    },
    {
      id: 'created', label: 'Created', width: 12,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          {new Date(row.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      id: 'actions', label: '', width: 5, alwaysVisible: true,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={({ triggerRef, isSelected: _isSelected, testId: _testId, ...props }) => (
              <button
                ref={triggerRef as React.Ref<HTMLButtonElement>}
                {...props}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ds-text-subtlest)' }}
                title="Execution actions"
              >
                <MoreHorizontal size={14} />
              </button>
            )}
            placement="bottom-end"
          >
            <DropdownItemGroup>
              <DropdownItem onClick={() => setDeleting(row)}>Delete</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </span>
      ),
    },
  ], []);

  const canCreate =
    name.trim().length > 0 &&
    (scopeType !== 'sprint' || !!sprintId) &&
    (scopeType !== 'release' || !!releaseId);

  const submit = () => {
    if (!projectId || !canCreate) return;
    createExecution.mutate(
      {
        project_id: projectId,
        name: name.trim(),
        lab_scope_type: scopeType,
        sprint_id: scopeType === 'sprint' ? sprintId : null,
        release_id: scopeType === 'release' ? releaseId : null,
        custom_scope_label: scopeType === 'custom' ? customLabel.trim() || null : null,
      },
      {
        onSuccess: (created) => {
          setCreateOpen(false);
          setName('');
          navigate(Routes.testHub.execution(created.execution_key));
        },
      },
    );
  };

  return (
    <>
      <ProjectPageHeader projectKey={project?.key ?? 'TESTHUB'} hubType="test" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          padding: 'var(--ds-space-200) var(--ds-space-300)', borderBottom: '1px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--ds-surface)',
        }}>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text)' }}>Test executions</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
              Lab containers tied to sprint, release, project, product or custom scope — cycles run inside them.
            </div>
          </div>
          <Button appearance="primary" onClick={() => setCreateOpen(true)}>Create execution</Button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--ds-space-050) var(--ds-space-150) var(--ds-space-300)' }}>
          {isError ? (
            <div style={{ padding: 'var(--ds-space-300)' }}>
              <SectionMessage appearance="error" title="Couldn't load executions">
                <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
                <Button appearance="subtle" onClick={() => refetch()}>Try again</Button>
              </SectionMessage>
            </div>
          ) : isPending ? (
            <div style={{ padding: 'var(--ds-space-400)', display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>
          ) : executions.length === 0 ? (
            <EmptyState
              header="No executions yet"
              description="Create a lab for a sprint, release or custom effort, then add dated cycles inside it."
              primaryAction={<Button appearance="primary" onClick={() => setCreateOpen(true)}>Create execution</Button>}
            />
          ) : (
            <JiraTable<TmTestExecution>
              columns={columns}
              data={executions}
              getRowId={(r) => r.id}
              onRowClick={(row) => navigate(Routes.testHub.execution(row.execution_key))}
              showRowCount
              totalRowCount={executions.length}
            />
          )}
        </div>
      </div>

      {deleting && (
        <ModalDialog onClose={() => setDeleting(null)} width="small">
          <ModalHeader><ModalTitle appearance="danger">Delete execution?</ModalTitle></ModalHeader>
          <ModalBody>
            <p style={{ margin: 0, color: 'var(--ds-text)' }}>
              <strong>{deleting.name}</strong> will be deleted. Executions that contain cycles
              cannot be deleted — their cycles carry run evidence.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              appearance="danger"
              isLoading={deleteExecution.isPending}
              onClick={() => {
                if (!projectId) return;
                deleteExecution.mutate(
                  { id: deleting.id, projectId },
                  {
                    onSuccess: () => { catalystToast.success('Execution deleted'); setDeleting(null); },
                    onError: (e: Error) => catalystToast.error('Cannot delete execution', e.message),
                  },
                );
              }}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}

      {createOpen && (
        <ModalDialog onClose={() => setCreateOpen(false)} width="medium">
          <ModalHeader><ModalTitle>Create test execution</ModalTitle></ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Textfield
                autoFocus
                placeholder="Execution name"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
              />
              <div>
                <label style={{ display: 'block', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginBottom: 4 }}>
                  Scope
                </label>
                <Select
                  options={Object.entries(SCOPE_LABEL).map(([value, label]) => ({ value, label }))}
                  value={Object.entries(SCOPE_LABEL).map(([value, label]) => ({ value, label })).find(o => o.value === scopeType) ?? null}
                  onChange={opt => opt && setScopeType(opt.value as ExecutionScopeType)}
                />
              </div>
              {scopeType === 'sprint' && (
                <Select
                  options={sprints.map((s) => ({ value: s.id, label: s.name }))}
                  value={sprints.map((s) => ({ value: s.id, label: s.name })).find(o => o.value === sprintId) ?? null}
                  onChange={opt => setSprintId(opt?.value ?? '')}
                  placeholder="Select sprint…"
                  isSearchable
                />
              )}
              {scopeType === 'release' && (
                <Select
                  options={releases.map((r) => ({ value: r.id, label: r.name }))}
                  value={releases.map((r) => ({ value: r.id, label: r.name })).find(o => o.value === releaseId) ?? null}
                  onChange={opt => setReleaseId(opt?.value ?? '')}
                  placeholder="Select release…"
                  isSearchable
                />
              )}
              {scopeType === 'custom' && (
                <Textfield
                  placeholder="Custom scope label (e.g. Hotfix bundle 12)"
                  value={customLabel}
                  onChange={(e) => setCustomLabel((e.target as HTMLInputElement).value)}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button appearance="primary" isDisabled={!canCreate} isLoading={createExecution.isPending} onClick={submit}>
              Create
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </>
  );
}
