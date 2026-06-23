/**
 * SprintLinker — Multi-select component for linking sprints to a release.
 *
 * Displays current linked sprints as removable chips, with an "Add sprint" button
 * opening a dropdown to link additional sprints from the project's active pool.
 *
 * Used in: ReleaseCreateModal, ReleaseEditModal (after description field)
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import { Box, Inline, Stack, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import PlusIcon from '@atlaskit/icon/glyph/plus';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';

interface SprintLinkerProps {
  releaseId: string | null | undefined;
  projectKey?: string;
  onSprintsChange?: (sprintIds: string[]) => void;
}

interface SprintOption {
  value: string;
  label: string;
}

const chipsContainerStyles = xcss({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'space.100',
  alignItems: 'center',
  marginTop: 'space.100',
});

const chipStyles = xcss({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'space.075',
  padding: 'space.050 space.150',
  backgroundColor: 'color.background.neutral',
  borderRadius: 'border.radius.100',
  fontSize: '12px',
  fontWeight: 500,
});

const addButtonStyles = xcss({
  marginTop: 'space.100',
});

export function SprintLinker({ releaseId, projectKey, onSprintsChange }: SprintLinkerProps) {
  const queryClient = useQueryClient();
  const [selectedSprint, setSelectedSprint] = useState<SprintOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch linked sprints for this release
  const { data: linkedSprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['release-sprints', releaseId],
    queryFn: async () => {
      if (!releaseId) return [];
      const { data, error } = await supabase
        .from('release_sprints')
        .select('sprint_id, sprints(id, name)')
        .eq('release_id', releaseId);
      if (error) return [];
      return (data ?? []).map(rs => ({ id: rs.sprint_id, name: (rs as any).sprints?.name ?? '?' }));
    },
    enabled: !!releaseId,
  });

  // Fetch available sprints for the project
  const { data: availableSprints = [], isLoading: sprintsAvailableLoading } = useQuery({
    queryKey: ['project-sprints', projectKey],
    queryFn: async () => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from('sprints')
        .select('id, name, project_key, status')
        .eq('project_key', projectKey)
        .eq('status', 'active')
        .order('name');
      if (error) return [];
      return (data ?? []).map(s => ({ id: s.id, name: s.name }));
    },
    enabled: !!projectKey,
  });

  // Link sprint mutation
  const linkSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      if (!releaseId) throw new Error('Release ID missing');
      const { error } = await supabase
        .from('release_sprints')
        .insert({ release_id: releaseId, sprint_id: sprintId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-sprints', releaseId] });
      setSelectedSprint(null);
      setShowDropdown(false);
      flag.success('Sprint linked');
    },
    onError: (err: any) => {
      flag.error('Failed to link sprint', err?.message ?? 'Try again');
    },
  });

  // Unlink sprint mutation
  const unlinkSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      if (!releaseId) throw new Error('Release ID missing');
      const { error } = await supabase
        .from('release_sprints')
        .delete()
        .eq('release_id', releaseId)
        .eq('sprint_id', sprintId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-sprints', releaseId] });
      flag.success('Sprint removed');
    },
    onError: (err: any) => {
      flag.error('Failed to unlink sprint', err?.message ?? 'Try again');
    },
  });

  // Sprint options: exclude already-linked sprints
  const linkedSprintIds = new Set(linkedSprints.map(s => s.id));
  const sprintOptions: SprintOption[] = useMemo(
    () => availableSprints
      .filter(s => !linkedSprintIds.has(s.id))
      .map(s => ({ value: s.id, label: s.name })),
    [availableSprints, linkedSprintIds],
  );

  const handleAddSprint = async () => {
    if (!selectedSprint) return;
    linkSprintMutation.mutate(selectedSprint.value);
  };

  const handleRemoveSprint = (sprintId: string) => {
    unlinkSprintMutation.mutate(sprintId);
  };

  if (!releaseId) {
    return (
      <Box xcss={{ color: 'color.text.subtlest', fontSize: '12px' }}>
        Select a release first
      </Box>
    );
  }

  return (
    <Stack space="space.100">
      {sprintsLoading ? (
        <Spinner size="small" />
      ) : linkedSprints.length > 0 ? (
        <Box xcss={chipsContainerStyles}>
          {linkedSprints.map((sprint) => (
            <Box
              key={sprint.id}
              xcss={chipStyles}
              role="status"
              aria-label={`Sprint: ${sprint.name}`}
            >
              <span>{sprint.name}</span>
              <button
                onClick={() => handleRemoveSprint(sprint.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: token('color.text.subtlest'),
                }}
                aria-label={`Remove ${sprint.name}`}
              >
                <CrossIcon label="" size="small" />
              </button>
            </Box>
          ))}
        </Box>
      ) : (
        <Box xcss={{ color: 'color.text.subtlest', fontSize: '12px' }}>
          No sprints linked
        </Box>
      )}

      {/* Add Sprint button + dropdown */}
      <Box xcss={addButtonStyles}>
        <Button
          appearance="primary"
          spacing="compact"
          icon={(iconProps) => <PlusIcon {...iconProps} label="" />}
          onClick={() => setShowDropdown(!showDropdown)}
          isDisabled={sprintOptions.length === 0 || linkSprintMutation.isPending}
          isLoading={sprintsAvailableLoading}
        >
          Add sprint
        </Button>
      </Box>

      {showDropdown && sprintOptions.length > 0 && (
        <Box
          xcss={{
            display: 'flex',
            gap: 'space.100',
            alignItems: 'flex-end',
          }}
        >
          <Box xcss={{ flex: '1' }}>
            <Select<SprintOption>
              inputId="add-sprint"
              options={sprintOptions}
              value={selectedSprint}
              onChange={(opt) => setSelectedSprint(opt)}
              placeholder="Select sprint to add"
              isSearchable
              autoFocus
            />
          </Box>
          <Button
            appearance="primary"
            spacing="compact"
            onClick={handleAddSprint}
            isDisabled={!selectedSprint || linkSprintMutation.isPending}
            isLoading={linkSprintMutation.isPending}
          >
            Link
          </Button>
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={() => {
              setShowDropdown(false);
              setSelectedSprint(null);
            }}
          >
            Cancel
          </Button>
        </Box>
      )}

      {sprintOptions.length === 0 && linkedSprints.length > 0 && (
        <Box xcss={{ color: 'color.text.subtlest', fontSize: '12px' }}>
          All available sprints are linked
        </Box>
      )}
    </Stack>
  );
}
