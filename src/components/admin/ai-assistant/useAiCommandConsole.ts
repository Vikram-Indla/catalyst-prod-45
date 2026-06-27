import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { COMMANDS, filterCommands, matchCommand, groupCommands } from './aiCommands.catalog';
import type { Command, CommandView, ConfirmationEntry, ConfirmState, LearnedCommand, RunState } from './aiAdminConsole.types';

const DESTRUCTIVE = /delete|deny|deactivate|revoke|reset permissions|remove (a )?permission/i;

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

/**
 * Drives the whole console. The run() flow here SIMULATES execution with
 * timers so the UI is fully demonstrable. To go live, replace execute() with
 * the real two-call contract:
 *   1) POST /functions/v1/ai-admin-assistant { message } -> { plan_id, plan }
 *   2) on confirm: POST { plan_id, confirmed: true }      -> step results + audit id
 * Re-check live DB state server-side; a 409 should surface a failure card.
 */
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
  const tick = useRef<number>();
  const think = useRef<number>();
  const blur = useRef<number>();

  useEffect(() => {
    // Seed one prior action so Activity isn't empty on first load.
    setHistory([makeEntry({ title: 'Invite a new user', risk: 'Low' }, 'Invitation email sent to maria@catalyst.io.', false, 1, '11:38', 'Invite maria@catalyst.io as Viewer')]);
    return () => { window.clearInterval(tick.current); window.clearTimeout(think.current); window.clearTimeout(blur.current); };
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
    setComposerRaw('');
  }, []);

  const execute = useCallback((q: string, cmd: Command | null, novel: boolean) => {
    window.clearInterval(tick.current); window.clearTimeout(think.current);
    const bulk = cmd ? !!cmd.bulk : ((q.match(/@/g) || []).length > 1 || /\b(everyone|all|multiple|many)\b/i.test(q));
    const count = bulk ? Math.max((q.match(/@/g) || []).length, (q.match(/,/g) || []).length + 1, 3) : 1;
    const labels = ['Checking current access', `Applying the change${bulk ? 's' : ''}`, 'Recording in the audit log', 'Confirming the result'];
    setConfirm(null); setFocused(false);
    setRunning({ phase: 'thinking', title: cmd ? cmd.title : `"${q}"`, request: q, risk: cmd ? cmd.risk : 'Medium', bulk, count, labels, cur: 0, novel, cmd });
    think.current = window.setTimeout(() => {
      setRunning(r => (r ? { ...r, phase: 'steps', cur: 0 } : r));
      tick.current = window.setInterval(() => {
        setRunning(r => {
          if (!r) { window.clearInterval(tick.current); return r; }
          const cur = r.cur + 1;
          if (cur > r.labels.length) { window.clearInterval(tick.current); finish(r); return null; }
          return { ...r, cur };
        });
      }, 600);
    }, 850);
  }, [finish]);

  const run = useCallback(() => {
    const q = composer.trim();
    if (!q || running) return;
    const cmd = match(q);
    const novel = !cmd;
    const risk = cmd ? cmd.risk : 'Medium';
    const destructive = !!cmd && DESTRUCTIVE.test(cmd.title);
    if ((risk === 'High' || destructive) && !confirm) {
      setConfirm({
        risk, destructive,
        title: `${cmd ? cmd.title : 'Run request'} — confirmation required`,
        body: risk === 'High'
          ? 'High-risk change. The live state is re-checked before it runs; nothing is applied if the data changed.'
          : 'This affects access. The live state is re-checked before it runs.',
      });
      return;
    }
    execute(q, cmd, novel);
  }, [composer, running, confirm, match, execute]);

  const confirmRun = useCallback(() => { const q = composer.trim(); execute(q, match(q), !match(q)); }, [composer, match, execute]);
  const cancelConfirm = useCallback(() => setConfirm(null), []);
  const cancelRun = useCallback(() => {
    window.clearInterval(tick.current);
    window.clearTimeout(think.current);
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
