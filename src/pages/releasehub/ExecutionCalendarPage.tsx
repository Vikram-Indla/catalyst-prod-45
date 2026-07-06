/**
 * ExecutionCalendarPage — Phase 6 §6/§7. Deployment-day SOP execution calendar.
 * Day view = hourly SOP slots; Week view = day columns. Scope lens (All / My
 * steps / Managed) + environment lens + date nav. Each slot shows change/step/
 * assignee/status/markers and routes to full Change Detail. Real rh_sop_steps
 * schedule — no placeholders. ADS tokens, no drawers.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import { ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { mapSopStep, type SopStepFull } from '@/hooks/useSopRunbook';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { ChangeStatusLozenge, FlagLozenge } from '@/components/releasehub/shared/ReleaseOpsLozenges';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

const T = {
  surface: 'var(--ds-surface)', card: 'var(--ds-surface-raised)', sunken: 'var(--ds-surface-sunken)', border: 'var(--ds-border)',
  text: 'var(--ds-text)', subtle: 'var(--ds-text-subtle)', subtlest: 'var(--ds-text-subtlest)', link: 'var(--ds-link)',
  danger: 'var(--ds-text-danger)', warning: 'var(--ds-text-warning)', success: 'var(--ds-text-success)', info: 'var(--ds-text-information)', mono: 'var(--ds-font-family-code, monospace)',
};

interface Slot { step: SopStepFull; changeId: string; chgNumber: string; title: string; slug: string | null; targetEnv: string | null; isEmergency: boolean; ownerName: string | null; issues: number }

function statusTone(s: string): { fg: string; bg: string } {
  switch (s) {
    case 'done': return { fg: T.success, bg: 'var(--ds-background-success)' };
    case 'in_progress': return { fg: T.info, bg: 'var(--ds-background-information)' };
    case 'blocked': case 'failed': return { fg: T.danger, bg: 'var(--ds-background-danger)' };
    case 'skipped': return { fg: T.warning, bg: 'var(--ds-background-warning)' };
    default: return { fg: T.subtle, bg: T.sunken };
  }
}
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; };

function useExecutionSchedule(rangeStart: Date, rangeEnd: Date, scope: string, userId: string | null) {
  return useQuery({
    queryKey: ['release-hub', 'execution-schedule', dayKey(rangeStart), dayKey(rangeEnd), scope, userId],
    staleTime: 15_000,
    queryFn: async (): Promise<Slot[]> => {
      let q = supabase.from('rh_sop_steps').select('*').gte('planned_start_at', rangeStart.toISOString()).lt('planned_start_at', rangeEnd.toISOString()).order('planned_start_at');
      if (scope === 'mine' && userId) q = q.eq('owner_id', userId);
      const { data: steps } = await q;
      const rows = (steps ?? []) as any[];
      if (rows.length === 0) return [];
      const changeIds = [...new Set(rows.map((s) => s.change_id))];
      const ownerIds = [...new Set(rows.map((s) => s.owner_id).filter(Boolean))] as string[];
      const [chRes, profRes] = await Promise.all([
        supabase.from('rh_changes').select('id, chg_number, title, slug, target_env, is_emergency_override, change_manager_id, release_manager_id').in('id', changeIds),
        ownerIds.length ? supabase.from('profiles').select('id, full_name, email').in('id', ownerIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const chById: Record<string, any> = {}; ((chRes.data ?? []) as any[]).forEach((c) => { chById[c.id] = c; });
      const nameById: Record<string, string> = {}; ((profRes.data ?? []) as any[]).forEach((p: any) => { nameById[p.id] = p.full_name || p.email || 'Unknown'; });
      // issue counts by SOP step (source_sop_step_id) — batched
      const stepIds = rows.map((s) => s.id);
      const issueByStep: Record<string, number> = {};
      if (stepIds.length) {
        const [{ data: incs }, { data: defs }] = await Promise.all([
          supabase.from('incidents').select('source_sop_step_id').in('source_sop_step_id', stepIds),
          supabase.from('tm_defects').select('source_sop_step_id').in('source_sop_step_id', stepIds),
        ]);
        [...(incs ?? []), ...(defs ?? [])].forEach((r: any) => { if (r.source_sop_step_id) issueByStep[r.source_sop_step_id] = (issueByStep[r.source_sop_step_id] ?? 0) + 1; });
      }
      let slots: Slot[] = rows.map((s) => {
        const c = chById[s.change_id]; if (!c) return null;
        return { step: mapSopStep(s, s.owner_id ? nameById[s.owner_id] ?? null : null), changeId: c.id, chgNumber: c.chg_number, title: c.title, slug: c.slug, targetEnv: c.target_env, isEmergency: c.is_emergency_override === true, ownerName: s.owner_id ? nameById[s.owner_id] ?? null : null, issues: issueByStep[s.id] ?? 0 };
      }).filter(Boolean) as Slot[];
      if (scope === 'managed' && userId) slots = slots.filter((sl) => { const c = chById[sl.changeId]; return c.change_manager_id === userId || c.release_manager_id === userId; });
      return slots;
    },
  });
}

function SlotChip({ slot, now }: { slot: Slot; now: number }) {
  const navigate = useNavigate();
  const tone = statusTone(slot.step.status);
  const pEnd = slot.step.plannedEndAt ? new Date(slot.step.plannedEndAt).getTime() : null;
  const overdue = (slot.step.status === 'pending' || slot.step.status === 'in_progress') && pEnd != null && now > pEnd;
  const running = slot.step.status === 'in_progress';
  return (
    <button onClick={() => navigate(`/release-hub/changes/${slot.slug ?? slot.changeId}`)}
      style={{ textAlign: 'left', width: '100%', background: tone.bg, border: `1px solid ${running ? 'var(--ds-border-focused)' : overdue ? 'var(--ds-border-danger)' : T.border}`, borderLeft: `4px solid ${tone.fg}`, borderRadius: 6, padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: T.mono, fontSize: 'var(--ds-font-size-50)', fontWeight: 600, color: T.link }}>{slot.chgNumber}</span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtle }}>#{slot.step.stepNo}</span>
        {slot.isEmergency && <FlagLozenge label="Emergency" />}
        {slot.issues > 0 && <FlagLozenge label={`Issues ${slot.issues}`} />}
        {running && <span style={{ marginLeft: 'auto' }}><FlagLozenge label="Live" /></span>}
        {overdue && !running && <span style={{ marginLeft: 'auto' }}><FlagLozenge label="Late" /></span>}
      </div>
      <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.step.title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ChangeStatusLozenge status={slot.step.status} />
        {slot.ownerName ? <CatalystAvatar name={slot.ownerName} size="xsmall" /> : <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtle }}>Unassigned</span>}
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtle }}>{slot.targetEnv ?? ''}{slot.step.commitRequired ? ' · commit' : ''}{slot.step.evidenceRequired ? ' · ev' : ''}</span>
      </div>
    </button>
  );
}

const SCOPES = [{ label: 'All steps', value: 'all' }, { label: 'My steps', value: 'mine' }, { label: 'Managed', value: 'managed' }];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ExecutionCalendarPage() {
  const [view, setView] = useState<'day' | 'week'>('day');
  const [scope, setScope] = useState(SCOPES[0]);
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  const rangeStart = view === 'day' ? anchor : startOfWeek(anchor);
  const rangeEnd = view === 'day' ? addDays(anchor, 1) : addDays(startOfWeek(anchor), 7);
  const { data: slots = [], isLoading } = useExecutionSchedule(rangeStart, rangeEnd, scope.value, userId);

  const byHour = useMemo(() => {
    const m: Record<number, Slot[]> = {};
    slots.forEach((s) => { if (!s.step.plannedStartAt) return; const h = new Date(s.step.plannedStartAt).getHours(); (m[h] ??= []).push(s); });
    return m;
  }, [slots]);
  const byDay = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    slots.forEach((s) => { if (!s.step.plannedStartAt) return; const k = dayKey(new Date(s.step.plannedStartAt)); (m[k] ??= []).push(s); });
    return m;
  }, [slots]);

  const activeHours = HOURS.filter((h) => (byHour[h] ?? []).length > 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const isToday = (d: Date) => dayKey(d) === dayKey(new Date());

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ width: '100%' }}>
      <div style={{ margin: '-24px -24px 0' }}><ProjectPageHeader projectKey="RELEASES" hubType="release" /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', flexWrap: 'wrap' }}>
        <div role="heading" aria-level={1} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: 0 }}>Execution calendar</div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {(['day', 'week'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: view === v ? 'var(--ds-background-selected)' : 'transparent', color: view === v ? 'var(--ds-text-selected)' : T.text, cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>{v === 'day' ? 'Day' : 'Week'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setAnchor((d) => addDays(d, view === 'day' ? -1 : -7))} aria-label="Previous" style={navBtn}><ChevronLeft size={16} style={{ color: T.subtle }} /></button>
          <button onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); }} style={{ ...navBtn, width: 'auto', padding: '0 12px', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>Today</button>
          <button onClick={() => setAnchor((d) => addDays(d, view === 'day' ? 1 : 7))} aria-label="Next" style={navBtn}><ChevronRight size={16} style={{ color: T.subtle }} /></button>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, marginLeft: 8 }}>{view === 'day' ? anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : `Week of ${startOfWeek(anchor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</span>
        </div>
        <div style={{ width: 160, marginLeft: 'auto' }}><Select inputId="exec-scope" options={SCOPES} value={scope} onChange={(v: any) => setScope(v)} spacing="compact" menuPosition="fixed" /></div>
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, color: T.subtlest }}>Loading schedule…</div>
      ) : slots.length === 0 ? (
        <div style={{ background: T.sunken, borderRadius: 8, padding: 24, textAlign: 'center' }}>
          <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, margin: 0 }}>No execution slots {view === 'day' ? 'this day' : 'this week'}</p>
          <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>SOP steps with a planned start time appear here as hourly slots. Apply an SOP template and set planned times on a change to schedule execution.</p>
        </div>
      ) : view === 'day' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activeHours.map((h) => (
            <div key={h} style={{ display: 'flex', gap: 12, borderTop: `1px solid ${T.border}`, paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ width: 56, flex: 'none', fontFamily: T.mono, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, paddingTop: 4 }}>{String(h).padStart(2, '0')}:00</div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {(byHour[h] ?? []).map((s) => <SlotChip key={s.step.id} slot={s} now={now} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDays.map((d) => (
            <div key={dayKey(d)} style={{ minWidth: 0 }}>
              <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: isToday(d) ? T.link : T.subtle, padding: '4px 0', textAlign: 'center', borderBottom: `2px solid ${isToday(d) ? 'var(--ds-border-focused)' : T.border}` }}>{d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', minHeight: 80 }}>
                {(byDay[dayKey(d)] ?? []).length === 0 ? <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest, textAlign: 'center' }}>—</span> : (byDay[dayKey(d)] ?? []).map((s) => <SlotChip key={s.step.id} slot={s} now={now} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: '1px solid var(--ds-border)', background: 'transparent', cursor: 'pointer' };
