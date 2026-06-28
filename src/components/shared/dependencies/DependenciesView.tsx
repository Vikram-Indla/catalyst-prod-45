/**
 * Canonical Dependencies surface — shared across project / product / incident
 * hubs (Vikram 2026-06-25). The UI (header + canvas + add/delete) is identical;
 * each hub supplies its data + write callbacks via props. No per-hub forks.
 *
 * Mount pattern (per hub page):
 *   const data = useXDependencyData(scope);
 *   <DependenciesView hubType=… scopeKey=… data={data} fetchCandidates=… onCreate=… onDelete=… getTimelineHref=… />
 */

import React, { useState } from 'react';
import Spinner from '@atlaskit/spinner';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { catalystToast } from '@/lib/catalystToast';
import DependenciesEmptyState from './DependenciesEmptyState';
import DependenciesDiagram from './DependenciesDiagram';
import AddDependencyModal from './AddDependencyModal';
import type { DependencyData, DependencyCandidate, DependencyType, HubType } from './types';

const T = { surface: 'var(--ds-surface)' };

interface DependenciesViewProps {
  hubType: HubType;
  /** Scope key — project key / product code / 'incidents'. */
  scopeKey: string;
  /** Display name for the grouped-frame chip (falls back to scopeKey). */
  scopeName?: string | null;
  scopeColor?: string | null;
  data: DependencyData;
  fetchCandidates: () => Promise<DependencyCandidate[]>;
  onCreate: (source: DependencyCandidate, target: DependencyCandidate, type: DependencyType) => Promise<void>;
  onDelete: (id: number | string) => Promise<void>;
  getTimelineHref: (key: string) => string;
  /** ?focus= deep-link to centre + highlight a work item on mount. */
  focusKey?: string | null;
}

export default function DependenciesView({
  hubType,
  scopeKey,
  scopeName,
  scopeColor,
  data,
  fetchCandidates,
  onCreate,
  onDelete,
  getTimelineHref,
  focusKey,
}: DependenciesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { dependencies, issueMeta, hierarchy, projects, isLoading, error, refetch } = data;
  const isEmpty = !dependencies || dependencies.length === 0;

  const handleAddSuccess = () => {
    setIsModalOpen(false);
    refetch();
    catalystToast.success('Dependency added');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: T.surface }}>
      {/* Jira parity: no page H1 — breadcrumb only; toolbar sits tight up top. */}
      <ProjectPageHeader title="Dependencies" projectKey={scopeKey} hubType={hubType} hideTitle />

      {/* Explicit responsive height: the hub shell does not bound height:100%
          to the viewport, so a flex:1 canvas collapses. 150px ≈ top nav + header. */}
      <div style={{ height: 'calc(100dvh - 150px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div style={{ padding: 32, color: 'var(--ds-text-danger)' }}>
            Error loading dependencies: {(error as any)?.message ?? String(error)}
          </div>
        ) : isEmpty ? (
          <DependenciesEmptyState projectKey={scopeKey} onAddClick={() => setIsModalOpen(true)} />
        ) : (
          <DependenciesDiagram
            projectKey={scopeKey}
            projectName={scopeName ?? scopeKey}
            projectColor={scopeColor ?? null}
            dependencies={dependencies}
            issueMeta={issueMeta}
            hierarchy={hierarchy}
            projects={projects}
            focusKey={focusKey}
            onAddClick={() => setIsModalOpen(true)}
            onChanged={refetch}
            onDeleteDependency={onDelete}
            getTimelineHref={getTimelineHref}
          />
        )}
      </div>

      <AddDependencyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
        scopeKey={scopeKey}
        fetchCandidates={fetchCandidates}
        onCreate={onCreate}
      />
    </div>
  );
}
