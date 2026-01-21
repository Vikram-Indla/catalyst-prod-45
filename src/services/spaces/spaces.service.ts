// ════════════════════════════════════════════════════════════════════════════
// SPACES SERVICE - CRUD OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type {
  SpaceWithStats,
  CreateSpaceInput,
  UpdateSpaceInput,
  DefaultAssignee,
  SpaceListParams,
} from '@/types/spaces';

export class SpacesService {
  /**
   * Get all spaces with stats (paginated, filtered, sorted)
   */
  static async getSpaces(params: SpaceListParams = {}): Promise<{
    data: SpaceWithStats[];
    count: number;
  }> {
    const {
      filters = {},
      sort = { field: 'name', direction: 'asc' },
      page = 1,
      limit = 25,
    } = params;

    let query = supabase
      .from('spaces')
      .select(`
        *,
        space_categories!spaces_category_id_fkey(name, color),
        space_members(count),
        space_components(count),
        space_versions(count),
        space_starred(user_id)
      `, { count: 'exact' })
      .eq('status', 'active');

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,key.ilike.%${filters.search}%`);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.lead_id) {
      query = query.eq('lead_id', filters.lead_id);
    }

    // Apply sorting
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to match SpaceWithStats interface
    const transformedData: SpaceWithStats[] = (data || []).map((space: any) => ({
      ...space,
      category_name: space.space_categories?.name || null,
      category_color: space.space_categories?.color || null,
      lead_email: null,
      lead_name: null,
      member_count: space.space_members?.[0]?.count || 0,
      component_count: space.space_components?.[0]?.count || 0,
      unreleased_version_count: space.space_versions?.[0]?.count || 0,
      is_starred: (space.space_starred || []).length > 0,
    }));

    return { data: transformedData, count: count || 0 };
  }

  /**
   * Get single space by ID
   */
  static async getSpace(id: string): Promise<SpaceWithStats | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select(`
        *,
        space_categories!spaces_category_id_fkey(name, color),
        space_members(count),
        space_components(count),
        space_versions(count),
        space_starred(user_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      category_name: (data as any).space_categories?.name || null,
      category_color: (data as any).space_categories?.color || null,
      lead_email: null,
      lead_name: null,
      member_count: (data as any).space_members?.[0]?.count || 0,
      component_count: (data as any).space_components?.[0]?.count || 0,
      unreleased_version_count: (data as any).space_versions?.[0]?.count || 0,
      is_starred: ((data as any).space_starred || []).length > 0,
    } as SpaceWithStats;
  }

  /**
   * Get space by key
   */
  static async getSpaceByKey(key: string): Promise<SpaceWithStats | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? SpacesService.getSpace(data.id) : null;
  }

  /**
   * Get starred spaces for current user
   */
  static async getStarredSpaces(): Promise<SpaceWithStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('space_starred')
      .select('space_id')
      .eq('user_id', user.id);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const spaceIds = data.map(s => s.space_id);
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('*')
      .in('id', spaceIds)
      .eq('status', 'active');

    if (spacesError) throw spacesError;

    return (spaces || []).map(space => ({
      ...space,
      category_name: null,
      category_color: null,
      lead_email: null,
      lead_name: null,
      member_count: 0,
      component_count: 0,
      unreleased_version_count: 0,
      is_starred: true,
    })) as SpaceWithStats[];
  }

  /**
   * Get recent spaces for current user
   */
  static async getRecentSpaces(limit = 5): Promise<SpaceWithStats[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const spaceIds = data.map(s => s.space_id);
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('*')
      .in('id', spaceIds)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (spacesError) throw spacesError;

    return (spaces || []).map(space => ({
      ...space,
      category_name: null,
      category_color: null,
      lead_email: null,
      lead_name: null,
      member_count: 0,
      component_count: 0,
      unreleased_version_count: 0,
      is_starred: false,
    })) as SpaceWithStats[];
  }

  /**
   * Check if space key is available
   */
  static async isKeyAvailable(key: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('spaces')
      .select('id')
      .eq('key', key.toUpperCase());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return !data || data.length === 0;
  }

  /**
   * Create a new space
   */
  static async createSpace(input: CreateSpaceInput) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('spaces')
      .insert({
        ...input,
        key: input.key.toUpperCase(),
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a space
   */
  static async updateSpace(id: string, input: UpdateSpaceInput) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: any = { ...input, updated_by: user.id };
    if (input.key) {
      updateData.key = input.key.toUpperCase();
    }

    const { data, error } = await supabase
      .from('spaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Archive a space
   */
  static async archiveSpace(id: string) {
    const { data, error } = await supabase
      .from('spaces')
      .update({
        status: 'archived' as const,
        archived_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Restore a space from archive
   */
  static async restoreFromArchive(id: string) {
    const { data, error } = await supabase
      .from('spaces')
      .update({
        status: 'active' as const,
        archived_at: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Move a space to trash
   */
  static async moveToTrash(id: string) {
    const { data, error } = await supabase
      .from('spaces')
      .update({
        status: 'trashed' as const,
        trashed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Restore a space from trash
   */
  static async restoreFromTrash(id: string) {
    const { data, error } = await supabase
      .from('spaces')
      .update({
        status: 'active' as const,
        trashed_at: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Permanently delete a space
   */
  static async deleteSpace(id: string): Promise<void> {
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Toggle star on a space
   */
  static async toggleStar(spaceId: string, isCurrentlyStarred: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (isCurrentlyStarred) {
      const { error } = await supabase
        .from('space_starred')
        .delete()
        .eq('space_id', spaceId)
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('space_starred')
        .insert({ space_id: spaceId, user_id: user.id });
      if (error) throw error;
    }
  }
}
