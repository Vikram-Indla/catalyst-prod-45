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
  /** Story issue_key (UUID) */
  issueKey: string;
  projectId?: string;
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
 * Fetch current release for a story (via linking table)
 */
function useStoryCurrentRelease(storyId: string) {
  return useQuery({
    queryKey: ['story-current-release', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_story_links')
        .select('release_id')
        .eq('story_id', storyId)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('[useStoryCurrentRelease] error:', error.message);
        return null;
      }
      return (data?.release_id as string) ?? null;
    },
    staleTime: 1 * 60 * 1000,
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

export function ReleaseSprintSection({
  issueKey,
  projectId,
  onReleaseChange,
}: ReleaseSprintSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current release from linking table
  const { data: currentReleaseId } = useStoryCurrentRelease(issueKey);

  // Fetch available releases
  const { data: releases = [] } = useProjectReleasesForSidebar(projectId);
  const releaseOptions: ReleaseOption[] = useMemo(
    () => releases.map(r => ({ value: r.id, label: r.name })),
    [releases]
  );

  // Initialize selectedRelease with proper label from releases list
  const [selectedRelease, setSelectedRelease] = useState<ReleaseOption | null>(() => {
    if (!currentReleaseId) return null;
    const release = releases.find(r => r.id === currentReleaseId);
    return release ? { value: release.id, label: release.name } : null;
  });

  // Fetch current linked sprints
  const { data: linkedSprints = [] } = useReleaseSprints(currentReleaseId);

  // Update release mutation (uses linking table pattern)
  const updateReleaseMutation = useMutation({
    mutationFn: async (newReleaseId: string | null) => {
      // Stories use release_story_links table
      // 1. If removing release: DELETE from release_story_links
      // 2. If setting release: DELETE old, INSERT new

      if (newReleaseId === null || newReleaseId === '') {
        // Delete any existing link
        const { error: deleteError } = await supabase
          .from('release_story_links')
          .delete()
          .eq('story_id', issueKey);
        if (deleteError) throw deleteError;
      } else {
        // Delete old link
        await supabase
          .from('release_story_links')
          .delete()
          .eq('story_id', issueKey);

        // Insert new link
        const { error: insertError } = await supabase
          .from('release_story_links')
          .insert([{
            release_id: newReleaseId,
            story_id: issueKey,
          }]);
        if (insertError) throw insertError;
      }

      return newReleaseId;
    },
    onSuccess: (newReleaseId) => {
      queryClient.invalidateQueries({ queryKey: ['story-detail', issueKey] });
      queryClient.invalidateQueries({ queryKey: ['release-sprints-sidebar'] });
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
    if (currentReleaseId) {
      const current = releases.find(r => r.id === currentReleaseId);
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
        <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle, #505258)' }}>
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
              color: 'var(--ds-text, #292A2E)',
              border: '1px solid var(--ds-border, #DFE1E6)',
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
        <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle, #505258)' }}>
          Release
        </div>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: currentReleaseId ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtlest, #6B778C)',
            cursor: 'pointer',
            textDecoration: currentReleaseId ? 'underline' : 'none',
            fontSize: 'var(--ds-font-size-400)',
            textAlign: 'left',
          }}
        >
          {currentReleaseId && selectedRelease
            ? selectedRelease.label
            : 'None'}
        </button>
      </div>

      {/* Sprints section — only show if release is linked */}
      {currentReleaseId && linkedSprints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
          <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle, #505258)' }}>
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
                  fontSize: 'var(--ds-font-size-200)',
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
