/**
 * Versions Hook
 * Manages release versions with Supabase integration
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Version {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  released: boolean;
  archived: boolean;
  projectId: string;
  sequence: number;
}

export interface VersionWithProgress extends Version {
  issueCount: number;
  doneCount: number;
  inProgressCount: number;
  toDoCount: number;
  progress: number;
}

export interface CreateVersionData {
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  projectId: string;
}

export interface UpdateVersionData {
  name?: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  released?: boolean;
  archived?: boolean;
}

export function useVersions(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  // Fetch versions for project
  const {
    data: versions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['injira-versions', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Fetch versions
      const { data: versionsData, error: versionsError } = await (supabase as any)
        .from('injira_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      if (versionsError) throw versionsError;
      if (!versionsData) return [];

      // Get issue counts per version with status category breakdown
      const versionsWithProgress: VersionWithProgress[] = await Promise.all(
        ((versionsData || []) as any[]).map(async (v: any) => {
          // Get issues linked to this version
          const { data: issueVersions } = await supabase
            .from('injira_issue_versions')
            .select(`
              issue_id,
              injira_issues!inner(
                id,
                status_id
              )
            `)
            .eq('version_id', v.id)
            .eq('relation_type', 'fix');

          const issueIds = issueVersions?.map(iv => (iv as any).injira_issues?.id).filter(Boolean) || [];
          
          if (issueIds.length === 0) {
            return {
              id: v.id,
              name: v.name,
              description: v.description,
              startDate: v.start_date,
              releaseDate: v.release_date,
              released: v.released || false,
              archived: v.archived || false,
              projectId: v.project_id,
              sequence: v.sort_order || 0,
              issueCount: 0,
              doneCount: 0,
              inProgressCount: 0,
              toDoCount: 0,
              progress: 0,
            };
          }

          // Get status categories for each issue
          const { data: issuesWithStatus } = await (supabase as any)
            .from('injira_issues')
            .select(`
              id,
              injira_statuses!inner(
                category
              )
            `)
            .in('id', issueIds);

          let doneCount = 0;
          let inProgressCount = 0;
          let toDoCount = 0;

          issuesWithStatus?.forEach((issue: any) => {
            const category = issue.injira_statuses?.category;
            if (category === 'done') doneCount++;
            else if (category === 'in_progress') inProgressCount++;
            else toDoCount++;
          });

          const issueCount = issueIds.length;
          const progress = issueCount > 0 ? Math.round((doneCount / issueCount) * 100) : 0;

          return {
            id: v.id as string,
            name: v.name as string,
            description: v.description as string | undefined,
            startDate: v.start_date as string | undefined,
            releaseDate: v.release_date as string | undefined,
            released: (v.released || false) as boolean,
            archived: (v.archived || false) as boolean,
            projectId: v.project_id as string,
            sequence: (v.sort_order || 0) as number,
            issueCount,
            doneCount,
            inProgressCount,
            toDoCount,
            progress,
          };
        })
      );

      return versionsWithProgress;
    },
    enabled: !!projectId,
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async (data: CreateVersionData) => {
      // Get tenant ID first
      const { data: project } = await (supabase as any)
        .from('injira_projects')
        .select('tenant_id')
        .eq('id', data.projectId)
        .single();
      const projectTyped = project as { tenant_id: string } | null;

      if (!projectTyped) throw new Error('Project not found');

      // Get max sort_order
      const { data: maxSeq } = await (supabase as any)
        .from('injira_versions')
        .select('sort_order')
        .eq('project_id', data.projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const maxSeqTyped = maxSeq as { sort_order: number } | null;

      const nextSequence = (maxSeqTyped?.sort_order || 0) + 1;

      const { data: version, error } = await (supabase as any)
        .from('injira_versions')
        .insert({
          tenant_id: projectTyped.tenant_id,
          project_id: data.projectId,
          name: data.name,
          description: data.description,
          start_date: data.startDate,
          release_date: data.releaseDate,
          sequence: nextSequence,
        })
        .select()
        .single();

      if (error) throw error;
      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-versions', projectId] });
      toast.success('Version created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });

  // Update version mutation
  const updateVersionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVersionData }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.startDate !== undefined) updateData.start_date = data.startDate;
      if (data.releaseDate !== undefined) updateData.release_date = data.releaseDate;
      if (data.released !== undefined) updateData.released = data.released;
      if (data.archived !== undefined) updateData.archived = data.archived;

      const { data: version, error } = await (supabase as any)
        .from('injira_versions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-versions', projectId] });
      toast.success('Version updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update version: ${error.message}`);
    },
  });

  // Release version
  const releaseVersion = useCallback(async (versionId: string) => {
    return updateVersionMutation.mutateAsync({
      id: versionId,
      data: { released: true, releaseDate: new Date().toISOString().split('T')[0] },
    });
  }, [updateVersionMutation]);

  // Unrelease version
  const unreleaseVersion = useCallback(async (versionId: string) => {
    return updateVersionMutation.mutateAsync({
      id: versionId,
      data: { released: false },
    });
  }, [updateVersionMutation]);

  // Archive version
  const archiveVersion = useCallback(async (versionId: string) => {
    return updateVersionMutation.mutateAsync({
      id: versionId,
      data: { archived: true },
    });
  }, [updateVersionMutation]);

  // Unarchive version
  const unarchiveVersion = useCallback(async (versionId: string) => {
    return updateVersionMutation.mutateAsync({
      id: versionId,
      data: { archived: false },
    });
  }, [updateVersionMutation]);

  // Delete version mutation
  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await (supabase as any)
        .from('injira_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['injira-versions', projectId] });
      toast.success('Version deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete version: ${error.message}`);
    },
  });

  // Filter helpers
  const unreleasedVersions = useMemo(
    () => versions.filter(v => !v.released && !v.archived),
    [versions]
  );

  const releasedVersions = useMemo(
    () => versions.filter(v => v.released && !v.archived),
    [versions]
  );

  const archivedVersions = useMemo(
    () => versions.filter(v => v.archived),
    [versions]
  );

  return {
    versions,
    unreleasedVersions,
    releasedVersions,
    archivedVersions,
    isLoading,
    error,
    refetch,
    createVersion: createVersionMutation.mutateAsync,
    updateVersion: updateVersionMutation.mutateAsync,
    releaseVersion,
    unreleaseVersion,
    archiveVersion,
    unarchiveVersion,
    deleteVersion: deleteVersionMutation.mutateAsync,
    isCreating: createVersionMutation.isPending,
    isUpdating: updateVersionMutation.isPending,
    isDeleting: deleteVersionMutation.isPending,
  };
}
