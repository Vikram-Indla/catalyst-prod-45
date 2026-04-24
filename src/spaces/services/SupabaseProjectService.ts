// ============================================================================
// src/spaces/services/SupabaseProjectService.ts
// Concrete SpaceService adapter wired to the existing Catalyst `projects`
// table. Maps CreateSpaceRequest → projects insert and surfaces typed
// SpaceErrors that the wizard's error handlers know how to render.
// ============================================================================
//
// Field mapping (CreateSpaceRequest → projects column)
//   name              → name
//   key               → project_key  (and `key` for legacy mirror)
//   description       → description
//   purpose           → department   (best-fit; preserves existing schema)
//   isPrivate         → kept on the wizard side; no column today
//   features          → kept on the wizard side; no column today
//   permissionScheme  → kept on the wizard side; no column today
//   status_category   → 'todo'       (default for new projects)
//
// Auth: project owner_id + created_by are stamped from supabase.auth.getUser()
//       to match the existing useCreateProject() invariants.
// ============================================================================

import { supabase, typedQuery } from '@/integrations/supabase/client';
import { SpaceError } from '../errors';
import type {
  CreateSpaceRequest,
  Space,
  SpaceService,
  SpacePurpose,
} from '../types';

/** Postgres unique-violation SQLSTATE — what we get on a duplicate project_key. */
const PG_UNIQUE_VIOLATION = '23505';

const PURPOSE_TO_DEPARTMENT: Record<SpacePurpose, string> = {
  COLLABORATION: 'Collaboration',
  KNOWLEDGE_BASE: 'Knowledge Base',
  CUSTOM: 'Custom',
};

export class SupabaseProjectService implements SpaceService {
  /**
   * Case-insensitive uniqueness check against `projects.project_key`.
   * Returns true if the key is free.
   */
  async isKeyUnique(key: string): Promise<boolean> {
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) return false;

    const { data, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: false })
      .ilike('project_key', trimmed)
      .limit(1);

    if (error) {
      // Don't fail-closed — uniqueness is also enforced server-side via the
      // unique index, so worst case the create fails with PG_UNIQUE_VIOLATION
      // and we surface SpaceError.keyNotUnique then. Treat the read error as
      // a transient HTTP issue.
      throw SpaceError.http(500, `Failed to check project key: ${error.message}`, error);
    }

    return !data || data.length === 0;
  }

  /**
   * Insert a new row into `projects`. Mirrors the existing useCreateProject()
   * shape so downstream invariants (member_ids, sync_entity_map) keep holding.
   */
  async createSpace(req: CreateSpaceRequest): Promise<Space> {
    // 1) Auth — every create must be attributed to a real user.
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw SpaceError.http(401, 'You must be signed in to create a project', authError);
    }
    const userId = authData.user.id;

    // 2) Insert the project row.
    const insertPayload: Record<string, unknown> = {
      name: req.name.trim(),
      project_key: req.key.toUpperCase(),
      // Legacy mirror — older code paths still read `.key` directly.
      key: req.key.toUpperCase(),
      department: PURPOSE_TO_DEPARTMENT[req.purpose] ?? null,
      description: req.description?.trim() || null,
      status: 'active',
      status_category: 'todo',
      health_status: 'on_track',
      owner_id: userId,
      created_by: userId,
      lead_id: userId,
      program_id: '00000000-0000-0000-0000-000000000001',
      project_type: 'kanban',
      total_epics: 0,
      total_stories: 0,
      total_tasks: 0,
      work_items_todo: 0,
      work_items_in_progress: 0,
      work_items_done: 0,
      completion_percentage: 0,
    };

    const { data: project, error: insertError } = await typedQuery('projects')
      .insert(insertPayload)
      .select('id, name, project_key, description, department, created_at')
      .single();

    if (insertError) {
      // Postgres surfaces the unique-violation SQLSTATE on duplicate key.
      const code = (insertError as { code?: string }).code;
      const msg = (insertError.message || '').toLowerCase();
      if (code === PG_UNIQUE_VIOLATION || msg.includes('duplicate') || msg.includes('unique')) {
        throw SpaceError.keyNotUnique(req.key);
      }
      throw SpaceError.http(500, insertError.message || 'Failed to create project', insertError);
    }

    if (!project) {
      throw SpaceError.unknown('Project insert returned no row');
    }

    // 3) Auto-add creator as admin member — keeps parity with useCreateProject().
    //    A failure here is non-fatal for the wizard; the project exists and
    //    membership can be repaired later.
    try {
      await typedQuery('project_members').insert({
        project_id: project.id,
        user_id: userId,
        role: 'admin',
        added_by: userId,
      });
    } catch {
      // swallow — see comment above
    }

    return {
      id: project.id as string,
      name: project.name as string,
      key: project.project_key as string,
      purpose: req.purpose,
      description: (project.description as string | null) ?? undefined,
      isPrivate: req.isPrivate,
      createdAt: (project.created_at as string | null) ?? new Date().toISOString(),
    };
  }
}

/** Singleton — the modal mounts a single instance per app session. */
export const supabaseProjectService = new SupabaseProjectService();
