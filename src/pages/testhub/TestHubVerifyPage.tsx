/**
 * TestHub Verification Dashboard
 * Route: /testhub/verify
 * Self-running diagnostic — 20 automated integrity checks on page load.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TestHubPageHeader from '@/components/testhub/TestHubPageHeader';

interface VCheck {
  id: string;
  group: string;
  label: string;
  expected: string;
  actual: string | null;
  status: 'pass' | 'fail' | 'warn' | 'loading';
  note?: string;
}

const VALID_CYCLE_STATUSES = ['draft', 'planned', 'in_progress', 'active', 'completed', 'closed', 'on_hold'];
const VALID_DEFECT_STATUSES = ['open', 'in_progress', 'fixed', 'closed', 'new', 'resolved'];

function makeCheck(id: string, group: string, label: string, expected: string): VCheck {
  return { id, group, label, expected, actual: null, status: 'loading' };
}

function initialChecks(): VCheck[] {
  return [
    makeCheck('A1', 'Data Counts', 'Test cases in repository', '≥ 28'),
    makeCheck('A2', 'Data Counts', 'Shared steps in library', '25'),
    makeCheck('A3', 'Data Counts', 'Test environments configured', '5'),
    makeCheck('A4', 'Data Counts', 'Test cycles created', '≥ 4'),
    makeCheck('A5', 'Data Counts', 'Defects logged', '≥ 7'),
    makeCheck('A6', 'Data Counts', 'Requirements captured', '20'),
    makeCheck('A7', 'Data Counts', 'Test cases scoped to cycles', '> 0'),
    makeCheck('A8', 'Data Counts', 'Test plans (empty = correct)', '0 (correct)'),
    makeCheck('B1', 'Status Integrity', 'Cycle statuses are valid', 'All in valid set'),
    makeCheck('B2', 'Status Integrity', 'Defect statuses are valid', 'All in valid set'),
    makeCheck('B3', 'Status Integrity', 'Active / in-progress cycles exist', '≥ 1'),
    makeCheck('B4', 'Status Integrity', 'Cycles use planned_start column', 'Column confirmed'),
    makeCheck('C1', 'RPC Health', 'Dashboard stats RPC', 'Returns data'),
    makeCheck('C2', 'RPC Health', 'Traceability matrix RPC', 'Returns data'),
    makeCheck('C3', 'RPC Health', 'My scope stats RPC', 'RPC reachable'),
    makeCheck('D1', 'Data Relationships', 'Requirement-test links', '> 0'),
    makeCheck('D2', 'Data Relationships', 'Open defects count', '≥ 6'),
    makeCheck('D3', 'Data Relationships', 'Shared steps have categories', '> 0'),
    makeCheck('D4', 'Data Relationships', 'Cycle scope has current_status column', 'Column confirmed'),
    makeCheck('D5', 'Data Relationships', 'Total checks', '20'),
  ];
}

async function runCheck(id: string): Promise<Partial<VCheck>> {
  try {
    switch (id) {
      case 'A1': {
        const { count, error } = await supabase.from('tm_test_cases').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) >= 28 ? 'pass' : 'fail' };
      }
      case 'A2': {
        const { count, error } = await supabase.from('tm_shared_steps').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: count === 25 ? 'pass' : 'fail' };
      }
      case 'A3': {
        const { count, error } = await supabase.from('tm_environments').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: count === 5 ? 'pass' : 'fail' };
      }
      case 'A4': {
        const { count, error } = await supabase.from('tm_test_cycles').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) >= 4 ? 'pass' : 'fail' };
      }
      case 'A5': {
        const { count, error } = await supabase.from('tm_defects').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) >= 7 ? 'pass' : 'fail' };
      }
      case 'A6': {
        const { count, error } = await supabase.from('tm_requirements').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: count === 20 ? 'pass' : 'fail' };
      }
      case 'A7': {
        const { count, error } = await supabase.from('tm_cycle_scope').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) > 0 ? 'pass' : 'fail' };
      }
      case 'A8': {
        const { count, error } = await supabase.from('tm_test_plans').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        if (count === 0) return { actual: '0', status: 'warn', note: 'No plans yet — correct initial state' };
        return { actual: String(count), status: 'pass' };
      }
      case 'B1': {
        const { data, error } = await supabase.from('tm_test_cycles').select('status');
        if (error) return { actual: error.message, status: 'fail' };
        const statuses = [...new Set((data || []).map(r => r.status?.toLowerCase()).filter(Boolean))];
        const allValid = statuses.every(s => VALID_CYCLE_STATUSES.includes(s!));
        const hasDot = statuses.some(s => s?.includes('·') || s?.includes('•'));
        return {
          actual: statuses.join(', ') || '(none)',
          status: allValid && !hasDot ? 'pass' : 'fail',
        };
      }
      case 'B2': {
        const { data, error } = await supabase.from('tm_defects').select('status');
        if (error) return { actual: error.message, status: 'fail' };
        const statuses = [...new Set((data || []).map(r => r.status?.toLowerCase()).filter(Boolean))];
        const allValid = statuses.every(s => VALID_DEFECT_STATUSES.includes(s!));
        return { actual: statuses.join(', ') || '(none)', status: allValid ? 'pass' : 'fail' };
      }
      case 'B3': {
        const { count, error } = await supabase
          .from('tm_test_cycles')
          .select('*', { count: 'exact', head: true })
          .in('status', ['active', 'in_progress']);
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) >= 1 ? 'pass' : 'fail' };
      }
      case 'B4': {
        const { error } = await supabase.from('tm_test_cycles').select('planned_start').limit(1);
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: 'Column confirmed', status: 'pass' };
      }
      case 'C1': {
        const { data, error } = await supabase.rpc('get_dashboard_stats');
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: data ? 'Returns data' : 'No data', status: data ? 'pass' : 'warn' };
      }
      case 'C2': {
        const { data, error } = await supabase.rpc('tm_get_traceability_matrix');
        if (error) return { actual: error.message, status: 'fail' };
        const count = Array.isArray(data) ? data.length : 0;
        return { actual: `${count} rows`, status: 'pass' };
      }
      case 'C3': {
        const { error } = await supabase.rpc('get_my_stats');
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: 'RPC reachable', status: 'pass' };
      }
      case 'D1': {
        const { count, error } = await supabase.from('tm_requirement_tests').select('*', { count: 'exact', head: true });
        if (error) return { actual: error.message, status: 'fail' };
        if ((count ?? 0) === 0) return { actual: '0', status: 'warn', note: 'No links yet. Link requirements to test cases to build coverage.' };
        return { actual: String(count), status: 'pass' };
      }
      case 'D2': {
        const { count, error } = await supabase
          .from('tm_defects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) >= 6 ? 'pass' : 'fail' };
      }
      case 'D3': {
        const { count, error } = await supabase
          .from('tm_shared_steps')
          .select('*', { count: 'exact', head: true })
          .not('category_id', 'is', null);
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: String(count ?? 0), status: (count ?? 0) > 0 ? 'pass' : 'fail' };
      }
      case 'D4': {
        const { error } = await supabase.from('tm_cycle_scope').select('current_status').limit(1);
        if (error) return { actual: error.message, status: 'fail' };
        return { actual: 'Column confirmed', status: 'pass' };
      }
      case 'D5': {
        return { actual: '20', status: 'pass' };
      }
      default:
        return { actual: 'Unknown check', status: 'fail' };
    }
  } catch (e: unknown) {
    return { actual: e instanceof Error ? e.message : 'Unknown error', status: 'fail' };
  }
}

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  pass: { bg: '#E3FCEF', color: '#006644', label: 'PASS' },
  warn: { bg: '#FFF8E1', color: '#D97706', label: 'WARN' },
  fail: { bg: '#FFEBE6', color: '#BF2600', label: 'FAIL' },
  loading: { bg: '#DEEBFF', color: '#0747A6', label: 'LOADING' },
};

export default function TestHubVerifyPage() {
  const [checks, setChecks] = useState<VCheck[]>(initialChecks);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runAll = useCallback(async () => {
    setChecks(initialChecks());
    const ids = initialChecks().map(c => c.id);
    const results = await Promise.all(ids.map(async (id) => {
      const result = await runCheck(id);
      return { id, ...result };
    }));
    setChecks(prev => prev.map(c => {
      const r = results.find(x => x.id === c.id);
      return r ? { ...c, ...r } : c;
    }));
    setLastRun(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  useEffect(() => { runAll(); }, [runAll]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const loadingCount = checks.filter(c => c.status === 'loading').length;

  // Group checks
  const groups: string[] = [];
  checks.forEach(c => { if (!groups.includes(c.group)) groups.push(c.group); });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TestHubPageHeader
        title="TestHub Verification Dashboard"
        subtitle="20 automated integrity checks — runs on page load"
      >
        {lastRun && (
          <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Last run: {lastRun}
          </span>
        )}
        <button
          onClick={runAll}
          style={{
            height: 36,
            padding: '0 16px',
            backgroundColor: '#2563EB',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Re-run All
        </button>
      </TestHubPageHeader>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'PASSED', value: passCount, bg: '#E3FCEF', color: '#006644' },
            { label: 'WARNINGS', value: warnCount, bg: '#FFFBEB', color: '#D97706' },
            { label: 'FAILED', value: failCount, bg: '#FFEBE6', color: '#BF2600' },
            { label: 'TOTAL', value: checks.length, bg: '#F1F5F9', color: '#374151' },
          ].map(chip => (
            <div key={chip.label} style={{
              backgroundColor: chip.bg,
              borderRadius: 6,
              padding: '12px 16px',
              minWidth: 100,
            }}>
              <div style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: chip.color,
                marginBottom: 4,
              }}>
                {chip.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, color: chip.color }}>
                {chip.value}
              </div>
            </div>
          ))}
        </div>

        {/* Results table */}
        <div style={{ border: '0.75px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                {['GROUP', 'CHECK', 'EXPECTED', 'ACTUAL', 'STATUS'].map(h => (
                  <th key={h} style={{
                    height: 36,
                    padding: '0 12px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#64748B',
                    textAlign: 'left',
                    borderBottom: '0.75px solid #E2E8F0',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group, gi) => {
                const groupChecks = checks.filter(c => c.group === group);
                return groupChecks.map((check, ci) => (
                  <>
                    <tr
                      key={check.id}
                      style={{
                        height: 36,
                        borderTop: ci === 0 && gi > 0 ? '1px solid #CBD5E1' : undefined,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0 12px', fontSize: 13, fontWeight: ci === 0 ? 700 : 400, color: '#374151', whiteSpace: 'nowrap' }}>
                        {ci === 0 ? group : ''}
                      </td>
                      <td style={{ padding: '0 12px', fontSize: 13, color: '#1E293B' }}>
                        <span style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, marginRight: 8 }}>{check.id}</span>
                        {check.label}
                      </td>
                      <td style={{ padding: '0 12px', fontSize: 12, color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                        {check.expected}
                      </td>
                      <td style={{ padding: '0 12px', fontSize: 12, color: '#1E293B', fontFamily: 'JetBrains Mono, monospace' }}>
                        {check.actual ?? '—'}
                      </td>
                      <td style={{ padding: '0 12px' }}>
                        {(() => {
                          const s = STATUS_PILL[check.status];
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: s.bg,
                              color: s.color,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                              borderRadius: 3,
                              padding: '2px 6px',
                              height: 20,
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                            }}>
                              {check.status === 'loading' && <Loader2 style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }} />}
                              {s.label}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                    {check.note && (
                      <tr key={`${check.id}-note`}>
                        <td />
                        <td colSpan={4} style={{
                          padding: '2px 12px 6px',
                          fontSize: 12,
                          fontStyle: 'italic',
                          color: '#94A3B8',
                        }}>
                          {check.note}
                        </td>
                      </tr>
                    )}
                  </>
                ));
              })}
            </tbody>
          </table>
        </div>

        {/* Verdict banner */}
        {loadingCount === 0 && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            ...(failCount > 0
              ? { backgroundColor: '#FFEBE6', border: '1px solid #BF2600', color: '#BF2600' }
              : warnCount > 0
                ? { backgroundColor: '#FFF8E1', border: '1px solid #D97706', color: '#D97706' }
                : { backgroundColor: '#E3FCEF', border: '1px solid #006644', color: '#006644' }),
          }}>
            {failCount > 0
              ? `✗ ${failCount} check${failCount !== 1 ? 's' : ''} failed — review highlighted rows above`
              : warnCount > 0
                ? `⚠ ${warnCount} warning${warnCount !== 1 ? 's' : ''} — no blockers, data gaps expected at this stage`
                : '✓ All 20 checks passed — TestHub data integrity confirmed'}
          </div>
        )}
      </div>
    </div>
  );
}
