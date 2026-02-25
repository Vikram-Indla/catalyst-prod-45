/**
 * Product Roadmap — Database-wired data hooks
 * All data from ph_roadmap_initiatives_view, ph_roadmap_summary_view, ph_initiative_milestones
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RoadmapInitiative, RoadmapStats, RoadmapMilestone } from '../types/roadmap.types';

// ── Status mapping: DB enum → UI label ──
const STATUS_MAP: Record<string, RoadmapInitiative['status']> = {
  in_progress: 'Active',
  approved: 'Active',
  under_review: 'Planned',
  new_demand: 'Planned',
  delivered: 'Completed',
  closed: 'Completed',
  cancelled: 'Cancelled',
};

// ── Type mapping: DB key → UI type ──
const TYPE_MAP: Record<string, RoadmapInitiative['type']> = {
  project: 'project',
  enhancement: 'enhancement',
  improvement: 'improvement',
};

// ── Color fallback for owners ──
const OWNER_PALETTE = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#E11D48', '#059669'];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function splitTitle(title: string): { titleAr: string; titleEn: string } {
  const sep = title.indexOf(' - ');
  if (sep > 0) {
    return { titleAr: title.slice(0, sep).trim(), titleEn: title.slice(sep + 3).trim() };
  }
  return { titleAr: title, titleEn: title };
}

function ownerColor(id: string | null): string {
  if (!id) return '#94A3B8';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return OWNER_PALETTE[Math.abs(hash) % OWNER_PALETTE.length];
}

// ── Fetch profiles for owner resolution ──
async function fetchProfiles(): Promise<Map<string, { name: string; avatar: string | null }>> {
  const { data } = await (supabase as any).from('profiles').select('id, full_name, avatar_url');
  const map = new Map<string, { name: string; avatar: string | null }>();
  if (data) {
    for (const p of data) {
      map.set(p.id, { name: p.full_name || 'Unassigned', avatar: p.avatar_url });
    }
  }
  return map;
}

// ── Fetch milestones for all roadmap initiatives ──
async function fetchMilestones(): Promise<Map<string, RoadmapMilestone[]>> {
  const { data } = await (supabase as any)
    .from('ph_initiative_milestones')
    .select('id, initiative_id, title, planned_date, status, sort_order')
    .order('sort_order', { ascending: true });

  const map = new Map<string, RoadmapMilestone[]>();
  if (data) {
    for (const m of data) {
      const arr = map.get(m.initiative_id) || [];
      arr.push({
        id: m.id,
        title: m.title,
        targetDate: m.planned_date,
        completed: m.status === 'completed',
      });
      map.set(m.initiative_id, arr);
    }
  }
  return map;
}

// ══════════════════════════════════════════
// useRoadmapInitiatives — main data hook
// ══════════════════════════════════════════
export function useRoadmapInitiatives() {
  return useQuery({
    queryKey: ['roadmap-initiatives'],
    queryFn: async (): Promise<RoadmapInitiative[]> => {
      const [{ data, error }, profiles, milestones] = await Promise.all([
        (supabase as any)
          .from('ph_roadmap_initiatives_view')
          .select('*')
          .eq('on_roadmap', true)
          .eq('is_deleted', false)
          .order('roadmap_sort_order', { ascending: true }),
        fetchProfiles(),
        fetchMilestones(),
      ]);

      if (error) throw error;
      if (!data) return [];

      return data.map((row: any): RoadmapInitiative => {
        const { titleAr, titleEn } = splitTitle(row.title || '');
        const ownerId = row.assignee_id || row.business_owner_id;
        const ownerProfile = ownerId ? profiles.get(ownerId) : null;
        const ownerName = ownerProfile?.name || 'Unassigned';

        return {
          id: row.id,
          initiativeKey: row.initiative_key || '',
          title: row.title || '',
          titleAr,
          titleEn,
          type: TYPE_MAP[row.initiative_type_key] || 'project',
          priority: row.roadmap_priority === 1 ? 'P0' : row.roadmap_priority === 2 ? 'P1' : 'P2',
          status: STATUS_MAP[row.status] || 'Planned',
          progress: row.progress ?? 0,
          startDate: row.roadmap_start_date || row.kickoff_date || row.created_at?.slice(0, 10) || '',
          endDate: row.roadmap_end_date || row.target_complete || '',
          ownerName,
          ownerInitials: getInitials(ownerName),
          ownerColor: ownerColor(ownerId),
          starred: false,
          milestones: milestones.get(row.id) || [],
        };
      });
    },
  });
}

// ══════════════════════════════════════════
// useRoadmapStats — summary KPI hook
// ══════════════════════════════════════════
export function useRoadmapStats() {
  return useQuery({
    queryKey: ['roadmap-stats'],
    queryFn: async (): Promise<RoadmapStats> => {
      const { data, error } = await (supabase as any)
        .from('ph_roadmap_summary_view')
        .select('*')
        .single();

      if (error) throw error;

      const now = new Date();
      const q = Math.ceil((now.getMonth() + 1) / 3);

      return {
        totalOnRoadmap: Number(data.total_on_roadmap) || 0,
        totalInitiatives: Number(data.total_initiatives) || 0,
        activeCount: Number(data.active_count) || 0,
        validationCount: Number(data.validation_count) || 0,
        projectCount: Number(data.roadmap_projects) || 0,
        enhancementCount: Number(data.roadmap_enhancements) || 0,
        improvementCount: Number(data.roadmap_improvements) || 0,
        currentQuarter: `Q${q} ${now.getFullYear()}`,
      };
    },
  });
}

// ══════════════════════════════════════════
// useBacklogItemsNotOnRoadmap — for AddInitiativeModal
// ══════════════════════════════════════════
export function useBacklogItemsNotOnRoadmap() {
  return useQuery({
    queryKey: ['backlog-not-on-roadmap'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_initiatives')
        .select('id, initiative_key, title, initiative_type_id')
        .eq('on_roadmap', false)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: types } = await (supabase as any)
        .from('initiative_types')
        .select('id, key');

      const typeMap = new Map<string, string>();
      if (types) {
        for (const t of types) typeMap.set(t.id, t.key);
      }

      return (data || []).map((row: any) => {
        const { titleAr, titleEn } = splitTitle(row.title || '');
        return {
          id: row.id,
          key: row.initiative_key || '',
          title: titleEn,
          titleAr,
          type: (typeMap.get(row.initiative_type_id) || 'project') as RoadmapInitiative['type'],
        };
      });
    },
  });
}

// ══════════════════════════════════════════
// useAddToRoadmap — flags existing item
// ══════════════════════════════════════════
export function useAddToRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (initiativeId: string) => {
      const { error } = await (supabase as any)
        .from('ph_initiatives')
        .update({ on_roadmap: true, roadmap_added_at: new Date().toISOString() })
        .eq('id', initiativeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-stats'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-not-on-roadmap'] });
    },
  });
}

// ══════════════════════════════════════════
// useRemoveFromRoadmap — unflags existing item
// ══════════════════════════════════════════
export function useRemoveFromRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (initiativeId: string) => {
      const { error } = await (supabase as any)
        .from('ph_initiatives')
        .update({ on_roadmap: false })
        .eq('id', initiativeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-stats'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-not-on-roadmap'] });
    },
  });
}

// ══════════════════════════════════════════
// useUpdateInitiative — update progress/status/dates
// ══════════════════════════════════════════
export function useUpdateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from('ph_initiatives')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-stats'] });
    },
  });
}

// ══════════════════════════════════════════
// Convenience wrapper used by ProductRoadmapPage
// ══════════════════════════════════════════
export function useRoadmapData() {
  const { data: initiatives = [], isLoading: initLoading, error: initError } = useRoadmapInitiatives();
  const { data: stats, isLoading: statsLoading, error: statsError } = useRoadmapStats();

  const defaultStats: RoadmapStats = {
    totalOnRoadmap: 0, totalInitiatives: 0, activeCount: 0, validationCount: 0,
    projectCount: 0, enhancementCount: 0, improvementCount: 0,
    currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
  };

  return {
    initiatives,
    stats: stats || defaultStats,
    isLoading: initLoading || statsLoading,
    error: initError || statsError,
  };
}
