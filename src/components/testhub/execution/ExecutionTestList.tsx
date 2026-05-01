/**
 * TestHub Execution Page — Test List Panel (Panel 1)
 * Extracted from TestHubExecutionPage.tsx
 */
import React from 'react';
import { User } from 'lucide-react';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  status: string;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
}

interface CycleTestCase {
  id: string;
  cycle_id: string;
  test_case_id: string;
  current_status: string;
  executed_at: string | null;
  executed_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  execution_time_seconds: number;
  failure_reason: string | null;
  started_at: string | null;
  locked_version?: number | null;
  test_case: {
    id: string;
    case_key: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority_id: string | null;
    case_type_id: string | null;
    current_version?: number | null;
    priority?: { id: string; name: string; color: string } | null;
    case_type?: { id: string; name: string } | null;
    steps?: any[];
  } | null;
  assignee?: { id: string; full_name: string } | null;
}

interface ExecutionTestListProps {
  cycle: TestCycle;
  filteredTestCases: CycleTestCase[];
  selectedTestCaseId: string | null;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  showMyTestsOnly: boolean;
  setShowMyTestsOnly: (v: boolean) => void;
  onSelectTest: (id: string) => void;
  statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }>;
}

export function ExecutionTestList({
  cycle, filteredTestCases, selectedTestCaseId,
  statusFilter, setStatusFilter,
  showMyTestsOnly, setShowMyTestsOnly,
  onSelectTest, statusConfig,
}: ExecutionTestListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--card))', borderRight: '1px solid hsl(var(--border))' }}>
      <div style={{ padding: 12, borderBottom: '1px solid hsl(var(--border))' }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--muted-foreground))', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Test Queue ({filteredTestCases.length})
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ flex: 1, height: 30, padding: '0 6px', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11, color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--background))' }}>
            <option value="all">All</option>
            <option value="not_run">Not Run</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="skipped">Skipped</option>
          </select>
          <button onClick={() => setShowMyTestsOnly(!showMyTestsOnly)}
            style={{
              height: 30, padding: '0 8px', border: `1px solid ${showMyTestsOnly ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              borderRadius: 6, backgroundColor: showMyTestsOnly ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background))',
              color: showMyTestsOnly ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
            <User size={12} /> Mine
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {filteredTestCases.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>No tests match filter</div>
        ) : (
          filteredTestCases.map(tc => {
            const st = statusConfig[tc.current_status] || statusConfig.not_run;
            const StatusIcon = st.icon;
            const isSelected = tc.id === selectedTestCaseId;
            return (
              <button key={tc.id} onClick={() => onSelectTest(tc.id)}
                style={{
                  width: '100%', padding: '10px 10px', marginBottom: 2, border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid transparent',
                  borderRadius: 6, backgroundColor: isSelected ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, backgroundColor: st.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    <StatusIcon size={13} style={{ color: st.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--primary))' }}>{tc.test_case?.case_key}</span>
                    </div>
                    <p style={{
                      fontSize: 12, fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tc.test_case?.title}
                    </p>
                    {tc.current_status !== 'not_run' && tc.executed_at && (
                      <p style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #94A3B8)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {new Date(tc.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {tc.assignee?.full_name ? ` · ${tc.assignee.full_name.split(' ')[0]}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom progress */}
      <div style={{ padding: 12, borderTop: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Progress</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            {cycle.total_cases - cycle.not_run_count}/{cycle.total_cases}
          </span>
        </div>
        <div style={{ height: 5, backgroundColor: 'hsl(var(--muted))', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${cycle.progress_percent}%`, background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}
