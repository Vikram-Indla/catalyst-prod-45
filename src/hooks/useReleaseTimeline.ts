/**
 * useReleaseTimeline — Phase 6 §2/§3 data for the Release-Ops timeline/roadmap.
 * Releases + product + scope counts (BR / sprint / work item / change) + status,
 * readiness, and risk markers (empty-release, deployment-gap, missing-product,
 * freeze, emergency, production event, incident). Expansion (BRs / sprints /
 * changes) loads lazily per release. Untyped rh_* → `as any` per repo convention.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineRelease {
  id: string; name: string; version: string | null; slug: string | null; productId: string | null; productName: string | null;
  targetEnv: string | null; status: string; readinessPct: number | null; health: string | null;
  plannedStartDate: string | null; plannedReleaseDate: string | null; releaseManagerId: string | null; productOwnerId: string | null;
  brCount: number; sprintCount: number; workItemCount: number; changeCount: number;
  incidentCount: number; prodEventCount: number;
  hasEmergency: boolean; freezeConflict: boolean;
  isEmptyScope: boolean; hasDeploymentGap: boolean; missingProduct: boolean;
}

export const useReleaseTimeline = () =>
  useQuery({
    queryKey: ['release-hub', 'timeline-ops'],
    staleTime: 15_000,
    queryFn: async (): Promise<TimelineRelease[]> => {
      const { data: rels, error } = await supabase.from('rh_releases').select('*').order('planned_release_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      const releases = (rels ?? []) as any[];
      if (releases.length === 0) return [];
      const ids = releases.map((r) => r.id);

      const countBy = (rows: any[] | null, key = 'release_id') => {
        const m: Record<string, number> = {};
        (rows ?? []).forEach((r: any) => { m[r[key]] = (m[r[key]] ?? 0) + 1; });
        return m;
      };

      const [brRes, spRes, wiRes, linkRes, legacyChgRes, freezeRes, peRes, incRes, prodRes] = await Promise.all([
        supabase.from('rh_release_brs').select('release_id').in('release_id', ids),
        supabase.from('rh_release_sprints').select('release_id').in('release_id', ids),
        supabase.from('rh_release_work_items').select('release_id').in('release_id', ids),
        supabase.from('rh_change_release_links').select('release_id, rh_changes(is_emergency_override, change_type)').in('release_id', ids).is('unlinked_at', null),
        supabase.from('rh_changes').select('id, release_id, is_emergency_override, change_type').in('release_id', ids),
        supabase.from('rh_freeze_windows').select('*'),
        supabase.from('rh_production_events').select('release_id').in('release_id', ids),
        supabase.from('ph_incidents').select('release_id').in('release_id', ids),
        supabase.from('products').select('id, name'),
      ]);

      const brC = countBy(brRes.data as any[]); const spC = countBy(spRes.data as any[]); const wiC = countBy(wiRes.data as any[]);
      const peC = countBy(peRes.data as any[]); const incC = countBy((incRes as any).data as any[]);
      const prodNames: Record<string, string> = {}; ((prodRes.data ?? []) as any[]).forEach((p: any) => { prodNames[p.id] = p.name; });

      // change counts + emergency per release (m2m links + legacy release_id, deduped)
      const chSet: Record<string, Set<string>> = {}; const emg: Record<string, boolean> = {};
      ((linkRes.data ?? []) as any[]).forEach((l: any) => {
        (chSet[l.release_id] ??= new Set()).add(JSON.stringify(l.rh_changes));
        if (l.rh_changes?.is_emergency_override || l.rh_changes?.change_type === 'emergency') emg[l.release_id] = true;
      });
      const legacyChgC: Record<string, number> = {};
      ((legacyChgRes.data ?? []) as any[]).forEach((c: any) => {
        legacyChgC[c.release_id] = (legacyChgC[c.release_id] ?? 0) + 1;
        if (c.is_emergency_override || c.change_type === 'emergency') emg[c.release_id] = true;
      });

      const freezeRows = (freezeRes.data ?? []) as any[];
      const freezeFor = (r: any) => {
        const date = r.planned_release_date ?? r.planned_start_date; if (!date) return false;
        const t = new Date(date).getTime();
        return freezeRows.some((f) => {
          const active = f.is_active !== false && f.status !== 'ended';
          const envMatch = !f.target_env || f.target_env === 'all' || f.target_env === r.target_env;
          const fS = new Date(f.start_at ?? f.start_date).getTime(); const fE = new Date(f.end_at ?? f.end_date).getTime();
          return active && envMatch && t >= fS && t <= fE;
        });
      };

      return releases.map((r) => {
        const changeCount = (chSet[r.id]?.size ?? 0) || (legacyChgC[r.id] ?? 0);
        const brCount = brC[r.id] ?? 0, sprintCount = spC[r.id] ?? 0, workItemCount = wiC[r.id] ?? 0;
        return {
          id: r.id, name: r.name, version: r.version ?? null, slug: r.slug, productId: r.product_id, productName: r.product_id ? (prodNames[r.product_id] ?? null) : null,
          targetEnv: r.target_env, status: r.status, readinessPct: r.readiness_pct, health: r.health,
          plannedStartDate: r.planned_start_date, plannedReleaseDate: r.planned_release_date, releaseManagerId: r.release_manager_id, productOwnerId: r.product_owner_id,
          brCount, sprintCount, workItemCount, changeCount, incidentCount: incC[r.id] ?? 0, prodEventCount: peC[r.id] ?? 0,
          hasEmergency: !!emg[r.id], freezeConflict: freezeFor(r),
          isEmptyScope: brCount === 0 && sprintCount === 0 && workItemCount === 0,
          hasDeploymentGap: changeCount === 0,
          missingProduct: !r.product_id,
        };
      });
    },
  });

export interface ReleaseExpansion {
  brs: Array<{ id: string; key: string | null; title: string; status: string | null; priority: string | null; ownerName: string | null }>;
  sprints: Array<{ id: string; name: string; startDate: string | null; endDate: string | null; status: string | null }>;
  changes: Array<{ id: string; slug: string | null; chgNumber: string; title: string; status: string; risk: string | null; targetEnv: string | null; plannedStartAt: string | null; sopDone: number; sopTotal: number; isEmergency: boolean }>;
}

export const useReleaseExpansion = (releaseId: string | null, legacyReleaseHasChanges = false) =>
  useQuery({
    queryKey: ['release-hub', 'timeline-expansion', releaseId],
    enabled: !!releaseId,
    queryFn: async (): Promise<ReleaseExpansion> => {
      const [brLink, spLink, chLink, legacyCh] = await Promise.all([
        supabase.from('rh_release_brs').select('business_request_id, business_requests(id, title)').eq('release_id', releaseId),
        supabase.from('rh_release_sprints').select('sprint_id, anchor_sprints(id, name, start_date, end_date)').eq('release_id', releaseId),
        supabase.from('rh_change_release_links').select('change_id, rh_changes(id, slug, chg_number, title, status, risk_level, target_env, planned_start_at, is_emergency_override)').eq('release_id', releaseId).is('unlinked_at', null),
        supabase.from('rh_changes').select('id, slug, chg_number, title, status, risk_level, target_env, planned_start_at, is_emergency_override').eq('release_id', releaseId),
      ]);

      const changeMap: Record<string, any> = {};
      ((chLink.data ?? []) as any[]).forEach((l: any) => { if (l.rh_changes) changeMap[l.rh_changes.id] = l.rh_changes; });
      ((legacyCh.data ?? []) as any[]).forEach((c: any) => { changeMap[c.id] = c; });
      const changeIds = Object.keys(changeMap);
      const sop: Record<string, { done: number; total: number }> = {};
      if (changeIds.length) {
        const { data: steps } = await supabase.from('rh_sop_steps').select('change_id, status').in('change_id', changeIds);
        (steps ?? []).forEach((s: any) => { const e = (sop[s.change_id] ??= { done: 0, total: 0 }); e.total += 1; if (s.status === 'done') e.done += 1; });
      }

      return {
        brs: ((brLink.data ?? []) as any[]).map((l: any) => l.business_requests).filter(Boolean).map((b: any) => ({ id: b.id, key: null, title: b.title, status: null, priority: null, ownerName: null })),
        sprints: ((spLink.data ?? []) as any[]).map((l: any) => l.anchor_sprints).filter(Boolean).map((s: any) => ({ id: s.id, name: s.name, startDate: s.start_date, endDate: s.end_date, status: null })),
        changes: changeIds.map((id) => { const c = changeMap[id]; return { id: c.id, slug: c.slug, chgNumber: c.chg_number, title: c.title, status: c.status, risk: c.risk_level, targetEnv: c.target_env, plannedStartAt: c.planned_start_at, sopDone: sop[id]?.done ?? 0, sopTotal: sop[id]?.total ?? 0, isEmergency: c.is_emergency_override === true }; }),
      };
    },
  });
