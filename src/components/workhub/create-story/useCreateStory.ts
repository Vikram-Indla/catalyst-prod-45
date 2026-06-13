/**
 * useCreateStory — Hook for creating stories in catalyst_issues.
 * Handles key generation, form state, and submission.
 */
import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// Canonical Atlaskit flag wrapper (pure @atlaskit/flag + Atlaskit icons,
// drop-in for catalystToast). Reset to Jira-canonical toast per audit.
import { flag } from '@/components/shared/JiraTable/flags';

export interface CreateStoryFormData {
  projectId: string;
  summary: string;
  status: string;
  parentId: string | null;
  priority: string;
  description: string;
  descriptionAdf: any | null;
  releaseId: string | null;
  sprintReleases: string[];
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
  sprintReleases: [],
  assigneeId: null,
  reporterId: null,
  tags: [],
  labels: [],
};

// Fetch projects for the project selector.
// Bucket F (2026-05-09): enriches with ph_projects.icon + ph_projects.color so
// the ProjectIcon Lucide fallback works for non-bundled-registry projects.
// Resolution order inside ProjectIcon:
//   admin override (catalyst_icon_overrides) > bundled SVG registry >
//   avatar_url (Jira image) > ph_projects Lucide icon > grey folder.
export function useProjects() {
  return useQuery({
    queryKey: ['create-story-projects'],
    queryFn: async () => {
      // Primary: projects table (UUID id, Jira-synced avatar_url).
      const { data, error } = await supabase
        .from('projects')
        .select('id, key, name, avatar_url, color')
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      const rows = data ?? [];

      // Secondary: ph_projects for Lucide icon + color (fallback for non-Jira projects).
      const { data: phRows } = await supabase
        .from('ph_projects')
        .select('key, icon, color')
        .eq('is_archived', false);

      const phByKey = new Map(
        (phRows ?? []).map((r: any) => [r.key?.toUpperCase(), r])
      );

      return rows.map((p: any) => {
        const ph = phByKey.get(p.key?.toUpperCase());
        return {
          ...p,
          // Only use ph icon/color if no avatar_url (lower priority in ProjectIcon cascade).
          iconName: ph?.icon ?? null,
          phColor:  ph?.color ?? null,
        };
      });
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

// ─────────────────────────────────────────────────────────────────────────────
// Kept for unit test compatibility — tests verify 'Task' and 'API Requirement'
// are absent. ph_workflow_type_statuses uses literal work_item_type strings now.
export const WORK_TYPE_TO_SCHEME_ISSUE_TYPE_FOR_TEST: Record<string, string> = {
  'Story':              'Story',
  'Epic':               'Epic',
  'Sub-task':           'Sub-task',
  'QA Bug':             'QA Bug',
  'Production Incident':'Production Incident',
  'Business Gap':       'Business Gap',
  'Change Request':     'Change Request',
  'Feature':            'Feature',
};
// ─────────────────────────────────────────────────────────────────────────────
export interface WorkflowStatusOption {
  value: string;       // status name (what we write to catalyst_issues.status)
  label: string;
  color_category: string; // 'todo' | 'in_progress' | 'done'
  is_initial: boolean;
  sort_order: number;
}

export function useWorkflowStatuses(workType: string, _projectId?: string) {
  return useQuery({
    queryKey: ['workflow-statuses-ph', workType],
    queryFn: async (): Promise<WorkflowStatusOption[]> => {
      if (!workType) return [];

      // Load statuses for this work item type from ph_workflow_* tables
      const { data: typeStatuses, error } = await supabase
        .from('ph_workflow_type_statuses')
        .select('position, is_initial, ph_workflow_statuses!inner(name, category, archived_at)')
        .eq('work_item_type', workType)
        .is('ph_workflow_statuses.archived_at', null)
        .order('position');

      if (error) {
        console.error('[useWorkflowStatuses] lookup error:', error.message);
        return [];
      }

      return (typeStatuses ?? []).map((ts: any) => ({
        value: ts.ph_workflow_statuses.name,
        label: ts.ph_workflow_statuses.name,
        color_category: ts.ph_workflow_statuses.category,
        is_initial: !!ts.is_initial,
        sort_order: ts.position ?? 0,
      }));
    },
    enabled: !!workType,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch parent candidates (epics/stories) for a project.
// F-iter9 unification: queries ph_issues for Catalyst-native epics
// (source='catalyst'); ph_issues uses project_key (not project_id) and
// `summary` (not `title`).
export function useParentCandidates(projectId: string, projectKey?: string) {
  return useQuery({
    queryKey: ['create-story-parents', projectKey || projectId],
    queryFn: async () => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type')
        .eq('project_key', projectKey)
        .eq('source', 'catalyst')
        .in('issue_type', ['Epic'])
        .order('issue_key');
      if (error) return [];
      // Re-shape to {title} so existing consumers keep their field names.
      return (data ?? []).map((r: any) => ({
        id: r.id,
        issue_key: r.issue_key,
        title: r.summary,
        issue_type: r.issue_type,
      }));
    },
    enabled: !!projectKey,
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

      // F-iter9 unification: insert into ph_issues with source='catalyst'.
      // Field map vs the legacy catalyst_issues shape:
      //   project_id (uuid)         → project_key (text)
      //   title                     → summary
      //   description_adf_raw       → description_adf
      //   assignee_id               → assignee_account_id
      //   reporter_id               → reporter_account_id
      //   tags                      → labels (array)
      //   parent_id (uuid self-FK)  → parent_key (text key, set by ph_issue_links below)
      //   last_modified_by_system   → DROPPED (no equivalent on ph_issues)
      //   sync_enabled              → DROPPED (Jira-synced state derived from source/jira_*)
      //   release_id                → DROPPED (use ph_releases linkage instead)
      const nowIso = new Date().toISOString();
      const insertData: Record<string, any> = {
          project_key: projectKey,
          issue_key: issueKey,
          summary: form.summary.trim(),
          // ph_issues has no plain `description` column — the canonical plain
          // mirror is `description_text` (see DescriptionPopover.tsx, which
          // notes "mirrors plain text to description_text"). Writing to
          // `description` returns PostgREST PGRST204: "Could not find the
          // 'description' column of 'ph_issues' in the schema cache".
          // Surfaced 2026-04-27 during jira-compare BAU Phase 8.
          description_text: form.description || null,
          description_adf: form.descriptionAdf || null,
          issue_type: issueType || 'Story',
          status: form.status,
          priority: form.priority,
          assignee_account_id: uuid(form.assigneeId),
          reporter_account_id: uuid(form.reporterId),
          parent_key: null, // set via ph_issue_links below
          labels: form.tags.length > 0 ? form.tags : [],
          source: 'catalyst',
          jira_created_at: nowIso,
          jira_updated_at: nowIso,
      };

      // Strip any remaining empty-string values for UUID columns
      for (const key of Object.keys(insertData)) {
        if (insertData[key] === '') insertData[key] = null;
      }

      const { data, error } = await supabase
        .from('ph_issues')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      // Log initial "created" activity so the item has activity from birth.
      // F-iter9 PK fix: ph_issues PK is issue_key (no id column). Use it.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('ph_activity_log').insert({
          work_item_id: data.issue_key ?? issueKey,
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
      flag.error('Create failed', message);
    },
  });
}

// ── Last-project memory per user ──
// Exported so the project-hub shell can write the current project UUID
// whenever the user navigates into a project context (Bucket D, 2026-05-09).
export const LAST_PROJECT_KEY = 'catalyst-last-project';

export function getLastProjectId(userId: string | undefined): string {
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

export function setLastProjectId(userId: string | undefined, projectId: string) {
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

  const [form, setForm] = useState<CreateStoryFormData>({
    ...INITIAL_FORM,
    // user may be null on first render (auth async); effect below will hydrate
    // once user is available. defaultProjectId takes priority over localStorage.
    projectId: defaultProjectId ?? '',
  });

  // Once user is resolved, apply the remembered project — but only if no
  // defaultProjectId was given and the form still has no project set.
  const [rememberedApplied, setRememberedApplied] = useState(false);
  useEffect(() => {
    if (rememberedApplied) return;
    if (!user?.id) return;
    if (defaultProjectId) { setRememberedApplied(true); return; }
    const remembered = getLastProjectId(user.id);
    if (remembered) {
      setForm(prev => prev.projectId ? prev : { ...prev, projectId: remembered });
    }
    setRememberedApplied(true);
  }, [user?.id, defaultProjectId, rememberedApplied]);

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
    // Allow the remembered-project effect to re-fire so the next modal
    // open pre-selects the last-used project again.
    if (!keepProject) setRememberedApplied(false);
  }, []);

  return { form, updateField, reset, setForm };
}
