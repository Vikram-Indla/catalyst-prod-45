/**
 * useCreateStory — Hook for creating stories in catalyst_issues.
 * Handles key generation, form state, and submission.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CreateStoryFormData {
  projectId: string;
  summary: string;
  status: string;
  parentId: string | null;
  priority: string;
  description: string;
  descriptionAdf: any | null;
  releaseId: string | null;
  assigneeId: string | null;
  reporterId: string | null;
  tags: string[];
}

const INITIAL_FORM: CreateStoryFormData = {
  projectId: '',
  summary: '',
  status: 'In Requirements',
  parentId: null,
  priority: 'Medium',
  description: '',
  descriptionAdf: null,
  releaseId: null,
  assigneeId: null,
  reporterId: null,
  tags: [],
};

// Fetch projects for the project selector
export function useProjects() {
  return useQuery({
    queryKey: ['create-story-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, key, name')
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch team members for assignee/reporter
export function useTeamMembers() {
  return useQuery({
    queryKey: ['create-story-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch releases for a project
export function useProjectReleases(projectId: string) {
  return useQuery({
    queryKey: ['create-story-releases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('ph_releases' as any)
        .select('id, name')
        .eq('project_id', projectId)
        .order('name');
      if (error) return [];
      return (data as any[]) ?? [];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch parent candidates (epics/stories) for a project
export function useParentCandidates(projectId: string) {
  return useQuery({
    queryKey: ['create-story-parents', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, issue_type')
        .eq('project_id', projectId)
        .in('issue_type', ['Epic', 'Story', 'Feature'])
        .order('issue_key');
      if (error) return [];
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// Generate next issue key for a project
async function generateIssueKey(projectKey: string): Promise<string> {
  // Find the max issue number for this project key
  const { data } = await supabase
    .from('catalyst_issues')
    .select('issue_key')
    .like('issue_key', `${projectKey}-%`)
    .order('issue_key', { ascending: false })
    .limit(100);

  let maxNum = 0;
  (data ?? []).forEach((row: any) => {
    const m = row.issue_key.match(new RegExp(`^${projectKey}-(\\d+)$`));
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });

  return `${projectKey}-${maxNum + 1}`;
}

export function useCreateStoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { form: CreateStoryFormData; projectKey: string }) => {
      const { form, projectKey } = params;
      const issueKey = await generateIssueKey(projectKey);

      const { data, error } = await supabase
        .from('catalyst_issues')
        .insert({
          project_id: form.projectId,
          issue_key: issueKey,
          title: form.summary.trim(),
          description: form.description || null,
          description_adf_raw: form.descriptionAdf || null,
          issue_type: 'Story',
          status: form.status,
          priority: form.priority,
          assignee_id: form.assigneeId || null,
          reporter_id: form.reporterId || null,
          parent_id: form.parentId || null,
          release_id: form.releaseId || null,
          tags: form.tags.length > 0 ? form.tags : [],
          last_modified_by_system: 'catalyst',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-all-work'] });
      queryClient.invalidateQueries({ queryKey: ['issue-view-items'] });
    },
  });
}

export function useCreateStoryForm(defaultProjectId?: string) {
  const [form, setForm] = useState<CreateStoryFormData>({
    ...INITIAL_FORM,
    projectId: defaultProjectId ?? '',
  });

  const updateField = useCallback(<K extends keyof CreateStoryFormData>(
    key: K, value: CreateStoryFormData[K]
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback((keepProject = false) => {
    setForm(prev => ({
      ...INITIAL_FORM,
      projectId: keepProject ? prev.projectId : '',
      reporterId: keepProject ? prev.reporterId : null,
    }));
  }, []);

  return { form, updateField, reset, setForm };
}
