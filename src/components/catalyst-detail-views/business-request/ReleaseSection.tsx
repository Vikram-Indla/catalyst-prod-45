/**
 * ReleaseSection — Business Request sidebar Release field.
 *
 * Displays:
 *  - Release: Optional link to a release (read-only in idle state)
 *  - Sprints: Chip list of sprints linked to the selected release (read-only)
 *
 * Edit mode: Release dropdown only
 *
 * Used in: CatalystViewBusinessRequest right sidebar (via children prop)
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';

interface ReleaseSectionProps {
  /** Business request id (UUID) */
  brId: string;
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
function useProjectReleases(projectId: string | undefined) {
  return useQuery({
    queryKey: ['br-releases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('rh_releases')
        .select('id, name, status, target_date')
        .eq('project_id', projectId)
        .order('target_date', { ascending: false, nullsFirst: false })
        .order('name');
      if (error) {
        console.error('[useProjectReleases] error:', error.message);
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
    queryKey: ['br-release-sprints', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('rh_release_sprints')
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

export function ReleaseSection({
  brId,
  projectId,
  releaseId,
  onReleaseChange,
}: ReleaseSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch available releases
  const { data: releases = [] } = useProjectReleases(projectId);
  const releaseOptions: ReleaseOption[] = useMemo(
    () => releases.map(r => ({ value: r.id, label: r.name })),
    [releases]
  );

  // Initialize selectedRelease with proper label from releases list
  const [selectedRelease, setSelectedRelease] = useState<ReleaseOption | null>(() => {
    if (!releaseId) return null;
    const release = releases.find(r => r.id === releaseId);
    return release ? { value: release.id, label: release.name } : null;
  });

  // Fetch current linked sprints
  const { data: linkedSprints = [] } = useReleaseSprints(releaseId);

  // Update release mutation (direct column update on business_requests)
  const updateReleaseMutation = useMutation({
    mutationFn: async (newReleaseId: string | null) => {
      const { error } = await supabase
        .from('business_requests')
        .update({ release_id: newReleaseId ?? null })
        .eq('id', brId);
      if (error) throw error;
      return newReleaseId;
    },
    onSuccess: (newReleaseId) => {
      queryClient.invalidateQueries({ queryKey: ['br-detail', brId] });
      queryClient.invalidateQueries({ queryKey: ['br-release-sprints'] });
      setIsEditing(false);
      flag.success('Release updated');
      onReleaseChange?.(newReleaseId ?? null);
    },
    onError: (err: any) => {
      flag.error('Failed to update release', err?.message ?? 'Try again');
    },
  });

  const handleSaveRelease = () => {
    updateReleaseMutation.mutate(selectedRelease?.value ?? null);
  };

  const handleCancel = () => {
    // Reset to current value from releases list
    if (releaseId) {
      const current = releases.find(r => r.id === releaseId);
      setSelectedRelease(current ? { value: current.id, label: current.name } : null);
    } else {
      setSelectedRelease(null);
    }
    setIsEditing(false);
  };

  // Render current state or edit form
  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
        <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
          Release
        </div>
        <Select<ReleaseOption>
          inputId="br-release-select"
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
              background: 'var(--ds-background-information-bold)',
              color: 'white',
              border: 'none',
              borderRadius: 3,
              fontSize: 'var(--ds-font-size-200)',
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
              color: 'var(--ds-text)',
              border: '1px solid var(--ds-border)',
              borderRadius: 3,
              fontSize: 'var(--ds-font-size-200)',
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
        <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
          Release
        </div>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: releaseId ? 'var(--ds-text)' : 'var(--ds-text-subtlest)',
            cursor: 'pointer',
            textDecoration: releaseId ? 'underline' : 'none',
            fontSize: 'var(--ds-font-size-400)',
            textAlign: 'left',
          }}
        >
          {releaseId && selectedRelease
            ? selectedRelease.label
            : 'None'}
        </button>
      </div>

      {/* Sprints section — only show if release is linked (read-only) */}
      {releaseId && linkedSprints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
          <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
            Linked Sprints
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {linkedSprints.map(sprint => (
              <span
                key={sprint.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  background: 'var(--ds-background-neutral)',
                  borderRadius: 3,
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: 'var(--ds-text)',
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
