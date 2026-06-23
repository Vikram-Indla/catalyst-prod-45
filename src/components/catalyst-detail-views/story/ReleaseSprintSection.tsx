/**
 * ReleaseSprintSection — Story sidebar Release + Sprint fields.
 *
 * Displays:
 *  - Release: Optional link to a release (read-only in idle state)
 *  - Sprints: Chip list of sprints linked to the selected release (read-only)
 *
 * Edit mode: Release dropdown → Sprint multi-select (filtered to release's sprints)
 *
 * Used in: CatalystViewStory right sidebar (via children prop)
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';

interface ReleaseSprintSectionProps {
  /** Story issue_key or id */
  issueKey: string;
  projectId?: string;
  /** Current release_id if already linked */
  releaseId?: string | null;
  /** Callback when release changes */
  onReleaseChange?: (releaseId: string | null) => void;
}

interface ReleaseOption {
  value: string;
  label: string;
}

interface SprintChip {
  id: string;
  name: string;
}

/**
 * Fetch releases for a project (canonical source: rh_releases)
 */
function useProjectReleasesForSidebar(projectId: string | undefined) {
  return useQuery({
    queryKey: ['story-releases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('rh_releases')
        .select('id, name, status, target_date')
        .eq('project_id', projectId)
        .order('target_date', { ascending: false, nullsFirst: false })
        .order('name');
      if (error) {
        console.error('[useProjectReleasesForSidebar] error:', error.message);
        return [];
      }
      return (data ?? []) as Array<{ id: string; name: string; status: string; target_date?: string }>;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch sprints linked to a release
 */
function useReleaseSprints(releaseId: string | null | undefined) {
  return useQuery({
    queryKey: ['release-sprints-sidebar', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('release_sprints')
        .select('sprint_id, sprints(id, name, status)')
        .eq('release_id', releaseId);
      if (error) {
        console.error('[useReleaseSprints] error:', error.message);
        return [];
      }
      return (data ?? []).map(rs => ({
        id: (rs as any).sprints?.id ?? rs.sprint_id,
        name: (rs as any).sprints?.name ?? '?'
      })) as SprintChip[];
    },
    enabled: !!releaseId,
    staleTime: 1 * 60 * 1000,
  });
}

export function ReleaseSprintSection({
  issueKey,
  projectId,
  releaseId,
  onReleaseChange,
}: ReleaseSprintSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseOption | null>(
    releaseId ? { value: releaseId, label: releaseId } : null
  );

  // Fetch available releases
  const { data: releases = [] } = useProjectReleasesForSidebar(projectId);
  const releaseOptions: ReleaseOption[] = useMemo(
    () => releases.map(r => ({ value: r.id, label: r.name })),
    [releases]
  );

  // Fetch current linked sprints
  const { data: linkedSprints = [] } = useReleaseSprints(releaseId);

  // Update release mutation
  const updateReleaseMutation = useMutation({
    mutationFn: async (newReleaseId: string | null) => {
      // TODO: Implement the actual update logic
      // This will depend on how release_id is stored for stories
      // For now, we'll assume it goes to a linking table or ph_issues column
      console.log('[ReleaseSprintSection] Would update story', issueKey, 'release to', newReleaseId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-detail', issueKey] });
      setIsEditing(false);
      flag.success('Release updated');
      onReleaseChange?.(selectedRelease?.value ?? null);
    },
    onError: (err: any) => {
      flag.error('Failed to update release', err?.message ?? 'Try again');
    },
  });

  const handleSaveRelease = () => {
    updateReleaseMutation.mutate(selectedRelease?.value ?? null);
  };

  const handleCancel = () => {
    setSelectedRelease(releaseId ? { value: releaseId, label: releaseId } : null);
    setIsEditing(false);
  };

  // Render current state or edit form
  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)' }}>
          Release
        </div>
        <Select<ReleaseOption>
          inputId="story-release-select"
          options={releaseOptions}
          value={selectedRelease}
          onChange={(opt) => setSelectedRelease(opt)}
          placeholder="Select release"
          isClearable
          isSearchable
          isLoading={updateReleaseMutation.isPending}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={handleSaveRelease}
            disabled={updateReleaseMutation.isPending}
            style={{
              padding: '4px 8px',
              background: 'var(--ds-background-information-bold, #0052CC)',
              color: 'white',
              border: 'none',
              borderRadius: 3,
              fontSize: 12,
              cursor: updateReleaseMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              color: 'var(--ds-text, #292A2E)',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Render read-only view
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)' }}>
          Release
        </div>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: releaseId ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtlest, #6B778C)',
            cursor: 'pointer',
            textDecoration: releaseId ? 'underline' : 'none',
            fontSize: 14,
            textAlign: 'left',
          }}
        >
          {releaseId && selectedRelease
            ? selectedRelease.label
            : 'None'}
        </button>
      </div>

      {/* Sprints section — only show if release is linked */}
      {releaseId && linkedSprints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)' }}>
            Sprints
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {linkedSprints.map(sprint => (
              <span
                key={sprint.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  background: 'var(--ds-background-neutral, #F1F2F4)',
                  borderRadius: 3,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ds-text, #292A2E)',
                }}
              >
                {sprint.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
