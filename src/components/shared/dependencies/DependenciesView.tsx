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
import HealthPanel from '@/features/health/components/HealthPanel';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
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
  // Dependencies Health panel — CAT-HEALTH-ENGINE-20260702-001 Phase 5.
  const [healthOpen, setHealthOpen] = useState(false);
  const { dependencies, issueMeta, hierarchy, projects, isLoading, error, refetch } = data;
  const isEmpty = !dependencies || dependencies.length === 0;

  const handleAddSuccess = () => {
    setIsModalOpen(false);
    refetch();
    catalystToast.success('Dependency added');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: T.surface }}>
      <ProjectPageHeader
        projectKey={scopeKey}
        hubType={hubType}
        actions={
          <button
            type="button"
            aria-label="View dependencies health"
            title="View dependencies health"
            onClick={() => setHealthOpen((o) => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 3,
              background: healthOpen ? 'var(--ds-background-selected)' : 'transparent',
              cursor: 'pointer', transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => { if (!healthOpen) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered)'; }}
            onMouseLeave={(e) => { if (!healthOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <CatyPulseIcon size={16} title="View dependencies health" />
          </button>
        }
      />

      {/* Explicit responsive height: the hub shell does not bound height:100%
          to the viewport, so a flex:1 canvas collapses. 150px ≈ top nav + header. */}
      <div style={{ height: 'calc(100dvh - 150px)', minHeight: 420, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
        {/* Dependencies Health panel — CAT-HEALTH-ENGINE-20260702-001 Phase 5. */}
        {healthOpen && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 440,
            borderLeft: '1px solid var(--ds-border)',
            background: 'var(--ds-surface)',
            zIndex: 2,
          }}>
            <HealthPanel
              scope={{ moduleKey: 'dependencies', projectKey: scopeKey }}
              dependencies={dependencies}
              issueMeta={issueMeta}
              title={scopeName ?? scopeKey}
              subtitle="dependencies"
              onOpenItem={(item) => {
                if (!item.itemKey) return;
                setHealthOpen(false);
                window.location.href = getTimelineHref(item.itemKey);
              }}
              onClose={() => setHealthOpen(false)}
            />
          </div>
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
