// ════════════════════════════════════════════════════════════════════════════
// SPACE MEMBERS SERVICE
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { SpaceMember, AddMemberInput, UpdateMemberInput, MemberRole } from '@/types/spaces';

export class SpaceMembersService {
  /**
   * Get all members of a space
   */
  static async getMembers(spaceId: string): Promise<SpaceMember[]> {
    const { data, error } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single member
   */
  static async getMember(spaceId: string, userId: string): Promise<SpaceMember | null> {
    const { data, error } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Get current user's role in a space
   */
  static async getCurrentUserRole(spaceId: string): Promise<MemberRole | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const member = await SpaceMembersService.getMember(spaceId, user.id);
    return member?.role || null;
  }

  /**
   * Check if current user has a specific permission
   */
  static async hasPermission(spaceId: string, permissionKey: string): Promise<boolean> {
    const role = await SpaceMembersService.getCurrentUserRole(spaceId);
    if (!role) return false;

    const { data, error } = await supabase
      .from('space_permissions')
      .select('administrator, member, viewer')
      .eq('space_id', spaceId)
      .eq('permission_key', permissionKey)
      .single();

    if (error) return false;
    if (!data) return false;

    return data[role] === true;
  }

  /**
   * Add a member to a space
   */
  static async addMember(spaceId: string, input: AddMemberInput): Promise<SpaceMember> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('space_members')
      .insert({
        space_id: spaceId,
        user_id: input.user_id,
        role: input.role || 'member',
        added_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a member's role
   */
  static async updateMember(spaceId: string, userId: string, input: UpdateMemberInput): Promise<SpaceMember> {
    const { data, error } = await supabase
      .from('space_members')
      .update({ role: input.role })
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Remove a member from a space
   */
  static async removeMember(spaceId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
