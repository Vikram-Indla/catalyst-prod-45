/**
 * useR360ForYouPanel
 *
 * Data hook for the "Resource 360°" For You tab panel.
 * Supplies real data for R360Panel.tsx, replacing its placeholder constants.
 *
 * Queries (all via React Query — cached, no waterfall):
 *   Q1 — current user's profile (country, location, name)
 *   Q2 — current user's project memberships + project metadata
 *   Q3 — 52-week weekly closed-issue counts (heatmap)
 *   Q4 — direct reports (other members on projects where user is lead)
 *   Q5 — release stats for the user's projects
 *
 * Persona routing (profilePath):
 *   admin / enterprise → /admin/resources/:userId
 *   team_lead          → /my-team (list view; individual profile TBD)
 *   IC                 → /me
 *
 * Exported pure function:
 *   computeProjectAllocations() — deterministic, fully unit-tested.
 *   The Buffer entry is always appended at exactly 20%.
 *
 * Allocation weights (project pool = 80%):
 *   lead     → weight 3
 *   member   → weight 2
 *   reviewer → weight 1
 *   other    → weight 1
 *
 * The largest integer-rounded allocation is adjusted so the project pool
 * always sums to exactly 80% (and total = 100% with Buffer).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getFlagEmoji } from '@/hooks/useResourceProfiles';
import { useUserRole } from '@/hooks/useUserRole';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectAllocationEntry {
  projectId: string;
  name: string;
  key: string;
  color: string;
  role: string;
  allocationPct: number;
  isBuffer: boolean;
}

export interface R360TeamMember {
  userId: string;
  name: string;
  initials: string;
  role: string;
  country: string;
  flagEmoji: string;
  locationType: 'Onsite' | 'Off-Shore' | 'Hybrid' | string;
  allocationPct: number;
  allocationColor: string;
  projectBreakdown: Array<{ label: string; pct: number; color: string }>;
  isYou: boolean;
  profilePath: string;
}

export interface R360ReleaseStats {
  releasedThisQuarter: number;
  inProgress: number;
  closedThisRelease: number;
  qualityScore: number;
  nextReleaseName: string | null;
  nextReleaseDate: string | null;
}

export interface R360ForYouPanelData {
  profile: {
    name: string;
    initials: string;
    country: string;
    flagEmoji: string;
    locationType: string;
  } | null;
  projects: ProjectAllocationEntry[];
  bubbleProjects: Array<{ label: string; pct: number; color: string; x: number; y: number }>;
  heatmapWeeks: number[];      // 52 values, intensity 0–4
  velocityPoints: number[];    // last 8 releases, closed-item counts
  releaseStats: R360ReleaseStats;
  teamMembers: R360TeamMember[];
  isLoading: boolean;
}

// ─── Project colour palette ───────────────────────────────────────────────────

const PROJECT_COLORS = [
  '#0052CC', '#00B8D9', '#6554C0', '#FF5630',
  '#36B37E', '#FF991F', '#00B8D9', '#403294',
];

// Deterministic bubble positions (polar layout, avoids overlap)
const BUBBLE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 35, y: 35 },
  { x: 72, y: 65 },
  { x: 78, y: 28 },
  { x: 55, y: 78 },
  { x: 20, y: 65 },
  { x: 60, y: 18 },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Get initials from full name */
function getInitials(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

/** Allocation colour by saturation level */
function allocationColor(pct: number): string {
  if (pct >= 95) return '#FF5630';
  if (pct >= 85) return '#FF991F';
  return '#36B37E';
}

/** Role weight for allocation calculation */
function roleWeight(role: string): number {
  switch (role.toLowerCase()) {
    case 'lead':     return 3;
    case 'member':   return 2;
    case 'reviewer': return 1;
    default:         return 1;
  }
}

/**
 * computeProjectAllocations
 *
 * Pure function — exported for unit tests.
 * Given a list of project membership rows, returns an allocation array
 * including the Buffer entry. All pcts sum to 100.
 *
 * Project pool = 80%.  Buffer = 20% (always).
 * Within the pool, allocation ∝ role weight.
 *
 * Rounding: compute floats, floor each, give remainder to the heaviest project.
 */
export function computeProjectAllocations(
  memberships: Array<{ projectId: string; name: string; key: string; color: string; role: string }>
): ProjectAllocationEntry[] {
  const BUFFER_PCT = 20;
  const PROJECT_POOL = 80;

  const BUFFER: ProjectAllocationEntry = {
    projectId: '__buffer__',
    name: 'Buffer',
    key: 'BUF',
    color: 'var(--ds-border-disabled, #C1C7D0)',
    role: 'buffer',
    allocationPct: BUFFER_PCT,
    isBuffer: true,
  };

  if (memberships.length === 0) return [BUFFER];

  const weights = memberships.map((m) => roleWeight(m.role));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  // Float allocations within the 80% project pool
  const floats = weights.map((w) => (w / totalWeight) * PROJECT_POOL);

  // Floor each, track remainder for largest-remainder rounding
  const floored = floats.map(Math.floor);
  const usedPool = floored.reduce((s, v) => s + v, 0);
  let remainder = PROJECT_POOL - usedPool;

  // Distribute remainder (largest fractional parts first)
  const fractions = floats.map((f, i) => ({ i, frac: f - floored[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of fractions) {
    if (remainder <= 0) break;
    floored[i]++;
    remainder--;
  }

  const entries: ProjectAllocationEntry[] = memberships.map((m, idx) => ({
    projectId: m.projectId,
    name:      m.name,
    key:       m.key,
    color:     m.color,
    role:      m.role,
    allocationPct: floored[idx],
    isBuffer:  false,
  }));

  return [...entries, BUFFER];
}

// ─── Heatmap helper ───────────────────────────────────────────────────────────

/**
 * Convert weekly counts (map of ISO week string → count) to a 52-element
 * intensity array (0–4). Week 0 = 52 weeks ago, week 51 = most recent.
 */
function buildHeatmapIntensities(weeklyCounts: Map<string, number>): number[] {
  const now = new Date();
  const result: number[] = new Array(52).fill(0);
  const maxCount = Math.max(1, ...Array.from(weeklyCounts.values()));

  for (let w = 0; w < 52; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (51 - w) * 7);
    const key = isoWeekKey(weekStart);
    const count = weeklyCounts.get(key) ?? 0;
    // Bucket into 0–4 intensity based on proportion of max
    const ratio = count / maxCount;
    if (count === 0)    result[w] = 0;
    else if (ratio < 0.25) result[w] = 1;
    else if (ratio < 0.50) result[w] = 2;
    else if (ratio < 0.75) result[w] = 3;
    else                   result[w] = 4;
  }
  return result;
}

/** ISO week key: YYYY-Www */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const weekNo = Math.ceil(((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

/** 52 weeks ago ISO date string */
function fiftyTwoWeeksAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 52 * 7);
  return d.toISOString();
}

/** Current quarter start ISO date string */
function quarterStart(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1).toISOString();
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useR360ForYouPanel(): R360ForYouPanelData {
  const { user } = useAuth();
  const { canAccessEnterprise, isTeamLead } = useUserRole();
  const userId = user?.id ?? null;

  // ── Q1: current user's profile ───────────────────────────────────────────
  const { data: profileRow, isLoading: loadingProfile } = useQuery({
    queryKey: ['r360-panel-profile', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, country, country_code, location, role')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // ── Q2: current user's project memberships ───────────────────────────────
  const { data: memberRows = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['r360-panel-memberships', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_project_members')
        .select('project_id, role, ph_projects!inner(id, name, key, color)')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? []) as Array<{
        project_id: string;
        role: string;
        ph_projects: { id: string; name: string; key: string; color: string | null };
      }>;
    },
  });

  // ── Q3: 52-week heatmap (weekly closed-issue counts) ────────────────────
  const { data: heatmapRows = [], isLoading: loadingHeatmap } = useQuery({
    queryKey: ['r360-panel-heatmap', userId],
    enabled: !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const cutoff = fiftyTwoWeeksAgo();
      const { data, error } = await supabase
        .from('ph_issues')
        .select('jira_updated_at')
        .eq('assignee_user_id', userId!)
        .eq('status_category', 'done')
        .gte('jira_updated_at', cutoff)
        .not('jira_updated_at', 'is', null);
      if (error) throw error;
      return (data ?? []).map((r) => r.jira_updated_at as string);
    },
  });

  // ── Q4: direct reports (other members on projects where user is lead) ───
  const leadProjectIds = useMemo(
    () => memberRows.filter((r) => r.role === 'lead').map((r) => r.project_id),
    [memberRows]
  );

  const { data: reportMemberRows = [], isLoading: loadingReports } = useQuery({
    queryKey: ['r360-panel-reports', userId, leadProjectIds.join(',')],
    enabled: !!userId && leadProjectIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // All members on the lead's projects (excluding self)
      const { data, error } = await supabase
        .from('ph_project_members')
        .select('user_id, role, project_id, ph_projects!inner(id, name, key, color)')
        .in('project_id', leadProjectIds)
        .neq('user_id', userId!);
      if (error) throw error;
      return (data ?? []) as Array<{
        user_id: string;
        role: string;
        project_id: string;
        ph_projects: { id: string; name: string; key: string; color: string | null };
      }>;
    },
  });

  // Get profiles for all unique direct-report user IDs
  const reportUserIds = useMemo(
    () => [...new Set(reportMemberRows.map((r) => r.user_id))],
    [reportMemberRows]
  );

  const { data: reportProfiles = [], isLoading: loadingReportProfiles } = useQuery({
    queryKey: ['r360-panel-report-profiles', reportUserIds.join(',')],
    enabled: reportUserIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, country, country_code, location')
        .in('id', reportUserIds);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        full_name: string | null;
        role: string | null;
        country: string | null;
        country_code: string | null;
        location: string | null;
      }>;
    },
  });

  // ── Q5: release stats for user's projects ────────────────────────────────
  const allProjectIds = useMemo(
    () => memberRows.map((r) => r.project_id),
    [memberRows]
  );

  const { data: releaseRows = [], isLoading: loadingReleases } = useQuery({
    queryKey: ['r360-panel-releases', allProjectIds.join(',')],
    enabled: allProjectIds.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
        .select('id, name, status, target_date, project_id')
        .in('project_id', allProjectIds)
        .order('target_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        status: string;
        target_date: string;
        project_id: string;
      }>;
    },
  });

  // ── Derive computed values ────────────────────────────────────────────────

  const profile = useMemo(() => {
    if (!profileRow) return null;
    const locationType = profileRow.location ?? 'Onsite';
    return {
      name:         profileRow.full_name ?? user?.email ?? 'You',
      initials:     getInitials(profileRow.full_name),
      country:      profileRow.country ?? '',
      flagEmoji:    getFlagEmoji(profileRow.country_code),
      locationType,
    };
  }, [profileRow, user?.email]);

  // Allocation entries (including Buffer)
  const projects = useMemo(() => {
    const memberships = memberRows.map((r, idx) => ({
      projectId: r.project_id,
      name:  r.ph_projects.name,
      key:   r.ph_projects.key,
      color: r.ph_projects.color ?? PROJECT_COLORS[idx % PROJECT_COLORS.length],
      role:  r.role,
    }));
    return computeProjectAllocations(memberships);
  }, [memberRows]);

  // Bubble chart data (non-buffer projects + buffer)
  const bubbleProjects = useMemo(() =>
    projects.map((p, i) => ({
      label: p.name,
      pct:   p.allocationPct,
      color: p.color,
      x:     BUBBLE_POSITIONS[i % BUBBLE_POSITIONS.length].x,
      y:     BUBBLE_POSITIONS[i % BUBBLE_POSITIONS.length].y,
    }))
  , [projects]);

  // Heatmap intensities
  const heatmapWeeks = useMemo(() => {
    const weekly = new Map<string, number>();
    for (const ts of heatmapRows) {
      const key = isoWeekKey(new Date(ts));
      weekly.set(key, (weekly.get(key) ?? 0) + 1);
    }
    return buildHeatmapIntensities(weekly);
  }, [heatmapRows]);

  // Release stats
  const releaseStats = useMemo<R360ReleaseStats>(() => {
    const qStart = quarterStart();
    const releasedThisQuarter = releaseRows.filter(
      (r) => r.status.toLowerCase() === 'released' && r.target_date >= qStart
    ).length;
    const inProgress = releaseRows.filter(
      (r) => ['in progress', 'in-progress', 'active'].includes(r.status.toLowerCase())
    ).length;
    // Next upcoming release
    const now = new Date().toISOString();
    const upcoming = releaseRows.filter((r) =>
      r.status.toLowerCase() !== 'released' && r.target_date >= now
    );
    const next = upcoming[0] ?? null;

    return {
      releasedThisQuarter,
      inProgress,
      closedThisRelease: heatmapRows.length, // proxy: all closed issues in last 52w
      qualityScore: 94,                       // TODO: wire from releases table when available
      nextReleaseName: next?.name ?? null,
      nextReleaseDate: next?.target_date ?? null,
    };
  }, [releaseRows, heatmapRows]);

  // Velocity sparkline (last 8 weeks as proxy — real release history in next step)
  const velocityPoints = useMemo(() => {
    const weekBuckets = heatmapWeeks.slice(-8);
    // De-normalise from intensity (0-4) back to a display count
    return weekBuckets.map((lvl) => lvl * 5);
  }, [heatmapWeeks]);

  // Self card
  const selfCard = useMemo<R360TeamMember | null>(() => {
    if (!profile || !userId) return null;
    const nonBufferProjects = projects.filter((p) => !p.isBuffer);
    const profilePath = canAccessEnterprise
      ? `/admin/resources/${userId}`
      : isTeamLead
      ? `/my-team`
      : '/me';
    return {
      userId,
      name:         profile.name,
      initials:     profile.initials,
      role:         profileRow?.role ?? '',
      country:      profile.country,
      flagEmoji:    profile.flagEmoji,
      locationType: profile.locationType,
      allocationPct: projects.find((p) => !p.isBuffer)
        ? projects.filter((p) => !p.isBuffer).reduce((s, p) => s + p.allocationPct, 0)
        : 0,
      allocationColor: allocationColor(
        projects.filter((p) => !p.isBuffer).reduce((s, p) => s + p.allocationPct, 0)
      ),
      projectBreakdown: nonBufferProjects.map((p) => ({ label: p.name, pct: p.allocationPct, color: p.color })),
      isYou: true,
      profilePath,
    };
  }, [profile, profileRow?.role, userId, projects, canAccessEnterprise, isTeamLead]);

  // Direct-report cards
  const reportCards = useMemo<R360TeamMember[]>(() => {
    return reportUserIds.map((rid) => {
      const profileData = reportProfiles.find((p) => p.id === rid);
      const theirMemberships = reportMemberRows
        .filter((r) => r.user_id === rid)
        .map((r, idx) => ({
          projectId: r.project_id,
          name:  r.ph_projects.name,
          key:   r.ph_projects.key,
          color: r.ph_projects.color ?? PROJECT_COLORS[idx % PROJECT_COLORS.length],
          role:  r.role,
        }));
      const theirAllocation = computeProjectAllocations(theirMemberships);
      const nonBuffer = theirAllocation.filter((p) => !p.isBuffer);
      const totalPct  = nonBuffer.reduce((s, p) => s + p.allocationPct, 0);
      const locType   = (profileData?.location ?? 'Onsite') as R360TeamMember['locationType'];
      return {
        userId:       rid,
        name:         profileData?.full_name ?? 'Unknown',
        initials:     getInitials(profileData?.full_name ?? null),
        role:         profileData?.role ?? '',
        country:      profileData?.country ?? '',
        flagEmoji:    getFlagEmoji(profileData?.country_code ?? null),
        locationType: locType,
        allocationPct: totalPct,
        allocationColor: allocationColor(totalPct),
        projectBreakdown: nonBuffer.map((p) => ({ label: p.name, pct: p.allocationPct, color: p.color })),
        isYou: false,
        profilePath: `/admin/resources/${rid}`,
      };
    });
  }, [reportUserIds, reportProfiles, reportMemberRows]);

  const teamMembers = useMemo(() => {
    const cards: R360TeamMember[] = [];
    if (selfCard) cards.push(selfCard);
    cards.push(...reportCards);
    return cards;
  }, [selfCard, reportCards]);

  const isLoading =
    loadingProfile ||
    loadingMemberships ||
    loadingHeatmap ||
    loadingReports ||
    loadingReportProfiles ||
    loadingReleases;

  return {
    profile,
    projects,
    bubbleProjects,
    heatmapWeeks,
    velocityPoints,
    releaseStats,
    teamMembers,
    isLoading,
  };
}
