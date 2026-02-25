import { supabase } from '@/integrations/supabase/client';

export const resource360MdService = {

  async getMember(memberId: string) {
    const { data, error } = await supabase
      .from('r360md_members' as any)
      .select('*')
      .eq('id', memberId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getChronology(memberId: string, filters?: {
    status_ids?: string[];
    project_ids?: string[];
    item_types?: string[];
    search?: string;
    pending_only?: boolean;
  }) {
    let query = supabase
      .from('r360md_chronology_view' as any)
      .select('*')
      .eq('assignee_id', memberId);

    if (filters?.status_ids?.length) {
      query = query.in('status_name', filters.status_ids);
    }
    if (filters?.project_ids?.length) {
      query = query.in('project_key', filters.project_ids);
    }
    if (filters?.item_types?.length) {
      query = query.in('item_type', filters.item_types);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters?.pending_only) {
      query = query.neq('status_category', 'completed');
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getMemberKpis(memberId: string) {
    const { data, error } = await supabase
      .from('r360md_member_kpis_view' as any)
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getDateGroupStats() {
    const { data, error } = await supabase
      .from('r360md_date_group_stats_view' as any)
      .select('*')
      .order('group_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getSiblings(parentItemKey: string) {
    // First check if parent is a Story — only show siblings for Story parents
    const { data: parentData } = await supabase
      .from('ph_issues' as any)
      .select('issue_type')
      .eq('issue_key', parentItemKey)
      .limit(1)
      .single();
    
    const parentType = (parentData as any)?.issue_type || '';
    if (!parentType.toLowerCase().includes('story')) {
      return { siblings: [], parentType };
    }

    const { data, error } = await supabase
      .from('r360md_chronology_view' as any)
      .select('*')
      .eq('parent_key', parentItemKey)
      .order('item_key', { ascending: true });
    if (error) throw error;
    return { siblings: data || [], parentType };
  },

  async getAllMembers() {
    const { data, error } = await supabase
      .from('r360md_members' as any)
      .select('*')
      .eq('is_active', true)
      .order('full_name');
    if (error) throw error;
    return data || [];
  },
};
