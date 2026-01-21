// ════════════════════════════════════════════════════════════════════════════
// USE SPACE MUTATIONS HOOK - All write operations
// ════════════════════════════════════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SpacesService,
  SpaceMembersService,
  SpaceComponentsService,
  SpaceVersionsService,
  SpaceFeaturesService,
  SpacePermissionsService,
} from '@/services/spaces';
import { spaceKeys } from './useSpaces';
import { memberKeys } from './useSpaceMembers';
import { componentKeys } from './useSpaceComponents';
import { versionKeys } from './useSpaceVersions';
import { featureKeys } from './useSpaceFeatures';
import { permissionKeys } from './useSpacePermissions';
import type {
  CreateSpaceInput,
  UpdateSpaceInput,
  AddMemberInput,
  UpdateMemberInput,
  CreateComponentInput,
  UpdateComponentInput,
  CreateVersionInput,
  UpdateVersionInput,
  UpdateFeaturesInput,
  UpdatePermissionInput,
  PermissionKey,
} from '@/types/spaces';

// ─────────────────────────────────────────────────────────────────────────────
// SPACE MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSpaceInput) => SpacesService.createSpace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.recent() });
    },
  });
}

export function useUpdateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSpaceInput }) =>
      SpacesService.updateSpace(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.starred() });
    },
  });
}

export function useArchiveSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SpacesService.archiveSpace(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.starred() });
    },
  });
}

export function useRestoreFromArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SpacesService.restoreFromArchive(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(data.id) });
    },
  });
}

export function useMoveToTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SpacesService.moveToTrash(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.starred() });
    },
  });
}

export function useRestoreFromTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SpacesService.restoreFromTrash(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(data.id) });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SpacesService.deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.starred() });
    },
  });
}

export function useToggleSpaceStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      isCurrentlyStarred,
    }: {
      spaceId: string;
      isCurrentlyStarred: boolean;
    }) => SpacesService.toggleStar(spaceId, isCurrentlyStarred),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(spaceId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.starred() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ spaceId, input }: { spaceId: string; input: AddMemberInput }) =>
      SpaceMembersService.addMember(spaceId, input),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(spaceId) });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      userId,
      input,
    }: {
      spaceId: string;
      userId: string;
      input: UpdateMemberInput;
    }) => SpaceMembersService.updateMember(spaceId, userId, input),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(spaceId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ spaceId, userId }: { spaceId: string; userId: string }) =>
      SpaceMembersService.removeMember(spaceId, userId),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(spaceId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      input,
    }: {
      spaceId: string;
      input: CreateComponentInput;
    }) => SpaceComponentsService.createComponent(spaceId, input),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.list(spaceId) });
    },
  });
}

export function useUpdateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      spaceId,
      input,
    }: {
      id: string;
      spaceId: string;
      input: UpdateComponentInput;
    }) => SpaceComponentsService.updateComponent(id, input),
    onSuccess: (data, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.list(spaceId) });
      queryClient.invalidateQueries({ queryKey: componentKeys.detail(data.id) });
    },
  });
}

export function useDeleteComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, spaceId }: { id: string; spaceId: string }) =>
      SpaceComponentsService.deleteComponent(id),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.list(spaceId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      input,
    }: {
      spaceId: string;
      input: CreateVersionInput;
    }) => SpaceVersionsService.createVersion(spaceId, input),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
    },
  });
}

export function useUpdateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      spaceId,
      input,
    }: {
      id: string;
      spaceId: string;
      input: UpdateVersionInput;
    }) => SpaceVersionsService.updateVersion(id, input),
    onSuccess: (data, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(data.id) });
    },
  });
}

export function useReleaseVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, spaceId }: { id: string; spaceId: string }) =>
      SpaceVersionsService.releaseVersion(id),
    onSuccess: (data, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(data.id) });
    },
  });
}

export function useArchiveVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, spaceId }: { id: string; spaceId: string }) =>
      SpaceVersionsService.archiveVersion(id),
    onSuccess: (data, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(data.id) });
    },
  });
}

export function useUnarchiveVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, spaceId }: { id: string; spaceId: string }) =>
      SpaceVersionsService.unarchiveVersion(id),
    onSuccess: (data, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(data.id) });
    },
  });
}

export function useDeleteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, spaceId }: { id: string; spaceId: string }) =>
      SpaceVersionsService.deleteVersion(id),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
    },
  });
}

export function useReorderVersions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      versionIds,
    }: {
      spaceId: string;
      versionIds: string[];
    }) => SpaceVersionsService.reorderVersions(spaceId, versionIds),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all(spaceId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      input,
    }: {
      spaceId: string;
      input: UpdateFeaturesInput;
    }) => SpaceFeaturesService.updateFeatures(spaceId, input),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: featureKeys.detail(spaceId) });
    },
  });
}

export function useToggleFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      feature,
      enabled,
    }: {
      spaceId: string;
      feature: keyof UpdateFeaturesInput;
      enabled: boolean;
    }) => SpaceFeaturesService.toggleFeature(spaceId, feature, enabled),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: featureKeys.detail(spaceId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      permissionKey,
      input,
    }: {
      spaceId: string;
      permissionKey: PermissionKey;
      input: UpdatePermissionInput;
    }) => SpacePermissionsService.updatePermission(spaceId, permissionKey, input),
    onSuccess: (_, { spaceId }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.list(spaceId) });
    },
  });
}

export function useResetPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spaceId: string) => SpacePermissionsService.resetToDefaults(spaceId),
    onSuccess: (_, spaceId) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.list(spaceId) });
    },
  });
}
