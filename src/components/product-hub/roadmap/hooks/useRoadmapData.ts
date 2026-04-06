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
  
  entity_integration: 'entity_integration',
};

// ── Color fallback for owners — deterministic from name ──
const OWNER_PALETTE = ['#2563EB', '#7C3AED', '#0D9488', '#EC4899', '#D97706', '#059669', '#E11D48', '#6366F1'];

function getInitials(name: string): string {
  if (!name || name === 'Unassigned') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function splitTitle(title: string): { titleAr: string; titleEn: string } {
  // Check for Arabic characters
  const hasArabic = /[\u0600-\u06FF]/.test(title);
  const sep = title.indexOf(' - ');
  if (sep > 0) {
    const left = title.slice(0, sep).trim();
    const right = title.slice(sep + 3).trim();
    const leftAr = /[\u0600-\u06FF]/.test(left);
    return leftAr ? { titleAr: left, titleEn: right || left } : { titleAr: right, titleEn: left || right };
  }
  if (hasArabic) return { titleAr: title, titleEn: title };
  return { titleAr: '', titleEn: title };
}

function ownerColorFromName(name: string): string {
  if (!name || name === 'Unassigned') return '#94A3B8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return OWNER_PALETTE[Math.abs(hash) % OWNER_PALETTE.length];
}

// ── Default dates: spread initiatives across 2026 when dates are missing ──
function getDefaultDates(index: number): { startDate: string; endDate: string } {
  const startMonth = Math.min(index * 2, 10);
  const start = new Date(2026, startMonth, 1);
  const end = new Date(2026, startMonth + 3, 0); // last day of 3rd month
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

// ── Fetch current user's favorites ──
async function fetchFavoriteIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await (supabase as any)
    .from('ph_user_favorites')
    .select('initiative_id')
    .eq('user_id', user.id);
  return new Set((data || []).map((r: any) => r.initiative_id));
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

// ── Try to resolve owner name from the Jira title or issue data ──
async function fetchIssueOwners(): Promise<Map<string, string>> {
  // Fetch all issue owners — must override default 1000-row limit
  const { data } = await (supabase as any)
    .from('ph_issues')
    .select('issue_key, assignee_display_name')
    .not('assignee_display_name', 'is', null)
    .limit(5000);
  const map = new Map<string, string>();
  if (data) {
    for (const d of data) {
      map.set(d.issue_key, d.assignee_display_name);
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
      const [{ data, error }, profiles, milestones, issueOwners, favoriteIds] = await Promise.all([
        (supabase as any)
          .from('ph_roadmap_initiatives_view')
          .select('*')
          .eq('on_roadmap', true)
          .eq('is_deleted', false)
          .order('roadmap_sort_order', { ascending: true }),
        fetchProfiles(),
        fetchMilestones(),
        fetchIssueOwners(),
        fetchFavoriteIds(),
      ]);

      if (error) throw error;
      if (!data) return [];

      return data.map((row: any, index: number): RoadmapInitiative => {
        const { titleAr, titleEn } = splitTitle(row.title || '');
        
        // Resolve owner: try assignee_id → business_owner_id → Jira assignee → fallback
        const ownerId = row.assignee_id || row.business_owner_id;
        const ownerProfile = ownerId ? profiles.get(ownerId) : null;
        const jiraOwner = issueOwners.get(row.initiative_key);
        const ownerName = ownerProfile?.name || jiraOwner || 'Unassigned';

        // Resolve dates with fallback
        const rawStart = row.roadmap_start_date || row.kickoff_date || null;
        const rawEnd = row.roadmap_end_date || row.target_complete || null;
        const hasRealEndDate = !!rawEnd;
        
        let startDate: string;
        let endDate: string;
        if (rawStart) {
          startDate = rawStart;
          if (rawEnd) {
            endDate = rawEnd;
            // If end < start (data integrity issue), swap them
            if (new Date(endDate) < new Date(startDate)) {
              const tmp = startDate;
              startDate = endDate;
              endDate = tmp;
            }
          } else {
            const fallback = new Date(rawStart);
            fallback.setMonth(fallback.getMonth() + 3);
            endDate = fallback.toISOString().slice(0, 10);
          }
        } else {
          // No start date — use today and add 3 months
          const today = new Date();
          startDate = today.toISOString().slice(0, 10);
          if (rawEnd) {
            endDate = rawEnd;
            if (new Date(endDate) < new Date(startDate)) {
              startDate = endDate;
              const fallback = new Date(startDate);
              fallback.setMonth(fallback.getMonth() + 3);
              endDate = fallback.toISOString().slice(0, 10);
            }
          } else {
            const fallback = new Date(today);
            fallback.setMonth(fallback.getMonth() + 3);
            endDate = fallback.toISOString().slice(0, 10);
          }
        }

        return {
          id: row.id,
          initiativeKey: row.initiative_key || '',
          title: row.title || '',
          titleAr,
          titleEn: titleEn || row.title || '',
          type: TYPE_MAP[row.initiative_type_key] || 'project',
          priority: row.roadmap_priority === 1 ? 'P0' : row.roadmap_priority === 2 ? 'P1' : 'P2',
          status: STATUS_MAP[row.status] || 'Planned',
          progress: row.progress ?? 0,
          startDate,
          endDate,
          ownerName,
          ownerInitials: getInitials(ownerName),
          ownerColor: ownerColorFromName(ownerName),
          starred: favoriteIds.has(row.id),
          milestones: milestones.get(row.id) || [],
          hasRealEndDate,
          rawDbId: row.id,
          rawStatus: row.status || 'new_demand',
          rawTypeKey: row.initiative_type_key || 'project',
          rawAssigneeId: row.assignee_id || null,
          rawBusinessOwnerId: row.business_owner_id || null,
          rawInitiativeTypeId: row.initiative_type_id || null,
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
        entityIntegrationCount: Number(data.roadmap_entity_integrations) || 0,
        currentQuarter: `Q${q} ${now.getFullYear()}`,
      };
    },
  });
}

// ══════════════════════════════════════════
// useBacklogItemsNotOnRoadmap — queries ph_issues (Jira backlog)
// ══════════════════════════════════════════
export function useBacklogItemsNotOnRoadmap() {
  return useQuery({
    queryKey: ['backlog-not-on-roadmap'],
    queryFn: async () => {
      const { data: issues, error: issuesErr } = await (supabase as any)
        .from('ph_issues')
        .select('issue_key, summary, status, priority, assignee_display_name')
        .eq('issue_type', 'Business Request')
        .order('issue_key', { ascending: true });

      if (issuesErr) throw issuesErr;

      const { data: onRoadmap, error: rmErr } = await (supabase as any)
        .from('ph_initiatives')
        .select('initiative_key')
        .eq('on_roadmap', true)
        .eq('is_deleted', false);

      if (rmErr) throw rmErr;

      const onRoadmapKeys = new Set((onRoadmap || []).map((r: any) => r.initiative_key));

      return (issues || [])
        .map((row: any) => {
          const { titleAr, titleEn } = splitTitle(row.summary || '');
          return {
            id: row.issue_key,
            key: row.issue_key,
            title: titleEn || row.summary,
            titleAr,
            status: row.status || '',
            owner: row.assignee_display_name || '',
            type: 'project' as RoadmapInitiative['type'],
            alreadyOnRoadmap: onRoadmapKeys.has(row.issue_key),
          };
        });
    },
  });
}

// ══════════════════════════════════════════
// useAddToRoadmap
// ══════════════════════════════════════════
export function useAddToRoadmap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (issueKey: string) => {
      const { data: existing } = await (supabase as any)
        .from('ph_initiatives')
        .select('id')
        .eq('initiative_key', issueKey)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('ph_initiatives')
          .update({ on_roadmap: true, roadmap_added_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data: issue, error: fetchErr } = await (supabase as any)
          .from('ph_issues')
          .select('issue_key, summary, status, assignee_display_name')
          .eq('issue_key', issueKey)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!issue) throw new Error('Issue not found');

        const { error: insertErr } = await (supabase as any)
          .from('ph_initiatives')
          .insert({
            initiative_key: issue.issue_key,
            title: issue.summary,
            status: 'new_demand',
            on_roadmap: true,
            roadmap_added_at: new Date().toISOString(),
            progress: 0,
          });

        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-stats'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-not-on-roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
    },
  });
}

// ══════════════════════════════════════════
// useRemoveFromRoadmap
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
// useUpdateInitiative
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
// useToggleRoadmapStar — toggle favorite
// ══════════════════════════════════════════
export function useToggleRoadmapStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ initiativeId, isCurrentlyStarred }: { initiativeId: string; isCurrentlyStarred: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isCurrentlyStarred) {
        const { error } = await (supabase as any)
          .from('ph_user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('initiative_id', initiativeId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('ph_user_favorites')
          .insert({ user_id: user.id, initiative_id: initiativeId });
        if (error) throw error;
      }
    },
    onMutate: async ({ initiativeId, isCurrentlyStarred }) => {
      await queryClient.cancelQueries({ queryKey: ['roadmap-initiatives'] });
      const prev = queryClient.getQueryData<RoadmapInitiative[]>(['roadmap-initiatives']);
      queryClient.setQueryData<RoadmapInitiative[]>(['roadmap-initiatives'], old =>
        (old || []).map(i => i.id === initiativeId ? { ...i, starred: !isCurrentlyStarred } : i)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['roadmap-initiatives'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
    },
  });
}

// ══════════════════════════════════════════
// Convenience wrapper
// ══════════════════════════════════════════
export function useRoadmapData() {
  const { data: initiatives = [], isLoading: initLoading, error: initError } = useRoadmapInitiatives();
  const { data: stats, isLoading: statsLoading, error: statsError } = useRoadmapStats();

  const defaultStats: RoadmapStats = {
    totalOnRoadmap: 0, totalInitiatives: 0, activeCount: 0, validationCount: 0,
    projectCount: 0, enhancementCount: 0, improvementCount: 0, entityIntegrationCount: 0,
    currentQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
  };

  return {
    initiatives,
    stats: stats || defaultStats,
    isLoading: initLoading || statsLoading,
    error: initError || statsError,
  };
}