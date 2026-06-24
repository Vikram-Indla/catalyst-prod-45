/**
 * Project Dependencies — Diagram visualization of work item dependencies
 *
 * Route: /project-hub/:key/dependencies
 * Features:
 *   - Empty state with CTA button
 *   - React Flow diagram showing blocks/is_blocked_by relationships
 *   - Modal form to add dependencies
 *   - Project scope: only members can view/edit
 *
 * Phase 7 (UI build) + Phase 8 (DB wiring)
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { Button } from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import { catalystToast } from '@/lib/catalystToast';
import DependenciesEmptyState from '@/components/project-hub/dependencies/DependenciesEmptyState';
import DependenciesDiagram from '@/components/project-hub/dependencies/DependenciesDiagram';
import AddDependencyModal from '@/components/project-hub/dependencies/AddDependencyModal';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  text: 'var(--ds-text, #292A2E)',
  subtle: 'var(--ds-text-subtle, #505258)',
  border: 'var(--ds-border, #DFE1E6)',
};

type Dependency = {
  id: number;
  project_key: string;
  source_issue_key: string;
  target_issue_key: string;
  dependency_type: 'blocks' | 'is_blocked_by';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export default function DependenciesPage() {
  const { key } = useParams<{ key: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: dependencies, isLoading, error, refetch } = useQuery({
    queryKey: ['dependencies', key],
    queryFn: async () => {
      if (!key) throw new Error('Project key required');

      const { data, error: supabaseError } = await (supabase as any)
        .from('ph_issue_dependencies')
        .select('*')
        .eq('project_key', key)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('[Dependencies] load failed', supabaseError);
        throw new Error(supabaseError.message || supabaseError.code || 'Unknown error');
      }
      return (data || []) as Dependency[];
    },
    enabled: !!key,
  });

  const handleAddSuccess = () => {
    setIsModalOpen(false);
    refetch();
    catalystToast.success('Dependency added');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', color: 'var(--ds-text-danger, #AE2A19)' }}>
        Error loading dependencies: {(error as any)?.message ?? String(error)}
      </div>
    );
  }

  const isEmpty = !dependencies || dependencies.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.surface }}>
      {/* Header */}
      <ProjectPageHeader title="Dependencies" projectKey={key || ''} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {isEmpty ? (
          <DependenciesEmptyState projectKey={key || ''} onAddClick={() => setIsModalOpen(true)} />
        ) : (
          <DependenciesDiagram
            projectKey={key || ''}
            dependencies={dependencies}
            onAddClick={() => setIsModalOpen(true)}
            onDelete={refetch}
          />
        )}
      </div>

      {/* Modal */}
      <AddDependencyModal
        projectKey={key || ''}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
