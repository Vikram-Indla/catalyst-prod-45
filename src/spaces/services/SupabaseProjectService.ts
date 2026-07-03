// @ts-nocheck
// ============================================================================
// src/spaces/services/SupabaseProjectService.ts
// Concrete SpaceService adapter wired to the existing Catalyst `projects`
// table. Maps CreateSpaceRequest → projects insert and surfaces typed
// SpaceErrors that the wizard's error handlers know how to render.
// ============================================================================
//
// Field mapping (CreateSpaceRequest → projects column)
//   name              → name
//   key               → key           (raw projects table column)
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

import { supabase } from '@/integrations/supabase/client';
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
   * Case-insensitive uniqueness check against `projects.key`.
   * Returns true if the key is free.
   */
  async isKeyUnique(key: string): Promise<boolean> {
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) return false;

    const { data, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: false })
      .ilike('key', trimmed)
      .limit(1);

    if (error) {
      throw SpaceError.http(500, `Failed to check project key: ${error.message}`, error);
    }

    return !data || data.length === 0;
  }

  /**
   * Creates a project via the create_project_full SECURITY DEFINER RPC.
   * Running as postgres bypasses all table-level RLS on projects, hi_statuses,
   * hi_project_sequences, and project_members — eliminating PostgREST cache
   * sensitivity and the hi_statuses 42501 error.
   */
  async createSpace(req: CreateSpaceRequest): Promise<Space> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw SpaceError.http(401, 'You must be signed in to create a project', authError);
    }

    const { data, error } = await supabase.functions.invoke('create-project', {
      body: {
        name:        req.name.trim(),
        key:         req.key.toUpperCase(),
        department:  PURPOSE_TO_DEPARTMENT[req.purpose] ?? null,
        description: req.description?.trim() || null,
        icon:        req.icon || null,
        user_id:     userId,
      },
    });

    if (error || !data) {
      if ((data as { error?: string } | null)?.error === 'key_not_unique') {
        throw SpaceError.keyNotUnique(req.key);
      }
      throw SpaceError.http(500, error?.message || 'Failed to create project', error);
    }

    return {
      id:          data.id,
      name:        data.name,
      key:         data.key,
      purpose:     req.purpose,
      description: data.description ?? undefined,
      isPrivate:   req.isPrivate,
      createdAt:   data.created_at ?? null,
    };
  }
}

/** Singleton — the modal mounts a single instance per app session. */
export const supabaseProjectService = new SupabaseProjectService();
