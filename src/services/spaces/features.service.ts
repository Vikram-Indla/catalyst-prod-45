// ════════════════════════════════════════════════════════════════════════════
// SPACE FEATURES SERVICE
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { SpaceFeatures, UpdateFeaturesInput } from '@/types/spaces';

export class SpaceFeaturesService {
  /**
   * Get features for a space
   */
  static async getFeatures(spaceId: string): Promise<SpaceFeatures | null> {
    const { data, error } = await supabase
      .from('space_features')
      .select('*')
      .eq('space_id', spaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Update features for a space
   */
  static async updateFeatures(spaceId: string, input: UpdateFeaturesInput): Promise<SpaceFeatures> {
    const { data, error } = await supabase
      .from('space_features')
      .update(input)
      .eq('space_id', spaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Toggle a single feature
   */
  static async toggleFeature(
    spaceId: string,
    feature: keyof UpdateFeaturesInput,
    enabled: boolean
  ): Promise<SpaceFeatures> {
    return SpaceFeaturesService.updateFeatures(spaceId, { [feature]: enabled });
  }
}
