/**
 * useCreateStory — Hook for creating stories in catalyst_issues.
 * Handles key generation, form state, and submission.
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';

export interface CreateStoryFormData {
  projectId: string;
  summary: string;
  status: string;
  parentId: string | null;
  priority: string;
  description: string;
  descriptionAdf: any | null;
  releaseId: string | null;
  fixVersions: string[];
  assigneeId: string | null;
  reporterId: string | null;
  tags: string[];
  labels: string[];
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
  fixVersions: [],
  assigneeId: null,
  reporterId: null,
  tags: [],
  labels: [],
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

// Fetch releases for a project (canonical source: rh_releases / ReleaseHub)
// rh_releases.id is UUID and matches catalyst_issues.release_id (also UUID).
export function useProjectReleases(projectId: string) {
  return useQuery({
    queryKey: ['create-story-releases', projectId],
    queryFn: async () => {
      console.log('[useProjectReleases] called with projectId:', projectId);
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('rh_releases')
        .select('id, name, status, target_date')
        .eq('project_id', projectId)
        .order('target_date', { ascending: false, nullsFirst: false })
        .order('name');
      if (error) {
        console.error('[useProjectReleases] Supabase error:', error.message, (error as any).code);
        return [];
      }
      return (data as any[]) ?? [];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Workflow statuses (canonical source: catalyst_workflow_schemes + _statuses)
// Maps Create-modal work types to the canonical scheme.issue_type values.
// Unmapped types fall through; caller should provide a hardcoded fallback.
// ────────────────────────────────────────────────────────────────────────────
const WORK_TYPE_TO_SCHEME_ISSUE_TYPE: Record<string, string> = {
  'Story': 'Story',
  'Epic': 'Epic',
  'Sub-task': 'Sub-task',
  'Task': 'Task',
  'QA Bug': 'Defect',
  'Production Incident': 'Defect',
  'Business Gap': 'Business Request',
  'Change Request': 'Business Request',
  'Feature': 'Story',          // best-fit until a Feature scheme exists
  'API Requirement': 'Story',  // best-fit until an API Requirement scheme exists
};

export interface WorkflowStatusOption {
  value: string;       // status name (what we write to catalyst_issues.status)
  label: string;
  color_category: string; // 'todo' | 'in_progress' | 'done'
  is_initial: boolean;
  sort_order: number;
}

export function useWorkflowStatuses(workType: string, _projectId?: string) {
  const schemeIssueType = WORK_TYPE_TO_SCHEME_ISSUE_TYPE[workType];

  return useQuery({
    queryKey: ['workflow-statuses', schemeIssueType ?? workType],
    queryFn: async (): Promise<WorkflowStatusOption[]> => {
      if (!schemeIssueType) return [];

      // 1. Find the default active scheme for this issue type
      const { data: scheme, error: schemeErr } = await supabase
        .from('catalyst_workflow_schemes')
        .select('id')
        .eq('issue_type', schemeIssueType)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle();

      if (schemeErr) {
        console.error('[useWorkflowStatuses] scheme lookup error:', schemeErr.message);
        return [];
      }
      if (!scheme) return [];

      // 2. Load that scheme's statuses
      const { data: statuses, error: statusErr } = await supabase
        .from('catalyst_workflow_statuses')
        .select('name, category, is_initial, position')
        .eq('scheme_id', scheme.id)
        .order('position');

      if (statusErr) {
        console.error('[useWorkflowStatuses] status lookup error:', statusErr.message);
        return [];
      }

      return (statuses ?? []).map((s: any) => ({
        value: s.name,
        label: s.name,
        color_category: s.category,
        is_initial: !!s.is_initial,
        sort_order: s.position ?? 0,
      }));
    },
    enabled: !!workType,
    staleTime: 5 * 60 * 1000,
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
        .in('issue_type', ['Epic'])
        .order('issue_key');
      if (error) return [];
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// Phase 5 (Apr 2026): unified key generator queries BOTH ph_issues
// AND catalyst_issues so Catalyst-native creates never collide with
// Jira-synced keys in the same project. Single source of truth lives
// at src/modules/project-work-hub/lib/generateIssueKey.ts.
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';

export function useCreateStoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { form: CreateStoryFormData; projectKey: string; issueType?: string }) => {
      const { form, projectKey, issueType } = params;

      if (!form.projectId || !form.projectId.trim()) {
        throw new Error('Project is required');
      }

      const issueKey = await generateIssueKey(projectKey);

      // Guard: convert any empty strings to null for UUID columns
      const uuid = (v: string | null | undefined) => (v && v.trim() ? v : null);

      const insertData: Record<string, any> = {
          project_id: form.projectId,
          issue_key: issueKey,
          title: form.summary.trim(),
          description: form.description || null,
          description_adf_raw: form.descriptionAdf || null,
          issue_type: issueType || 'Story',
          status: form.status,
          priority: form.priority,
          assignee_id: uuid(form.assigneeId),
          reporter_id: uuid(form.reporterId),
          release_id: form.releaseId && form.releaseId.trim() !== '' ? form.releaseId : null,
          // parent_id FK is self-referential to catalyst_issues, but Epic parents
          // live in ph_issues (Jira-synced). We always null this on insert and
          // record the parent relationship in ph_issue_links below.
          parent_id: null,
          // labels: column does not exist on catalyst_issues — removed
          tags: form.tags.length > 0 ? form.tags : [],
          last_modified_by_system: 'catalyst',
          sync_enabled: false,
      };

      // Strip any remaining empty-string values for UUID columns
      for (const key of Object.keys(insertData)) {
        if (insertData[key] === '') insertData[key] = null;
      }

      const { data, error } = await supabase
        .from('catalyst_issues')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      // Log initial "created" activity so the item has activity from birth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('ph_activity_log').insert({
          work_item_id: data.id,
          user_id: user?.id ?? null,
          action: 'created',
          field_name: null,
          old_value: null,
          new_value: null,
          metadata: { issue_key: issueKey, issue_type: issueType || 'Story', summary: form.summary.trim() },
        } as any);
      } catch (actErr) {
        console.warn('[CreateStory] Failed to log activity:', actErr);
      }

      // ── Parent link via ph_issue_links ────────────────────────────────────
      // form.parentId now holds the parent Epic's issue_key (e.g. "BAU-123").
      // We record the relationship as: <new story> child of <parent epic>.
      if (form.parentId && form.parentId.trim()) {
        try {
          const { error: linkErr } = await supabase.from('ph_issue_links').insert({
            source_id: issueKey,
            target_id: form.parentId,
            link_type: 'child of',
          } as any);
          if (linkErr) {
            console.warn('[CreateStory] Failed to write parent link:', linkErr.message);
          }
        } catch (linkCatch) {
          console.warn('[CreateStory] Parent link insert threw:', linkCatch);
        }
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      const projectId = variables.form.projectId;
      // Core invalidations — issue lists
      queryClient.invalidateQueries({ queryKey: ['project-all-work'] });
      queryClient.invalidateQueries({ queryKey: ['issue-view-items'] });
      // Backlog, sprint, board views
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-items'] });
      queryClient.invalidateQueries({ queryKey: ['board-issues'] });
      // Sidebar + dashboard counts
      queryClient.invalidateQueries({ queryKey: ['v_issue_counts'] });
      queryClient.invalidateQueries({ queryKey: ['project-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      // Project-scoped lists (if project is known)
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['work-items', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-issues', projectId] });
      }
      // Parent item — so newly created child appears in parent's children list
      if (variables.form.parentId) {
        queryClient.invalidateQueries({ queryKey: ['issue-children', variables.form.parentId] });
        queryClient.invalidateQueries({ queryKey: ['epic-issues', variables.form.parentId] });
      }
    },
    onError: (error: any) => {
      const message = error?.message ?? 'Failed to create work item';
      console.error('[useCreateStory] mutation error:', error);
      catalystToast.error('Create failed', message);
    },
  });
}

// ── Last-project memory per user ──
const LAST_PROJECT_KEY = 'catalyst-last-project';

function getLastProjectId(userId: string | undefined): string {
  if (!userId) return '';
  try {
    const stored = localStorage.getItem(LAST_PROJECT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[userId] ?? '';
    }
  } catch {}
  return '';
}

function setLastProjectId(userId: string | undefined, projectId: string) {
  if (!userId || !projectId) return;
  try {
    const stored = localStorage.getItem(LAST_PROJECT_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[userId] = projectId;
    localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(parsed));
  } catch {}
}

export function useCreateStoryForm(defaultProjectId?: string) {
  const { user } = useAuth();
  const rememberedProjectId = getLastProjectId(user?.id);

  const [form, setForm] = useState<CreateStoryFormData>({
    ...INITIAL_FORM,
    projectId: defaultProjectId ?? rememberedProjectId ?? '',
  });

  const updateField = useCallback(<K extends keyof CreateStoryFormData>(
    key: K, value: CreateStoryFormData[K]
  ) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Persist project selection per user
      if (key === 'projectId' && typeof value === 'string') {
        setLastProjectId(user?.id, value);
      }
      return next;
    });
  }, [user?.id]);

  const reset = useCallback((keepProject = false) => {
    setForm(prev => ({
      ...INITIAL_FORM,
      projectId: keepProject ? prev.projectId : '',
      reporterId: keepProject ? prev.reporterId : null,
    }));
  }, []);

  return { form, updateField, reset, setForm };
}
