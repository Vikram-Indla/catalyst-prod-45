import { supabase } from '@/lib/supabase';
import type { BusinessRequest } from '@/types/business-request';

export class BusinessRequestService {
  /**
   * @deprecated Use getBRWithMilestones() instead
   * Progress calculation based on sprints is incorrect.
   */
  async getWithReleaseInfo(brId: string) {
    console.warn('[DEPRECATED] getWithReleaseInfo() is deprecated. Use getBRWithMilestones() instead.');
    // Old implementation would go here
    return this.getBusinessRequest(brId);
  }

  /**
   * Get BR with linked milestones, features, and progress
   */
  async getBRWithMilestones(brId: string): Promise<{
    br: BusinessRequest;
    milestones: any[];
    primaryMilestone?: any;
    linkedFeatures: any[];
    progressPercent: number;
  }> {
    const { data: br, error: brError } = await supabase
      .from('business_requests')
      .select('*')
      .eq('id', brId)
      .single();

    if (brError) throw brError;

    // Get milestones
    const { data: milestoneData, error: milestonError } = await supabase
      .from('business_request_milestone_links')
      .select(
        `
        id,
        milestone_id,
        sequence_in_milestone,
        is_primary,
        product_milestones(
          id,
          key,
          title,
          quarter,
          target_date
        )
      `
      )
      .eq('business_request_id', brId);

    if (milestonError) throw milestonError;

    // Get linked features
    const { data: featureData, error: featureError } = await supabase
      .from('project_features')
      .select('*')
      .contains('linked_business_request_ids', [brId]);

    if (featureError) throw featureError;

    // Calculate progress from features
    const progressPercent = this.calculateProgressFromFeatures(featureData);

    return {
      br,
      milestones: milestoneData || [],
      primaryMilestone: milestoneData?.find((m) => m.is_primary)?.product_milestones,
      linkedFeatures: featureData || [],
      progressPercent,
    };
  }

  /**
   * Calculate BR progress from linked features (NOT sprints)
   */
  async calculateBRProgressFromFeatures(brId: string): Promise<{
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    progressPercent: number;
  }> {
    const { data, error } = await supabase
      .from('project_features')
      .select('id, status')
      .contains('linked_business_request_ids', [brId]);

    if (error) throw error;

    const features = data || [];
    const totalFeatures = features.length;
    const completedFeatures = features.filter((f) => f.status === 'done').length;
    const inProgressFeatures = features.filter((f) => f.status === 'in_progress').length;

    const progressPercent = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    return {
      totalFeatures,
      completedFeatures,
      inProgressFeatures,
      progressPercent,
    };
  }

  /**
   * List BRs by milestone
   */
  async listBRsByMilestone(milestoneId: string): Promise<BusinessRequest[]> {
    const { data, error } = await supabase
      .from('business_request_milestone_links')
      .select('business_requests(*)')
      .eq('milestone_id', milestoneId);

    if (error) throw error;

    return data?.map((link: any) => link.business_requests) || [];
  }

  /**
   * Add BR to milestone
   */
  async addBRToMilestone(brId: string, milestoneId: string, phase?: number): Promise<void> {
    const { error } = await supabase
      .from('business_request_milestone_links')
      .insert({
        business_request_id: brId,
        milestone_id: milestoneId,
        sequence_in_milestone: phase || 1,
        is_primary: false,
      });

    if (error) throw error;
  }

  /**
   * Remove BR from milestone
   */
  async removeBRFromMilestone(brId: string, milestoneId: string): Promise<void> {
    const { error } = await supabase
      .from('business_request_milestone_links')
      .delete()
      .eq('business_request_id', brId)
      .eq('milestone_id', milestoneId);

    if (error) throw error;
  }

  /**
   * Get single BR
   */
  async getBusinessRequest(brId: string): Promise<BusinessRequest> {
    const { data, error } = await supabase
      .from('business_requests')
      .select('*')
      .eq('id', brId)
      .single();

    if (error) throw error;
    return data;
  }

  // Private helper
  private calculateProgressFromFeatures(features: any[]): number {
    if (!features || features.length === 0) return 0;
    const completed = features.filter((f) => f.status === 'done').length;
    return Math.round((completed / features.length) * 100);
  }
}

export const businessRequestService = new BusinessRequestService();
