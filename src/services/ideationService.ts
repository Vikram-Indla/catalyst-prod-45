/**
 * Ideation Module — Supabase Service Layer
 * All database operations for the Ideation module.
 */
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { Idea, IdeaStatus, IdeaType, ImpactFactors } from '@/pages/producthub/ideation/ideation-data';

// ── Status & Type mappers (DB title-case → UI snake_case) ────────
const STATUS_MAP: Record<string, IdeaStatus> = {
  'Draft': 'draft',
  'Submitted': 'submitted',
  'Under Review': 'under_review',
  'Approved': 'approved',
  'Rejected': 'rejected',
  'Converted': 'converted',
};
const STATUS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);

const TYPE_MAP: Record<string, IdeaType> = {
  'Opportunity': 'opportunity',
  'Solution': 'solution',
  'Feature Request': 'feature',
  'Improvement': 'improvement',
  'Problem': 'problem',
};

// ── Assignee color palette ────────────────────────────────────────
const ASSIGNEE_COLORS = ['#0D9488', '#2563EB', '#D97706', '#6366F1', '#E11D48', '#EA580C', '#16A34A', '#7C3AED'];
function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ASSIGNEE_COLORS[Math.abs(hash) % ASSIGNEE_COLORS.length];
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

// ── Transform DB row to Idea ──────────────────────────────────────
function toIdea(row: any): Idea {
  const assigneeName = row.assigned_to_name;

  return {
    key: row.idea_key,
    title: row.title,
    subtitle: '',
    status: STATUS_MAP[row.status] || 'draft',
    type: TYPE_MAP[row.idea_type] || 'feature',
    priority: row.priority || 'P2',
    impact: parseFloat(row.impact_total) || 0,
    votes: row.vote_count || 0,
    initiative: row.linked_initiative_key || null,
    dept: shortenDept(row.department || ''),
    assignee: assigneeName
      ? { name: assigneeName, initials: getInitials(assigneeName), color: pickColor(assigneeName) }
      : null,
    ai: (row.ai_enrichment_status === 'completed' || row.ai_enrichment_status === 'complete') ? 'ready' : row.ai_summary ? 'ready' : 'pending',
    theme: row.theme || null,
    assigned_team: row.assigned_team || null,
    target_release_date: row.target_release_date || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    roadmap_quarter: row.roadmap_quarter || null,
  } as unknown as Idea;
}

function shortenDept(dept: string): string {
  const map: Record<string, string> = {
    'Digital Transformation': 'Digital Trans.',
    'IT Operations': 'IT Ops',
    'Data & Analytics': 'Data & Anal.',
    'Customer Experience': 'Customer Exp.',
    'Risk & Compliance': 'Risk & Comp.',
  };
  return map[dept] || dept;
}

// ── Service ───────────────────────────────────────────────────────
export const ideationService = {

  // === IDEAS: READ ===
  async getIdeas(filters?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<Idea[]> {
    try {
      let query = typedQuery('ph_ideas_listing')
        .select('*')
        .eq('is_deleted', false);

      if (filters?.status && filters.status !== 'all') {
        const dbStatus = STATUS_REVERSE[filters.status];
        if (dbStatus) query = query.eq('status', dbStatus);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,idea_key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.warn('Ideation query error (ph_ideas_listing):', error.message);
        return [];
      }
      return (data ?? []).map(toIdea);
    } catch (e) {
      console.warn('Ideation service error:', e);
      return [];
    }
  },

  async getIdeaRaw(ideaKey: string) {
    const { data, error } = await typedQuery('ph_ideas_listing')
      .select('*')
      .eq('idea_key', ideaKey)
      .single();
    if (error) throw error;
    return data;
  },

  // === IMPACT SCORES (from ph_ideas directly) ===
  async getImpactFactors(ideaKey: string): Promise<ImpactFactors | null> {
    const { data, error } = await supabase
      .from('ph_ideas')
      .select('imperative, ministry_efficiency, pain_severity, alignment, complexity_score, timeframe_score')
      .eq('idea_key', ideaKey)
      .single();
    if (error) return null;
    if (!data) return null;
    return {
      I: parseFloat(data.imperative as any) || 0,
      M: parseFloat(data.ministry_efficiency as any) || 0,
      P: parseFloat(data.pain_severity as any) || 0,
      A: parseFloat(data.alignment as any) || 0,
      C: parseFloat(data.complexity_score as any) || 0,
      T: parseFloat(data.timeframe_score as any) || 0,
    };
  },

  // === ANALYTICS AGGREGATES (from DB views) ===
  async getStatusCounts(): Promise<Record<string, number>> {
    const { data, error } = await typedQuery('ph_ideas_status_counts')
      .select('*');
    if (error) throw error;
    const result: Record<string, number> = {};
    for (const row of (data ?? []) as any[]) {
      const mapped = STATUS_MAP[row.status];
      if (mapped) result[mapped] = row.count;
    }
    return result;
  },

  async getDeptCounts(): Promise<{ name: string; count: number }[]> {
    const { data, error } = await typedQuery('ph_ideas_dept_counts')
      .select('*')
      .order('count', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ name: r.department, count: r.count }));
  },

  async getTopContributors(): Promise<{ name: string; count: number; initials: string }[]> {
    const { data, error } = await typedQuery('ph_ideas_top_contributors')
      .select('*')
      .order('idea_count', { ascending: false })
      .limit(5);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      name: r.full_name || 'Unknown',
      count: r.idea_count || 0,
      initials: r.full_name ? getInitials(r.full_name) : '??',
    }));
  },

  // === INNOVATION DRIVES ===
  async getDrives() {
    const { data, error } = await supabase
      .from('ph_innovation_drives')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },

  async getDriveIdeas(driveId: string) {
    const { data, error } = await typedQuery('ph_ideas')
      .select('idea_key, innovation_drive_id')
      .eq('innovation_drive_id', driveId);
    if (error) throw error;
    return (data ?? []) as { idea_key: string; innovation_drive_id: string }[];
  },

  // === COMMENTS ===
  async getComments(ideaId: string) {
    const { data, error } = await supabase
      .from('ph_idea_comments')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Resolve author profiles in a single batch query
    const comments = data ?? [];
    if (comments.length === 0) return [];

    const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return comments.map((c: any) => ({
      ...c,
      profiles: profileMap.get(c.user_id) || null,
    }));
  },

  async addComment(ideaId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from('ph_idea_comments')
      .insert({ idea_id: ideaId, user_id: userId, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // === VOTES ===
  async castVote(ideaId: string, userId: string, value: 1 | -1) {
    const { data, error } = await supabase
      .from('ph_idea_votes')
      .upsert(
        { idea_id: ideaId, user_id: userId, vote_value: value },
        { onConflict: 'idea_id,user_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // === V2030 ===
  async getV2030Mappings(ideaId: string) {
    const { data, error } = await supabase
      .from('ph_idea_v2030_mappings')
      .select('*')
      .eq('idea_id', ideaId);
    if (error) throw error;
    return data ?? [];
  },

  // === COMPLIANCE ===
  async getComplianceTags(ideaId: string) {
    const { data, error } = await supabase
      .from('ph_idea_compliance_tags')
      .select('*')
      .eq('idea_id', ideaId);
    if (error) throw error;
    return data ?? [];
  },

  // === EVIDENCE ===
  async getEvidence(ideaId: string) {
    const { data, error } = await supabase
      .from('ph_idea_evidence')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};
