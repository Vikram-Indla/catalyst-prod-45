// ════════════════════════════════════════════════════════════════════════════
// SPACE VERSIONS SERVICE
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { SpaceVersion, CreateVersionInput, UpdateVersionInput, VersionStatus } from '@/types/spaces';

export class SpaceVersionsService {
  /**
   * Get all versions for a space
   */
  static async getVersions(spaceId: string, status?: VersionStatus): Promise<SpaceVersion[]> {
    let query = supabase
      .from('space_versions')
      .select('*')
      .eq('space_id', spaceId)
      .order('sort_order', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single version
   */
  static async getVersion(id: string): Promise<SpaceVersion | null> {
    const { data, error } = await supabase
      .from('space_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Create a version
   */
  static async createVersion(spaceId: string, input: CreateVersionInput): Promise<SpaceVersion> {
    // Get the max sort order
    const { data: existing } = await supabase
      .from('space_versions')
      .select('sort_order')
      .eq('space_id', spaceId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('space_versions')
      .insert({
        space_id: spaceId,
        sort_order: sortOrder,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a version
   */
  static async updateVersion(id: string, input: UpdateVersionInput): Promise<SpaceVersion> {
    const { data, error } = await supabase
      .from('space_versions')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Release a version
   */
  static async releaseVersion(id: string): Promise<SpaceVersion> {
    const { data, error } = await supabase
      .from('space_versions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        actual_release_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Archive a version
   */
  static async archiveVersion(id: string): Promise<SpaceVersion> {
    const { data, error } = await supabase
      .from('space_versions')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Unarchive a version
   */
  static async unarchiveVersion(id: string): Promise<SpaceVersion> {
    const { data, error } = await supabase
      .from('space_versions')
      .update({
        status: 'unreleased',
        archived_at: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a version
   */
  static async deleteVersion(id: string): Promise<void> {
    const { error } = await supabase
      .from('space_versions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Reorder versions
   */
  static async reorderVersions(spaceId: string, versionIds: string[]): Promise<void> {
    const updates = versionIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('space_versions')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
        .eq('space_id', spaceId);

      if (error) throw error;
    }
  }
}
