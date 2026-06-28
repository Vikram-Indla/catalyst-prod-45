import { supabase } from '@/lib/supabase';
import { recordAdvisoryStatusChange } from '@/lib/workflow/canonical/runtime';
import type {
  ProductMilestone,
  ProductMilestoneWithProgress,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneProgress,
  MilestoneFilters,
} from '@/types/product-milestone';

export class ProductMilestoneService {
  /**
   * Create a new product milestone
   */
  async createMilestone(input: CreateMilestoneInput): Promise<ProductMilestone> {
    const { data, error } = await supabase
      .from('product_milestones')
      .insert({
        product_id: input.productId,
        key: input.key,
        title: input.title,
        quarter: input.quarter,
        start_date: input.startDate,
        target_date: input.targetDate,
        status: input.status || 'planned',
        description: input.description,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  /**
   * Get milestone with progress information
   */
  async getMilestone(id: string): Promise<ProductMilestoneWithProgress> {
    const milestone = await this.getMilestoneBase(id);
    const linkedBRs = await this.getLinkedBRs(id);
    const progress = await this.calculateProgress(id);

    return {
      ...milestone,
      linkedBRCount: linkedBRs.length,
      linkedBRs,
      linkedFeatures: [], // Would fetch from linked BRs
      progressPercent: progress.progressPercent,
      healthStatus: this.determineHealth(milestone, progress),
    } as ProductMilestoneWithProgress;
  }

  /**
   * List milestones for a product with optional filtering
   */
  async listMilestonesByProduct(
    productId: string,
    filters?: MilestoneFilters
  ): Promise<ProductMilestoneWithProgress[]> {
    let query = supabase
      .from('product_milestones')
      .select('*')
      .eq('product_id', productId)
      .is('archived_at', null)
      .order('target_date', { ascending: true });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.quarter?.length) {
      query = query.in('quarter', filters.quarter);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with progress
    return Promise.all(
      (data || []).map(async (m) => {
        const progress = await this.calculateProgress(m.id);
        const linkedBRs = await this.getLinkedBRs(m.id);

        return {
          ...this.mapToDomain(m),
          linkedBRCount: linkedBRs.length,
          linkedBRs,
          linkedFeatures: [],
          progressPercent: progress.progressPercent,
          healthStatus: this.determineHealth(this.mapToDomain(m), progress),
        } as ProductMilestoneWithProgress;
      })
    );
  }

  /**
   * Update milestone
   */
  async updateMilestone(id: string, input: UpdateMilestoneInput): Promise<ProductMilestone> {
    // A-lite: product_milestones.status IS the canonical store. Capture current
    // status before write so the advisory audit has a meaningful "from" value.
    let prevStatus: string | null = null;
    if (input.status !== undefined) {
      const { data: cur } = await supabase
        .from('product_milestones').select('status').eq('id', id).maybeSingle();
      prevStatus = (cur as any)?.status ?? null;
    }

    const { data, error } = await supabase
      .from('product_milestones')
      .update({
        title: input.title,
        quarter: input.quarter,
        start_date: input.startDate,
        target_date: input.targetDate,
        status: input.status,
        description: input.description,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Advisory audit for status changes. Canonical key = the status value (A-lite).
    if (input.status !== undefined && prevStatus !== input.status) {
      recordAdvisoryStatusChange({
        entityKey: 'product_milestone', entityId: id, projectKey: null,
        fromStatusRaw: prevStatus, toStatusRaw: input.status ?? null,
        sourceSurface: 'milestone_manager',
      }).catch(() => {/* advisory — non-blocking */});
    }

    return this.mapToDomain(data);
  }

  /**
   * Archive milestone
   */
  async archiveMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_milestones')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Link Business Request to Milestone
   */
  async linkBRToMilestone(
    brId: string,
    milestoneId: string,
    phase?: number,
    isPrimary?: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('business_request_milestone_links')
      .insert({
        business_request_id: brId,
        milestone_id: milestoneId,
        sequence_in_milestone: phase || 1,
        is_primary: isPrimary || false,
      });

    if (error) throw error;
  }

  /**
   * Unlink Business Request from Milestone
   */
  async unlinkBRFromMilestone(brId: string, milestoneId: string): Promise<void> {
    const { error } = await supabase
      .from('business_request_milestone_links')
      .delete()
      .eq('business_request_id', brId)
      .eq('milestone_id', milestoneId);

    if (error) throw error;
  }

  /**
   * Calculate milestone progress from linked features
   */
  async calculateProgress(milestoneId: string): Promise<MilestoneProgress> {
    const { data, error } = await supabase
      .from('business_request_milestone_links')
      .select(
        `
        business_request_id,
        business_requests(id)
      `
      )
      .eq('milestone_id', milestoneId);

    if (error) throw error;

    // Simplified calculation; would normally aggregate feature status
    const totalBRs = data?.length || 0;

    return {
      totalFeatures: totalBRs,
      completedFeatures: 0,
      inProgressFeatures: 0,
      notStartedFeatures: 0,
      progressPercent: 0,
    };
  }

  /**
   * Determine health status
   */
  private determineHealth(
    milestone: ProductMilestone,
    progress: MilestoneProgress
  ): 'on_track' | 'at_risk' | 'off_track' {
    const today = new Date();
    const targetDate = new Date(milestone.targetDate);

    if (milestone.status === 'completed' || milestone.status === 'delivered') {
      return 'on_track';
    }

    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 14 && progress.progressPercent < 100) {
      return 'at_risk';
    }

    if (daysRemaining < 0 && progress.progressPercent < 100) {
      return 'off_track';
    }

    return 'on_track';
  }

  // Private helpers
  private mapToDomain(data: any): ProductMilestone {
    return {
      id: data.id,
      key: data.key,
      title: data.title,
      productId: data.product_id,
      quarter: data.quarter,
      startDate: data.start_date,
      targetDate: data.target_date,
      status: data.status,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      archivedAt: data.archived_at,
    };
  }

  private async getMilestoneBase(id: string): Promise<ProductMilestone> {
    const { data, error } = await supabase
      .from('product_milestones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  private async getLinkedBRs(
    milestoneId: string
  ): Promise<Array<{ id: string; key: string; title: string }>> {
    const { data, error } = await supabase
      .from('business_request_milestone_links')
      .select('business_requests(id, request_key, title)')
      .eq('milestone_id', milestoneId);

    if (error) throw error;

    return (data || []).map((link: any) => ({
      id: link.business_requests.id,
      key: link.business_requests.request_key,
      title: link.business_requests.title,
    }));
  }
}

export const productMilestoneService = new ProductMilestoneService();
