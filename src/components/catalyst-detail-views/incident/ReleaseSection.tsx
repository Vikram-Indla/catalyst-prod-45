/**
 * ReleaseSection — Production Incident sidebar Release field.
 *
 * Displays:
 *  - Release: Optional link to a release version (read-only in idle state)
 *  - Sprints: Chip list of sprints linked to the selected release (read-only)
 *
 * Edit mode: Release dropdown only
 *
 * Used in: CatalystViewIncident right sidebar (via children prop)
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import { supabase } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';

interface ReleaseSectionProps {
  /** Incident id (UUID) */
  incidentId: string;
  projectId?: string;
  /** Current release_version_id if already linked */
  releaseVersionId?: string | null;
  /** Callback when release changes */
  onReleaseChange?: (releaseVersionId: string | null) => void;
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
 * Fetch release versions for a project
 */
function useProjectReleaseVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['incident-releases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('release_versions')
        .select('id, name, version, status, release_date')
        .order('release_date', { ascending: false, nullsFirst: false })
        .order('name');
      if (error) {
        console.error('[useProjectReleaseVersions] error:', error.message);
        return [];
      }
      return (data ?? []) as Array<{ id: string; name: string; version: string; status: string; release_date?: string }>;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch sprints linked to a release version (via its parent release)
 */
function useReleaseVersionSprints(releaseVersionId: string | null | undefined) {
  return useQuery({
    queryKey: ['incident-release-sprints', releaseVersionId],
    queryFn: async () => {
      if (!releaseVersionId) return [];

      // First get the release from the version
      const { data: versionData } = await supabase
        .from('release_versions')
        .select('release_id:id')
        .eq('id', releaseVersionId)
        .single();

      if (!versionData?.release_id) return [];

      // Then get sprints linked to that release
      const { data, error } = await supabase
        .from('rh_release_sprints')
        .select('sprint_id, sprints(id, name, status)')
        .eq('release_id', versionData.release_id);

      if (error) {
        console.error('[useReleaseVersionSprints] error:', error.message);
        return [];
      }
      return (data ?? []).map(rs => ({
        id: (rs as any).sprints?.id ?? rs.sprint_id,
        name: (rs as any).sprints?.name ?? '?'
      })) as SprintChip[];
    },
    enabled: !!releaseVersionId,
    staleTime: 1 * 60 * 1000,
  });
}

export function ReleaseSection({
  incidentId,
  projectId,
  releaseVersionId,
  onReleaseChange,
}: ReleaseSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch available release versions
  const { data: releaseVersions = [] } = useProjectReleaseVersions(projectId);
  const releaseOptions: ReleaseOption[] = useMemo(
    () => releaseVersions.map(r => ({ value: r.id, label: `${r.name} (${r.version})` })),
    [releaseVersions]
  );

  // Initialize selectedRelease with proper label from releases list
  const [selectedRelease, setSelectedRelease] = useState<ReleaseOption | null>(() => {
    if (!releaseVersionId) return null;
    const release = releaseVersions.find(r => r.id === releaseVersionId);
    return release ? { value: release.id, label: `${release.name} (${release.version})` } : null;
  });

  // Fetch current linked sprints
  const { data: linkedSprints = [] } = useReleaseVersionSprints(releaseVersionId);

  // Update release mutation (direct column update on incidents)
  const updateReleaseMutation = useMutation({
    mutationFn: async (newReleaseVersionId: string | null) => {
      const { error } = await supabase
        .from('incidents')
        .update({ release_version_id: newReleaseVersionId ?? null })
        .eq('id', incidentId);
      if (error) throw error;
      return newReleaseVersionId;
    },
    onSuccess: (newReleaseVersionId) => {
      queryClient.invalidateQueries({ queryKey: ['incident-detail', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-release-sprints'] });
      setIsEditing(false);
      flag.success('Release updated');
      onReleaseChange?.(newReleaseVersionId ?? null);
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
    if (releaseVersionId) {
      const current = releaseVersions.find(r => r.id === releaseVersionId);
      setSelectedRelease(current ? { value: current.id, label: `${current.name} (${current.version})` } : null);
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
          inputId="incident-release-select"
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
            color: releaseVersionId ? 'var(--ds-text)' : 'var(--ds-text-subtlest)',
            cursor: 'pointer',
            textDecoration: releaseVersionId ? 'underline' : 'none',
            fontSize: 'var(--ds-font-size-400)',
            textAlign: 'left',
          }}
        >
          {releaseVersionId && selectedRelease
            ? selectedRelease.label
            : 'None'}
        </button>
      </div>

      {/* Sprints section — only show if release is linked (read-only) */}
      {releaseVersionId && linkedSprints.length > 0 && (
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
