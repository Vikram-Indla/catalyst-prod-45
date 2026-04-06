/**
 * ═══════════════════════════════════════════════════════════════════
 * useNotificationSchemes — React Query hooks for scheme management
 * ═══════════════════════════════════════════════════════════════════
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  schemeService,
  schemeRuleService,
  projectSchemeService,
  schemeExportService,
  type SchemeExport,
} from '@/services/notificationTriggerService';
import type {
  NotificationScheme,
  NotificationSchemeRule,
  CreateSchemeInput,
  UpdateSchemeInput,
  CreateSchemeRuleInput,
  UpdateSchemeRuleInput,
  ProjectNotificationScheme,
} from '@/types/notification-triggers';

// ── Query Keys ──────────────────────────────────────────────────
const KEYS = {
  all: ['notification-schemes'] as const,
  schemes: ['notification-schemes', 'list'] as const,
  scheme: (id: string) => ['notification-schemes', id] as const,
  rules: (schemeId: string) => ['notification-schemes', 'rules', schemeId] as const,
  projectAssignments: ['notification-schemes', 'projects'] as const,
  projectScheme: (pid: string) => ['notification-schemes', 'project', pid] as const,
};

// ═══════════════════════════════════════════════════════════════════
// SCHEMES — List, Get, Create, Update, Delete, Clone
// ═══════════════════════════════════════════════════════════════════

export function useSchemes() {
  return useQuery({
    queryKey: KEYS.schemes,
    queryFn: schemeService.getAll,
    staleTime: 60_000,
  });
}

export function useScheme(id: string | null) {
  return useQuery({
    queryKey: KEYS.scheme(id ?? ''),
    queryFn: () => schemeService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchemeInput) => schemeService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.schemes });
    },
  });
}

export function useUpdateScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSchemeInput }) => schemeService.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.schemes });
      qc.invalidateQueries({ queryKey: KEYS.scheme(id) });
    },
  });
}

export function useDeleteScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schemeService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.schemes });
    },
  });
}

export function useCloneScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, newName }: { sourceId: string; newName: string }) =>
      schemeService.clone(sourceId, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.schemes });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// SCHEME RULES — CRUD for individual trigger rules within a scheme
// ═══════════════════════════════════════════════════════════════════

export function useSchemeRules(schemeId: string | null) {
  return useQuery({
    queryKey: KEYS.rules(schemeId ?? ''),
    queryFn: () => schemeRuleService.getByScheme(schemeId!),
    enabled: !!schemeId,
    staleTime: 30_000,
  });
}

export function useCreateSchemeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchemeRuleInput) => schemeRuleService.create(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.rules(data.scheme_id) });
    },
  });
}

export function useUpdateSchemeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, schemeId, input }: { id: string; schemeId: string; input: UpdateSchemeRuleInput }) =>
      schemeRuleService.update(id, input),
    onSuccess: (_, { schemeId }) => {
      qc.invalidateQueries({ queryKey: KEYS.rules(schemeId) });
    },
  });
}

export function useDeleteSchemeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, schemeId }: { id: string; schemeId: string }) => schemeRuleService.delete(id),
    onSuccess: (_, { schemeId }) => {
      qc.invalidateQueries({ queryKey: KEYS.rules(schemeId) });
    },
  });
}

export function useToggleSchemeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, schemeId, enabled }: { id: string; schemeId: string; enabled: boolean }) =>
      schemeRuleService.toggleEnabled(id, enabled),
    onSuccess: (_, { schemeId }) => {
      qc.invalidateQueries({ queryKey: KEYS.rules(schemeId) });
    },
  });
}

export function useUpsertSchemeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchemeRuleInput) => schemeRuleService.upsert(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.rules(data.scheme_id) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT-SCHEME ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════

export function useProjectSchemeAssignments() {
  return useQuery({
    queryKey: KEYS.projectAssignments,
    queryFn: projectSchemeService.getAll,
    staleTime: 60_000,
  });
}

export function useProjectScheme(projectId: string | null) {
  return useQuery({
    queryKey: KEYS.projectScheme(projectId ?? ''),
    queryFn: () => projectSchemeService.getByProject(projectId!),
    enabled: !!projectId,
  });
}

export function useAssignSchemeToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, schemeId }: { projectId: string; schemeId: string }) =>
      projectSchemeService.assign(projectId, schemeId),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: KEYS.projectAssignments });
      qc.invalidateQueries({ queryKey: KEYS.projectScheme(projectId) });
    },
  });
}

export function useUnassignSchemeFromProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectSchemeService.unassign(projectId),
    onSuccess: (_, projectId) => {
      qc.invalidateQueries({ queryKey: KEYS.projectAssignments });
      qc.invalidateQueries({ queryKey: KEYS.projectScheme(projectId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════════

export function useExportScheme() {
  return useMutation({
    mutationFn: (schemeId: string) => schemeExportService.exportScheme(schemeId),
    onSuccess: (data: SchemeExport) => {
      // Trigger browser download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-scheme-${data.scheme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SchemeExport) => schemeExportService.importScheme(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.schemes });
    },
  });
}
