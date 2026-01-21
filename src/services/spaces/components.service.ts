// ════════════════════════════════════════════════════════════════════════════
// SPACE COMPONENTS SERVICE
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { SpaceComponent, CreateComponentInput, UpdateComponentInput } from '@/types/spaces';

export class SpaceComponentsService {
  /**
   * Get all components for a space
   */
  static async getComponents(spaceId: string): Promise<SpaceComponent[]> {
    const { data, error } = await supabase
      .from('space_components')
      .select('*')
      .eq('space_id', spaceId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single component
   */
  static async getComponent(id: string): Promise<SpaceComponent | null> {
    const { data, error } = await supabase
      .from('space_components')
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
   * Create a component
   */
  static async createComponent(spaceId: string, input: CreateComponentInput): Promise<SpaceComponent> {
    const { data, error } = await supabase
      .from('space_components')
      .insert({
        space_id: spaceId,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a component
   */
  static async updateComponent(id: string, input: UpdateComponentInput): Promise<SpaceComponent> {
    const { data, error } = await supabase
      .from('space_components')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a component
   */
  static async deleteComponent(id: string): Promise<void> {
    const { error } = await supabase
      .from('space_components')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
