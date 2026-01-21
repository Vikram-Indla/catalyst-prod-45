// ════════════════════════════════════════════════════════════════════════════
// SPACE CATEGORIES SERVICE
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { SpaceCategory } from '@/types/spaces';

export class SpaceCategoriesService {
  /**
   * Get all space categories
   */
  static async getCategories(): Promise<SpaceCategory[]> {
    const { data, error } = await supabase
      .from('space_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single category
   */
  static async getCategory(id: string): Promise<SpaceCategory | null> {
    const { data, error } = await supabase
      .from('space_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}
