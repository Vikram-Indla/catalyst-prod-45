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
   * Create a project via the `create-project` edge function. The function
   * runs server-side with the service_role key so it bypasses RLS on
   * `projects`, `hi_statuses`, `hi_project_sequences`, and `project_members`
   * — avoiding PostgREST schema-cache races on SECURITY DEFINER functions.
   */
  async createSpace(req: CreateSpaceRequest): Promise<Space> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw SpaceError.http(401, 'You must be signed in to create a project', authError);
    }
    const userId = authData.user.id;

    const { data, error } = await supabase.functions.invoke<{
      id: string;
      name: string;
      key: string;
      description: string | null;
      department: string | null;
      created_at: string;
      error?: string;
    }>('create-project', {
      body: {
        name: req.name.trim(),
        key: req.key.toUpperCase(),
        department: PURPOSE_TO_DEPARTMENT[req.purpose] ?? null,
        description: req.description?.trim() || null,
        user_id: userId,
      },
    });

    if (error) {
      // FunctionsHttpError exposes the response on `error.context`.
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const payload = await ctx.json();
          if (ctx.status === 409 || payload?.error === 'key_not_unique') {
            throw SpaceError.keyNotUnique(req.key);
          }
          throw SpaceError.http(ctx.status || 500, payload?.error || error.message, error);
        } catch (parseErr) {
          if (parseErr instanceof SpaceError) throw parseErr;
        }
      }
      throw SpaceError.http(500, error.message || 'Failed to create project', error);
    }

    if (!data || data.error) {
      if (data?.error === 'key_not_unique') {
        throw SpaceError.keyNotUnique(req.key);
      }
      throw SpaceError.unknown(data?.error || 'create-project returned no data');
    }

    return {
      id: data.id,
      name: data.name,
      key: data.key,
      purpose: req.purpose,
      description: data.description ?? undefined,
      isPrivate: req.isPrivate,
      createdAt: data.created_at ?? new Date().toISOString(),
    };
  }
}

/** Singleton — the modal mounts a single instance per app session. */
export const supabaseProjectService = new SupabaseProjectService();
