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
 * Fetch the sprints for a story.
 *
 * L006 (CAT-TESTHUB-REBUILD-20260704-001 Phase C): the previous
 * implementation read `rh_release_sprints → sprints`, both of which are
 * dead (0 rows) — the sidebar always rendered nothing. The live source of
 * a story's sprint is `ph_issues.sprint_release`, a JSONB array of sprint
 * NAMES (same field the project module's sprint/iteration column reads).
 * We resolve those names against `ph_jira_sprints` (name-join, the canonical
 * sprint entity per the locked decision — `iterations` is an empty SAFe
 * model and is never wired here) purely to surface a stable id + status.
 * Zero-assumption: when the story carries no sprint, we render nothing.
 */
function useStorySprints(storyId: string) {
  return useQuery({
    queryKey: ['story-sprints-sidebar', storyId],
    queryFn: async (): Promise<SprintChip[]> => {
      if (!storyId) return [];

      const { data: issue, error } = await supabase
        .from('ph_issues')
        .select('sprint_release')
        .eq('id', storyId)
        .maybeSingle();
      if (error) {
        console.error('[useStorySprints] issue error:', error.message);
        return [];
      }

      const raw = issue?.sprint_release;
      if (!Array.isArray(raw)) return [];
      const names = (raw as { name?: string }[])
        .map((e) => e?.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (names.length === 0) return [];

      // Enrich with canonical ph_jira_sprints (name-join) for a stable id.
      // If a name has no matching sprint row, still render the name.
      const { data: sprintRows, error: sprintErr } = await supabase
        .from('ph_jira_sprints')
        .select('id, name')
        .in('name', names);
      if (sprintErr) {
        console.error('[useStorySprints] sprints error:', sprintErr.message);
      }
      const idByName = new Map(
        ((sprintRows ?? []) as { id: string; name: string }[]).map((s) => [s.name, s.id]),
      );

      return names.map((name) => ({ id: idByName.get(name) ?? name, name }));
    },
    enabled: !!storyId,
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

  // Fetch the story's own sprints (L006: from ph_issues.sprint_release, not
  // the dead release→sprint link).
  const { data: storySprints = [] } = useStorySprints(issueKey);

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
        <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
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
            color: currentReleaseId ? 'var(--ds-text)' : 'var(--ds-text-subtlest)',
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

      {/* Sprints section — the story's own sprints (L006). Zero-assumption:
          nothing renders when the story carries no sprint. */}
      {storySprints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px' }}>
          <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>
            Sprints
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {storySprints.map(sprint => (
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
