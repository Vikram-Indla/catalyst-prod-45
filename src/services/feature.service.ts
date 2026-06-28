import { supabase } from '@/lib/supabase';

export class FeatureService {
  /**
   * Get feature with linked BRs and milestones
   */
  async getFeatureWithBRsAndMilestones(featureId: string): Promise<{
    feature: any;
    linkedBRs: any[];
    linkedMilestones: any[];
  }> {
    const { data: feature, error: featureError } = await supabase
      .from('project_features')
      .select('*')
      .eq('id', featureId)
      .single();

    if (featureError) throw featureError;

    // Get linked BRs
    let linkedBRs: any[] = [];
    if (feature.linked_business_request_ids?.length) {
      const { data: brs, error: brError } = await supabase
        .from('business_requests')
        .select('*')
        .in('id', feature.linked_business_request_ids);

      if (brError) throw brError;
      linkedBRs = brs || [];
    }

    // Get linked milestones
    let linkedMilestones: any[] = [];
    if (feature.linked_milestone_ids?.length) {
      const { data: milestones, error: milestoneError } = await supabase
        .from('product_milestones')
        .select('*')
        .in('id', feature.linked_milestone_ids);

      if (milestoneError) throw milestoneError;
      linkedMilestones = milestones || [];
    }

    return {
      feature,
      linkedBRs,
      linkedMilestones,
    };
  }

  /**
   * Link feature to BR
   */
  async linkFeatureToBR(featureId: string, brId: string): Promise<void> {
    const { data: feature, error: fetchError } = await supabase
      .from('project_features')
      .select('linked_business_request_ids')
      .eq('id', featureId)
      .single();

    if (fetchError) throw fetchError;

    const currentIds = feature.linked_business_request_ids || [];
    if (!currentIds.includes(brId)) {
      currentIds.push(brId);
    }

    const { error: updateError } = await supabase
      .from('project_features')
      .update({ linked_business_request_ids: currentIds })
      .eq('id', featureId);

    if (updateError) throw updateError;
  }

  /**
   * Link feature to milestone
   */
  async linkFeatureToMilestone(featureId: string, milestoneId: string): Promise<void> {
    const { data: feature, error: fetchError } = await supabase
      .from('project_features')
      .select('linked_milestone_ids')
      .eq('id', featureId)
      .single();

    if (fetchError) throw fetchError;

    const currentIds = feature.linked_milestone_ids || [];
    if (!currentIds.includes(milestoneId)) {
      currentIds.push(milestoneId);
    }

    const { error: updateError } = await supabase
      .from('project_features')
      .update({ linked_milestone_ids: currentIds })
      .eq('id', featureId);

    if (updateError) throw updateError;
  }

  /**
   * Get feature progress (from stories)
   */
  async getFeatureProgress(featureId: string): Promise<{
    totalStories: number;
    completedStories: number;
    progressPercent: number;
  }> {
    const { data: feature, error } = await supabase
      .from('project_features')
      .select('story_count, completed_story_count')
      .eq('id', featureId)
      .single();

    if (error) throw error;

    const totalStories = feature.story_count || 0;
    const completedStories = feature.completed_story_count || 0;
    const progressPercent = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

    return {
      totalStories,
      completedStories,
      progressPercent,
    };
  }

  /**
   * Update feature progress
   */
  async updateFeatureProgress(featureId: string): Promise<void> {
    const progress = await this.getFeatureProgress(featureId);

    const { error } = await supabase
      .from('project_features')
      .update({ completed_story_count: progress.completedStories })
      .eq('id', featureId);

    if (error) throw error;
  }
}

export const featureService = new FeatureService();
