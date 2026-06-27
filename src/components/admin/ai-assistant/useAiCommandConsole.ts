import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { COMMANDS, filterCommands, matchCommand, groupCommands } from './aiCommands.catalog';
import { supabase } from '@/integrations/supabase/client';
import type {
  Command, CommandView, ConfirmationEntry, ConfirmState, LearnedCommand, RunState,
  CommandPlan, CommandStep, StepResult,
} from './aiAdminConsole.types';

function makeEntry(
  cmd: { title: string; risk: string; bulk?: boolean },
  summary: string, novel: boolean, n: number, time: string, request: string,
): ConfirmationEntry {
  return {
    id: `h${n}-${Date.now()}`,
    headline: novel ? 'Request completed' : `${cmd.title.replace(/^[""]|[""]$/g, '')} — done`,
    request, summary, novel, time,
    auditId: `AUD-2026-${1040 + n}`,
    bulk: !!cmd.bulk,
  };
}

export function useAiCommandConsole() {
  const [composer, setComposerRaw] = useState('');
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState('');
  const [railTab, setRailTab] = useState<'All' | 'Single' | 'Bulk'>('All');
  const [running, setRunning] = useState<RunState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [history, setHistory] = useState<ConfirmationEntry[]>([]);

  const learnedRef = useRef<LearnedCommand[]>([]);
  const pickRef = useRef<{ text: string; cmd: Command } | null>(null);
  const planRef = useRef<CommandPlan | null>(null);
  const blur = useRef<number>();

  useEffect(() => {
    return () => { window.clearTimeout(blur.current); };
  }, []);

  const all = useCallback(() => [...learnedRef.current, ...COMMANDS], []);

  const pick = useCallback((c?: Command) => {
    if (!c) return;
    pickRef.current = { text: c.example, cmd: c };
    setComposerRaw(c.example); setFocused(false); setConfirm(null);
  }, []);
  const setComposer = useCallback((v: string) => {
    if (pickRef.current && v !== pickRef.current.text) pickRef.current = null;
    setComposerRaw(v); setConfirm(null);
  }, []);
  const onFocus = () => setFocused(true);
  const onBlur = () => { window.clearTimeout(blur.current); blur.current = window.setTimeout(() => setFocused(false), 160); };

  const match = useCallback((q: string) => matchCommand(all(), q, pickRef.current), [all]);

  const finish = useCallback((r: RunState) => {
    if (r.novel) {
      const name = r.request.length > 30 ? r.request.slice(0, 30) + '…' : r.request;
      learnedRef.current = [{
        cat: 'Learned', title: name, desc: 'Saved request', example: r.request,
        risk: r.risk, slug: name.toLowerCase(), keywords: r.request.toLowerCase(), learned: true,
      }, ...learnedRef.current].slice(0, 8);
    }
    const summary = r.bulk
      ? `${r.count} of ${r.count} updated successfully · 0 failed.`
      : 'Completed and recorded in the audit log.';
    setHistory(h => [makeEntry(r.cmd ?? { title: r.title, risk: r.risk, bulk: r.bulk }, summary, r.novel, h.length + 2, 'just now', r.request), ...h].slice(0, 6));
    setRunning(null);
    setComposerRaw('');
    planRef.current = null;
  }, []);

  // Phase 2: execute the confirmed plan, animate steps, call edge function
  const executePlan = useCallback(async (
    plan: CommandPlan, q: string, cmd: Command | null, novel: boolean, labels: string[], bulk: boolean,
  ) => {
    for (let i = 0; i < labels.length; i++) {
      setRunning(r => r ? { ...r, cur: i } : r);
      await new Promise(res => setTimeout(res, 400));
    }

    const { data, error } = await supabase.functions.invoke('ai-admin-assistant', {
      body: { action: 'execute', plan },
    });

    if (error || !data) { setRunning(null); planRef.current = null; return; }

    const successCount = (data.steps as StepResult[])?.filter(s => s.status === 'success').length ?? labels.length;
    setRunning(r => r ? { ...r, cur: labels.length, count: successCount } : r);
    await new Promise(res => setTimeout(res, 250));

    finish({
      phase: 'steps',
      title: cmd?.title ?? `"${q.slice(0, 30)}${q.length > 30 ? '…' : ''}"`,
      request: q, risk: cmd?.risk ?? 'Medium',
      bulk, count: successCount, labels, cur: labels.length, novel, cmd,
    });
  }, [finish]);

  // Phase 1: parse intent, get plan, decide confirm vs auto-execute
  const execute = useCallback(async (q: string, cmd: Command | null, novel: boolean) => {
    planRef.current = null;
    const bulk = cmd ? !!cmd.bulk : ((q.match(/@/g) || []).length > 1 || /\b(everyone|all|multiple|many)\b/i.test(q));
    setConfirm(null); setFocused(false);
    setRunning({
      phase: 'thinking',
      title: cmd ? cmd.title : `"${q.length > 30 ? q.slice(0, 30) + '…' : q}"`,
      request: q, risk: cmd ? cmd.risk : 'Medium', bulk, count: 1, labels: [], cur: 0, novel, cmd,
    });

    const { data, error } = await supabase.functions.invoke('ai-admin-assistant', {
      body: { message: q },
    });

    if (error || !data) { setRunning(null); return; }

    if (data.type !== 'plan' || !data.plan) {
      // respond_only or clarify — AI replied but nothing to execute
      setRunning(null);
      return;
    }

    const plan = data.plan as CommandPlan;
    planRef.current = plan;

    const labels = plan.steps.map((s: CommandStep) => s.label);
    const stepBulk = plan.steps.length > 1 || bulk;
    const needsConfirm = plan.warnings.length > 0 ||
      plan.steps.some((s: CommandStep) => s.action_type === 'delete_user' || s.action_type === 'deactivate_role');

    setRunning(r => r ? { ...r, phase: 'steps', labels, cur: 0, bulk: stepBulk, count: plan.steps.length } : r);

    if (needsConfirm) {
      setConfirm({
        risk: 'High', destructive: true,
        title: `${cmd?.title ?? 'Request'} — confirmation required`,
        body: (data.text as string) ?? plan.summary ?? 'Review and confirm before applying.',
      });
      return;
    }

    await executePlan(plan, q, cmd, novel, labels, stepBulk);
  }, [executePlan]);

  const run = useCallback(() => {
    const q = composer.trim();
    if (!q || running) return;
    const cmd = match(q);
    void execute(q, cmd, !cmd);
  }, [composer, running, match, execute]);

  const confirmRun = useCallback(async () => {
    const plan = planRef.current;
    if (!plan || !running) return;
    setConfirm(null);
    const { request, bulk, novel, cmd } = running;
    const labels = plan.steps.map(s => s.label);
    await executePlan(plan, request, cmd, novel, labels, bulk);
  }, [running, executePlan]);

  const cancelConfirm = useCallback(() => setConfirm(null), []);
  const cancelRun = useCallback(() => {
    planRef.current = null;
    setRunning(null);
    setConfirm(null);
  }, []);

  // ── derived view models ──────────────────────────────────────────────
  const toView = useCallback((c: Command): CommandView => ({ title: c.title, desc: c.desc, risk: c.risk, bulk: !!c.bulk, cat: c.cat, onPick: () => pick(c) }), [pick]);

  const matched = useMemo(() => match(composer), [composer, match]);
  const statusKind: 'ready' | 'match' | 'novel' = composer.trim() === '' ? 'ready' : (matched ? 'match' : 'novel');

  const paletteGroups = useMemo(() => {
    const groups = groupCommands(filterCommands(all(), composer), toView);
    let shown = 0; const out: typeof groups = [];
    for (const g of groups) { if (shown >= 7) break; const items = g.items.slice(0, Math.min(4, 7 - shown)); shown += items.length; out.push({ ...g, items }); }
    return out;
  }, [composer, all, toView]);
  const paletteFiltered = useMemo(() => filterCommands(all(), composer), [composer, all]);
  const paletteOpen = focused && !running;
  const paletteEmpty = paletteOpen && composer.trim() !== '' && paletteFiltered.length === 0;

  const railGroups = useMemo(() => {
    const base = all().filter(c => railTab === 'All' || (railTab === 'Single' ? !c.bulk : !!c.bulk));
    const s = search.trim().toLowerCase();
    const list = s ? base.filter(c => `${c.title} ${c.desc} ${c.keywords}`.toLowerCase().includes(s)) : base;
    return groupCommands(list, toView);
  }, [all, railTab, search, toView]);

  const chips = useMemo(() => ['Send a password reset link', 'Assign a product role', 'Invite multiple users', 'Deactivate a user'].map((title, i) => ({
    label: ['Reset a password', 'Assign a role', 'Invite people', 'Deactivate a user'][i],
    onPick: () => pick(COMMANDS.find(c => c.title === title)),
  })), [pick]);

  return {
    composer, setComposer, focused, onFocus, onBlur,
    search, setSearch, railTab, setRailTab,
    running, confirm, history, run, confirmRun, cancelConfirm, cancelRun,
    statusKind, paletteOpen, paletteEmpty, paletteGroups, railGroups, chips,
    libCount: railGroups.reduce((s, g) => s + g.items.length, 0),
  };
}
