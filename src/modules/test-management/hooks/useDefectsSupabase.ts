/**
 * Defects React Query Hooks - Supabase Direct
 * Full hooks implementation per spec
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '../stores/authStore';
import * as defectsService from '../services/defectsService';
import type {
  Defect,
  DefectFilters,
  DefectPaginationParams,
  CreateDefectInput,
  UpdateDefectInput,
  CreateDefectCommentInput,
  UpdateDefectCommentInput,
  CreateDefectLinkInput,
  BulkDefectUpdate,
} from '../types/defects';

// ══════════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ══════════════════════════════════════════════════════════════════════════════

export const defectQueryKeys = {
  all: ['defects'] as const,
  lists: () => [...defectQueryKeys.all, 'list'] as const,
  list: (filters: DefectFilters, pagination: DefectPaginationParams) => 
    [...defectQueryKeys.lists(), filters, pagination] as const,
  details: () => [...defectQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...defectQueryKeys.details(), id] as const,
  byKey: (key: string, projectId: string) => [...defectQueryKeys.all, 'key', key, projectId] as const,
  comments: (defectId: string) => [...defectQueryKeys.all, 'comments', defectId] as const,
  attachments: (defectId: string) => [...defectQueryKeys.all, 'attachments', defectId] as const,
  auditLog: (defectId: string) => [...defectQueryKeys.all, 'audit', defectId] as const,
  links: (defectId: string) => [...defectQueryKeys.all, 'links', defectId] as const,
  stats: (projectId: string) => [...defectQueryKeys.all, 'stats', projectId] as const,
  columnPrefs: (userId: string) => [...defectQueryKeys.all, 'columnPrefs', userId] as const,
};

// ══════════════════════════════════════════════════════════════════════════════
// DEFECT QUERIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch paginated defects with filters
 */
export function useDefectsList(
  filters: DefectFilters,
  pagination: DefectPaginationParams,
  enabled = true
) {
  return useQuery({
    queryKey: defectQueryKeys.list(filters, pagination),
    queryFn: () => defectsService.fetchDefects(filters, pagination),
    enabled,
    staleTime: 30000,
  });
}

/**
 * Fetch single defect by ID
 */
export function useDefectDetail(id: string | null) {
  return useQuery({
    queryKey: defectQueryKeys.detail(id || ''),
    queryFn: () => defectsService.fetchDefectById(id!),
    enabled: !!id,
  });
}

/**
 * Fetch defect by key (e.g., DEF-2024-0001)
 */
export function useDefectByKey(key: string | null, projectId: string) {
  return useQuery({
    queryKey: defectQueryKeys.byKey(key || '', projectId),
    queryFn: () => defectsService.fetchDefectByKey(key!, projectId),
    enabled: !!key && !!projectId,
  });
}

/**
 * Fetch defect statistics
 */
export function useDefectStats(projectId: string, enabled = true) {
  return useQuery({
    queryKey: defectQueryKeys.stats(projectId),
    queryFn: () => defectsService.fetchDefectStats(projectId),
    enabled: !!projectId && enabled,
    staleTime: 60000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFECT MUTATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new defect
 */
export function useCreateDefect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: CreateDefectInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      return defectsService.createDefect(input, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.stats(data.project_id || '') });
      toast({
        title: 'Defect created',
        description: `${data.defect_key} has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create defect',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a defect
 */
export function useUpdateDefect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: UpdateDefectInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      return defectsService.updateDefect(input, user.id);
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: defectQueryKeys.detail(newData.id) });
      const previousDefect = queryClient.getQueryData<Defect>(defectQueryKeys.detail(newData.id));

      if (previousDefect) {
        queryClient.setQueryData(defectQueryKeys.detail(newData.id), {
          ...previousDefect,
          ...newData,
        });
      }

      return { previousDefect };
    },
    onError: (error, newData, context) => {
      if (context?.previousDefect) {
        queryClient.setQueryData(defectQueryKeys.detail(newData.id), context.previousDefect);
      }
      toast({
        title: 'Failed to update defect',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (data, _, variables) => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.lists() });
      if (data?.project_id) {
        queryClient.invalidateQueries({ queryKey: defectQueryKeys.stats(data.project_id) });
      }
    },
  });
}

/**
 * Delete a defect
 */
export function useDeleteDefect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => defectsService.deleteDefect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.lists() });
      toast({ title: 'Defect deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete defect',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk update defects
 */
export function useBulkUpdateDefects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: BulkDefectUpdate) => {
      if (!user?.id) throw new Error('User not authenticated');
      return defectsService.bulkUpdateDefects(input, user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.lists() });
      toast({
        title: `${result.updated_count} defect(s) updated`,
        description: result.failed_ids.length > 0 
          ? `${result.failed_ids.length} failed` 
          : undefined,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update defects',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch comments for a defect
 */
export function useDefectComments(defectId: string | null) {
  return useQuery({
    queryKey: defectQueryKeys.comments(defectId || ''),
    queryFn: () => defectsService.fetchDefectComments(defectId!),
    enabled: !!defectId,
  });
}

/**
 * Create a comment
 */
export function useCreateDefectComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: CreateDefectCommentInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      return defectsService.createDefectComment(input, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.comments(variables.defect_id) });
      toast({ title: 'Comment added' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add comment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateDefectComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDefectCommentInput) => defectsService.updateDefectComment(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.comments(data.defect_id) });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteDefectComment(defectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => defectsService.deleteDefectComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.comments(defectId) });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch attachments for a defect
 */
export function useDefectAttachments(defectId: string | null) {
  return useQuery({
    queryKey: defectQueryKeys.attachments(defectId || ''),
    queryFn: () => defectsService.fetchDefectAttachments(defectId!),
    enabled: !!defectId,
  });
}

/**
 * Delete an attachment
 */
export function useDeleteDefectAttachment(defectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => defectsService.deleteDefectAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.attachments(defectId) });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch audit log for a defect
 */
export function useDefectAuditLog(defectId: string | null) {
  return useQuery({
    queryKey: defectQueryKeys.auditLog(defectId || ''),
    queryFn: () => defectsService.fetchDefectAuditLog(defectId!),
    enabled: !!defectId,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WORK ITEM LINKS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch work item links for a defect
 */
export function useDefectWorkItemLinks(defectId: string | null) {
  return useQuery({
    queryKey: defectQueryKeys.links(defectId || ''),
    queryFn: () => defectsService.fetchDefectWorkItemLinks(defectId!),
    enabled: !!defectId,
  });
}

/**
 * Create a work item link
 */
export function useCreateDefectWorkItemLink() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (input: CreateDefectLinkInput) => {
      if (!user?.id) throw new Error('User not authenticated');
      return defectsService.createDefectWorkItemLink(input, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.links(variables.defect_id) });
    },
  });
}

/**
 * Delete a work item link
 */
export function useDeleteDefectWorkItemLink(defectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => defectsService.deleteDefectWorkItemLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectQueryKeys.links(defectId) });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COLUMN PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch column preferences
 */
export function useDefectColumnPreferences() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: defectQueryKeys.columnPrefs(user?.id || ''),
    queryFn: () => defectsService.fetchColumnPreferences(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Save column preferences
 */
export function useSaveDefectColumnPreferences() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ columns, columnWidths }: { columns: string[]; columnWidths?: Record<string, number> }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return defectsService.saveColumnPreferences(user.id, columns, columnWidths);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: defectQueryKeys.columnPrefs(user.id) });
      }
    },
  });
}
