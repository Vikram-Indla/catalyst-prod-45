// ════════════════════════════════════════════════════════════════════════════
// SPACE PERMISSIONS SERVICE
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { SpacePermission, UpdatePermissionInput, PermissionKey, PERMISSION_KEYS } from '@/types/spaces';

export class SpacePermissionsService {
  /**
   * Get all permissions for a space
   */
  static async getPermissions(spaceId: string): Promise<SpacePermission[]> {
    const { data, error } = await supabase
      .from('space_permissions')
      .select('*')
      .eq('space_id', spaceId)
      .order('permission_key', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update a permission
   */
  static async updatePermission(
    spaceId: string,
    permissionKey: PermissionKey,
    input: UpdatePermissionInput
  ): Promise<SpacePermission> {
    const { data, error } = await supabase
      .from('space_permissions')
      .update(input)
      .eq('space_id', spaceId)
      .eq('permission_key', permissionKey)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Reset permissions to defaults
   */
  static async resetToDefaults(spaceId: string): Promise<void> {
    // Delete existing permissions
    const { error: deleteError } = await supabase
      .from('space_permissions')
      .delete()
      .eq('space_id', spaceId);

    if (deleteError) throw deleteError;

    // Call the function to create defaults
    const { error } = await supabase.rpc('create_default_space_permissions', {
      p_space_id: spaceId,
    });

    if (error) throw error;
  }
}
