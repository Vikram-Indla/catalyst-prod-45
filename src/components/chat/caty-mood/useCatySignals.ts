/**
 * useCatySignals — reads the current user's open tickets from ph_issues and derives
 * the named CatySignals plus the per-rule evidence tickets (for CatyWhyCard).
 *
 * Account resolution uses profiles.jira_account_id (CLAUDE.md 2026-05-16: the reliable
 * path; ph_user_mapping is not kept in sync). Scope is personal for v1 but the shape is
 * ready for team/sprint scopes — only the assignee filter changes.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  computeCatyState,
  AGE_DAYS,
  type CatyMood,
  type CatyRuleKey,
  type CatySignals,
} from './catyMoodEngine';

export interface CatyTicketLite {
  issue_key: string;
  summary: string | null;
  issue_type: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
}

export type CatyEvidence = Partial<Record<CatyRuleKey, CatyTicketLite[]>>;

/** Count of open items per work-item type (every type the user owns). */
export type CatyTypeBreakdown = Array<{ type: string; count: number }>;

export interface CatySignalsResult {
  signals: CatySignals;
  evidence: CatyEvidence;
  /** Per-type spread of all open assigned items, sorted desc — drives the why-card. */
  byType: CatyTypeBreakdown;
  mood: CatyMood;
  isLoading: boolean;
  /** Jira account id resolved for the current user, or null. */
  jiraAccountId: string | null;
}

const EMPTY_SIGNALS: CatySignals = {
  overdue: 0,
  dueToday: 0,
  dueThisWeek: 0,
  incidentsOpen: 0,
  changeRequestsOpen: 0,
  bugsOpen: 0,
  gapsOpen: 0,
  blocked: 0,
  highPriorityOpen: 0,
  agedOpen: 0,
  totalOpen: 0,
};

const SELECT =
  'issue_key, summary, issue_type, status, status_category, priority, due_date, jira_created_at, deleted_at';

function isOpen(row: { status_category: string | null; deleted_at: string | null }): boolean {
  if (row.deleted_at) return false;
  return (row.status_category ?? '').toLowerCase() !== 'done';
}

function localToday(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function deriveSignals(rows: Array<Record<string, unknown>>): {
  signals: CatySignals;
  evidence: CatyEvidence;
  byType: CatyTypeBreakdown;
} {
  const today = localToday();
  const weekAhead = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  })();
  const ageCutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() - AGE_DAYS);
    return d.getTime();
  })();

  const signals: CatySignals = { ...EMPTY_SIGNALS };
  const evidence: CatyEvidence = {};
  const typeCounts = new Map<string, number>();
  const push = (key: CatyRuleKey, t: CatyTicketLite) => {
    (evidence[key] ??= []).push(t);
  };

  for (const r of rows) {
    const row = r as {
      issue_key: string;
      summary: string | null;
      issue_type: string | null;
      status: string | null;
      status_category: string | null;
      priority: string | null;
      due_date: string | null;
      jira_created_at: string | null;
      deleted_at: string | null;
    };
    if (!isOpen(row)) continue;

    const t: CatyTicketLite = {
      issue_key: row.issue_key,
      summary: row.summary,
      issue_type: row.issue_type,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
    };

    signals.totalOpen += 1;
    const itype = (row.issue_type ?? '').trim();
    if (itype) typeCounts.set(itype, (typeCounts.get(itype) ?? 0) + 1);

    if (row.due_date) {
      if (row.due_date < today) {
        signals.overdue += 1;
        push('overdue', t);
      } else if (row.due_date === today) {
        signals.dueToday += 1;
        push('dueToday', t);
      } else if (row.due_date <= weekAhead) {
        signals.dueThisWeek += 1;
        push('dueThisWeek', t);
      }
    }

    if (itype === 'Production Incident') {
      signals.incidentsOpen += 1;
      push('incidentsOpen', t);
    }
    if (itype === 'Change Request') {
      signals.changeRequestsOpen += 1;
      push('changeRequestsOpen', t);
    }
    if (itype === 'QA Bug' || itype === 'Defect') {
      signals.bugsOpen += 1;
      push('bugsOpen', t);
    }
    if (itype === 'Business Gap') {
      signals.gapsOpen += 1;
      push('gapsOpen', t);
    }
    if ((row.status ?? '').toLowerCase().includes('block')) {
      signals.blocked += 1;
      push('blocked', t);
    }
    const pr = (row.priority ?? '').toLowerCase();
    if (pr === 'high' || pr === 'highest') {
      signals.highPriorityOpen += 1;
      push('highPriorityOpen', t);
    }
    if (row.jira_created_at && new Date(row.jira_created_at).getTime() < ageCutoff) {
      signals.agedOpen += 1;
      push('agedOpen', t);
    }
  }

  const byType: CatyTypeBreakdown = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  return { signals, evidence, byType };
}

export function useCatySignals(): CatySignalsResult {
  const { user } = useAuth();

  const { data: jiraAccountId = null } = useQuery({
    queryKey: ['caty-mood-jira-id', user?.id],
    enabled: !!user?.id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('jira_account_id')
        .eq('id', user!.id)
        .single();
      return profile?.jira_account_id ?? null;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['caty-mood-signals', user?.id, jiraAccountId],
    enabled: !!user?.id && !!jiraAccountId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('ph_issues')
        .select(SELECT)
        .eq('assignee_account_id', jiraAccountId!)
        .is('deleted_at', null);
      if (error) throw error;
      return deriveSignals((rows ?? []) as Array<Record<string, unknown>>);
    },
  });

  const signals = data?.signals ?? EMPTY_SIGNALS;
  const evidence = data?.evidence ?? {};
  const byType = data?.byType ?? [];
  return {
    signals,
    evidence,
    byType,
    mood: computeCatyState(signals),
    isLoading: isLoading || !jiraAccountId,
    jiraAccountId,
  };
}

export { deriveSignals };
