/**
 * useMyExecutionWork — Phase 5 personal Release-Ops execution feed for For You.
 *
 * Reads rh_sop_steps assigned to the current user (assignee view) + changes the
 * user manages (manager view), joined with change/release/freeze context, and
 * derives in-app execution prompts (the notification event model). SOP steps are
 * the source of truth — never mirrored into generic work items. Actions reuse
 * useSopStepAction so For You and Change Detail stay in sync.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mapSopStep, type SopStepFull } from '@/hooks/useSopRunbook';

const TECHNICAL = ['frontend', 'backend', 'integration', 'database', 'configuration'];

export interface ChangeCtx {
  id: string; chgNumber: string; title: string; slug: string | null; targetEnv: string | null;
  risk: string | null; deploymentCategory: string | null; status: string;
  plannedStartAt: string | null; plannedEndAt: string | null;
  isEmergency: boolean; isProduction: boolean; releaseCount: number; releaseNames: string[];
  releases: { name: string; number: string | null }[];
  isUnlinkedProduction: boolean; freezeConflict: boolean; freezeOverrideApproved: boolean;
  managerRole: string | null; // set for manager view
  sopTotal: number; sopDone: number; running: SopStepFull | null; runningOwnerAvatarUrl: string | null;
}
export interface ExecCard { step: SopStepFull; change: ChangeCtx }
export type PromptKind = 'due_soon' | 'overdue' | 'next_up' | 'missing_capture' | 'blocked_upstream' | 'emergency' | 'freeze' | 'multiple_running';
export interface ExecPrompt { kind: PromptKind; changeId: string; slug: string | null; chgNumber: string; title: string; detail: string; stepTitle?: string }

export interface MyExecutionWork {
  userId: string | null;
  assignedCards: ExecCard[];
  managedChanges: ChangeCtx[];
  dayOfChanges: ChangeCtx[];
  prompts: ExecPrompt[];
  isManager: boolean;
}

const isToday = (iso: string | null) => {
  if (!iso) return false;
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export const useMyExecutionWork = () =>
  useQuery({
    queryKey: ['release-hub', 'my-execution'],
    staleTime: 15_000,
    queryFn: async (): Promise<MyExecutionWork> => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id ?? null;
      if (!userId) return { userId: null, assignedCards: [], managedChanges: [], dayOfChanges: [], prompts: [], isManager: false };

      const [mineRes, mgrRes, freezeRes] = await Promise.all([
        supabase.from('rh_sop_steps').select('*').eq('owner_id', userId),
        supabase.from('rh_changes').select('*').or(`change_manager_id.eq.${userId},release_manager_id.eq.${userId}`),
        supabase.from('rh_freeze_windows').select('*'),
      ]);
      const mySteps = (mineRes.data ?? []) as any[];
      const mgrChanges = (mgrRes.data ?? []) as any[];
      const freezeRows = (freezeRes.data ?? []) as any[];

      // union of change ids we need context for
      const changeIds = [...new Set([...mySteps.map((s) => s.change_id), ...mgrChanges.map((c) => c.id)])].filter(Boolean) as string[];
      if (changeIds.length === 0) return { userId, assignedCards: [], managedChanges: [], dayOfChanges: [], prompts: [], isManager: mgrChanges.length > 0 };

      const [changesRes, linksRes, allStepsRes] = await Promise.all([
        supabase.from('rh_changes').select('*').in('id', changeIds),
        supabase.from('rh_change_release_links').select('change_id, rh_releases(name, version, jira_key)').in('change_id', changeIds).is('unlinked_at', null),
        supabase.from('rh_sop_steps').select('*').in('change_id', changeIds).order('step_no'),
      ]);
      const changeRows = (changesRes.data ?? []) as any[];
      const allSteps = (allStepsRes.data ?? []) as any[];
      const stepsByChange: Record<string, any[]> = {};
      allSteps.forEach((s) => { (stepsByChange[s.change_id] ??= []).push(s); });
      const relNames: Record<string, string[]> = {};
      const releasesByChange: Record<string, { name: string; number: string | null }[]> = {};
      ((linksRes.data ?? []) as any[]).forEach((l: any) => {
        const r = l.rh_releases;
        if (!r?.name) return;
        // Surface the linked release NUMBER (version, else jira key) next to its name.
        const num = r.version || r.jira_key;
        (relNames[l.change_id] ??= []).push(num ? `${r.name} (${num})` : r.name);
        (releasesByChange[l.change_id] ??= []).push({ name: r.name, number: num ?? null });
      });

      // resolve step owners (name + avatar) for the "running" step surfaced per change
      const stepOwnerIds = [...new Set(allSteps.map((s) => s.owner_id).filter(Boolean))] as string[];
      const ownerNameById: Record<string, string> = {};
      const ownerAvatarById: Record<string, string | null> = {};
      if (stepOwnerIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', stepOwnerIds);
        (profs ?? []).forEach((p: any) => { ownerNameById[p.id] = p.full_name || p.email || 'Unknown'; ownerAvatarById[p.id] = p.avatar_url ?? null; });
      }

      const freezeFor = (c: any) => {
        const winStart = c.window_start ?? c.planned_start_at;
        const winEnd = c.window_end ?? c.planned_end_at;
        const win = freezeRows.find((f) => {
          const active = f.is_active !== false && f.status !== 'ended';
          const envMatch = !f.target_env || f.target_env === 'all' || f.target_env === c.target_env;
          const fS = new Date(f.start_at ?? f.start_date).getTime(); const fE = new Date(f.end_at ?? f.end_date).getTime();
          const cS = winStart ? new Date(winStart).getTime() : Date.now(); const cE = winEnd ? new Date(winEnd).getTime() : cS;
          return active && envMatch && cS <= fE && cE >= fS;
        });
        return win;
      };

      const ctxOf = (c: any, managerRole: string | null): ChangeCtx => {
        const steps = (stepsByChange[c.id] ?? []).map((s) => mapSopStep(s, s.owner_id ? (ownerNameById[s.owner_id] ?? null) : null));
        const rels = relNames[c.id] ?? [];
        const releaseCount = rels.length || (c.release_id ? 1 : 0);
        const running = steps.find((s) => s.status === 'in_progress') ?? null;
        return {
          id: c.id, chgNumber: c.chg_number, title: c.title, slug: c.slug, targetEnv: c.target_env,
          risk: c.risk_level, deploymentCategory: c.deployment_category, status: c.status,
          plannedStartAt: c.planned_start_at ?? c.window_start, plannedEndAt: c.planned_end_at ?? c.window_end,
          isEmergency: c.is_emergency_override === true || c.change_type === 'emergency',
          isProduction: c.target_env === 'production', releaseCount, releaseNames: rels,
          releases: releasesByChange[c.id] ?? [],
          isUnlinkedProduction: c.target_env === 'production' && releaseCount === 0,
          freezeConflict: !!freezeFor(c), freezeOverrideApproved: c.is_emergency_override === true,
          managerRole,
          sopTotal: steps.length, sopDone: steps.filter((s) => s.status === 'done').length,
          running, runningOwnerAvatarUrl: running?.ownerId ? (ownerAvatarById[running.ownerId] ?? null) : null,
        };
      };
      const ctxById: Record<string, ChangeCtx> = {};
      changeRows.forEach((c) => { ctxById[c.id] = ctxOf(c, null); });

      // assignee cards
      const assignedCards: ExecCard[] = mySteps
        .map((s) => ({ step: mapSopStep(s, u.user?.email ?? null), change: ctxById[s.change_id] }))
        .filter((c) => c.change)
        .sort((a, b) => (a.step.plannedStartAt ?? '').localeCompare(b.step.plannedStartAt ?? ''));

      // manager overview
      const managedChanges: ChangeCtx[] = mgrChanges.map((c) => {
        const role = c.change_manager_id === userId ? 'Change manager' : 'Release manager';
        return ctxOf(c, role);
      });

      // day-of-change: changes today I own a step in or manage
      const dayIds = new Set<string>();
      assignedCards.forEach((c) => { if (isToday(c.step.plannedStartAt) || isToday(c.change.plannedStartAt) || c.change.running) dayIds.add(c.change.id); });
      managedChanges.forEach((c) => { if (isToday(c.plannedStartAt) || c.running || c.status === 'implementing') dayIds.add(c.id); });
      const dayOfChanges = [...dayIds].map((id) => managedChanges.find((c) => c.id === id) ?? ctxById[id]).filter(Boolean) as ChangeCtx[];

      // ── derive prompts (notification event model) ──
      const prompts: ExecPrompt[] = [];
      const now = Date.now();
      const runningMine = assignedCards.filter((c) => c.step.status === 'in_progress');
      if (runningMine.length > 1) prompts.push({ kind: 'multiple_running', changeId: runningMine[0].change.id, slug: runningMine[0].change.slug, chgNumber: runningMine[0].change.chgNumber, title: runningMine[0].change.title, detail: `${runningMine.length} of your steps are running at once.` });
      assignedCards.forEach(({ step, change }) => {
        const base = { changeId: change.id, slug: change.slug, chgNumber: change.chgNumber, title: change.title, stepTitle: step.title };
        const pStart = step.plannedStartAt ? new Date(step.plannedStartAt).getTime() : null;
        const pEnd = step.plannedEndAt ? new Date(step.plannedEndAt).getTime() : null;
        if (step.status === 'pending' && pStart && pStart > now && pStart - now < 60 * 60000) prompts.push({ ...base, kind: 'due_soon', detail: `Starts soon (${new Date(pStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).` });
        if ((step.status === 'pending' || step.status === 'in_progress') && ((pStart && step.status === 'pending' && now > pStart) || (pEnd && now > pEnd))) prompts.push({ ...base, kind: 'overdue', detail: 'Your step is overdue.' });
        if (step.status === 'in_progress' && pEnd && pEnd - now < 30 * 60000 && ((step.commitRequired && !stepHasCommit(step)) || (step.evidenceRequired && !step.evidenceUrl))) prompts.push({ ...base, kind: 'missing_capture', detail: 'Missing required commit/evidence near planned end.' });
        if (change.isEmergency) prompts.push({ ...base, kind: 'emergency', detail: 'Emergency override active on this change.' });
        if (change.freezeConflict && !change.freezeOverrideApproved) prompts.push({ ...base, kind: 'freeze', detail: 'Freeze conflict blocks this change.' });
        // next-up: previous step done and mine is the next pending
        if (step.status === 'pending') {
          const chSteps = (stepsByChange[change.id] ?? []).map((s) => mapSopStep(s, null)).sort((a, b) => a.stepNo - b.stepNo);
          const idx = chSteps.findIndex((s) => s.id === step.id);
          const prev = idx > 0 ? chSteps[idx - 1] : null;
          if (prev && prev.status === 'done' && !chSteps.slice(0, idx).some((s) => s.status !== 'done' && s.status !== 'skipped')) prompts.push({ ...base, kind: 'next_up', detail: 'Previous step complete — you are up next.' });
          if (prev && (prev.status === 'blocked' || prev.status === 'failed')) prompts.push({ ...base, kind: 'blocked_upstream', detail: `Upstream step "${prev.title}" is ${prev.status}.` });
        }
      });
      // dedupe: step-level prompts key on step; change-level (emergency/freeze/
      // multiple_running) key on change only so they show once per change.
      const CHANGE_LEVEL = new Set<PromptKind>(['emergency', 'freeze', 'multiple_running']);
      const seen = new Set<string>();
      const deduped = prompts.filter((p) => {
        const k = CHANGE_LEVEL.has(p.kind) ? `${p.kind}:${p.changeId}` : `${p.kind}:${p.changeId}:${p.stepTitle ?? ''}`;
        if (seen.has(k)) return false; seen.add(k); return true;
      });

      return { userId, assignedCards, managedChanges, dayOfChanges, prompts: deduped, isManager: mgrChanges.length > 0 };
    },
  });

function stepHasCommit(s: SopStepFull) {
  return !!(s.frontendCommit || s.backendCommit || s.integrationCommit || s.databaseCommit || s.configurationCommit);
}
export { stepHasCommit };
export const isStepTechnical = (t: string | null) => TECHNICAL.includes(t ?? '');
