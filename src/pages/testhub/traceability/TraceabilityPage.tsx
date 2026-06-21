import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useProjects } from '@/hooks/test-management/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { CaseStatus } from '@/types/test-management';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedTestCase {
  id: string;
  case_key: string | null;
  title: string | null;
  status: CaseStatus | null;
  linked_work_item_id: string | null;
}

interface WorkItem {
  id: string;
  issue_key: string | null;
  summary: string | null;
  issue_type: string | null;
  status: string | null;
}

// ─── Status → Lozenge appearance ─────────────────────────────────────────────

function caseStatusAppearance(
  status: CaseStatus | null
): 'default' | 'inprogress' | 'success' | 'removed' {
  if (!status) return 'default';
  if (status === 'APPROVED') return 'success';
  if (status === 'REVIEW') return 'inprogress';
  if (status === 'DEPRECATED') return 'removed';
  return 'default';
}

function caseStatusLabel(status: CaseStatus | null): string {
  if (!status) return '—';
  const map: Record<CaseStatus, string> = {
    DRAFT: 'Draft',
    REVIEW: 'Review',
    APPROVED: 'Approved',
    DEPRECATED: 'Deprecated',
  };
  return map[status] ?? status;
}

// ─── Coverage badge ───────────────────────────────────────────────────────────

function CoveragePill({
  total,
  passing,
  failing,
}: {
  total: number;
  passing: number;
  failing: number;
}) {
  const appearance =
    failing > 0 ? 'removed' : passing === total ? 'success' : 'default';
  return (
    <Lozenge appearance={appearance}>
      {passing}/{total} passing
    </Lozenge>
  );
}

// ─── Fetch hooks ──────────────────────────────────────────────────────────────

function useLinkedTestCases(projectId: string | undefined) {
  return useQuery({
    queryKey: ['traceability-test-cases', projectId],
    queryFn: async (): Promise<LinkedTestCase[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, status, linked_work_item_id')
        .eq('project_id', projectId)
        .not('linked_work_item_id', 'is', null);

      if (error) throw error;
      return (data ?? []) as LinkedTestCase[];
    },
    enabled: !!projectId,
  });
}

function useWorkItems(ids: string[]) {
  return useQuery({
    queryKey: ['traceability-work-items', ids],
    queryFn: async (): Promise<WorkItem[]> => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, status')
        .in('id', ids);

      if (error) throw error;
      return (data ?? []) as WorkItem[];
    },
    enabled: ids.length > 0,
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TraceabilityPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id ?? undefined;

  const { data: testCases = [], isLoading: casesLoading } =
    useLinkedTestCases(projectId);

  // Unique linked work item IDs
  const linkedIds = useMemo(
    () => [
      ...new Set(
        testCases
          .map((tc) => tc.linked_work_item_id)
          .filter((id): id is string => id !== null)
      ),
    ],
    [testCases]
  );

  const { data: workItems = [], isLoading: itemsLoading } =
    useWorkItems(linkedIds);

  const isLoading = projectsLoading || casesLoading || itemsLoading;

  // ── Group test cases by work item ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const casesByItem = new Map<string, LinkedTestCase[]>();
    for (const tc of testCases) {
      if (!tc.linked_work_item_id) continue;
      const arr = casesByItem.get(tc.linked_work_item_id) ?? [];
      arr.push(tc);
      casesByItem.set(tc.linked_work_item_id, arr);
    }

    return workItems.map((wi) => ({
      workItem: wi,
      cases: casesByItem.get(wi.id) ?? [],
    }));
  }, [workItems, testCases]);

  // ── Coverage summary ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const covered = grouped.length;
    const withPassing = grouped.filter((g) =>
      g.cases.some((c) => c.status === 'APPROVED')
    ).length;
    const withFailing = grouped.filter((g) =>
      g.cases.some((c) => c.status === 'DEPRECATED')
    ).length;
    return { covered, withPassing, withFailing };
  }, [grouped]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--ds-font-family-body)',
        background: 'var(--ds-surface, #FFFFFF)',
        paddingTop: 16,
      }}
    >
      <ProjectPageHeader hubType="testhub" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {/* ── Loading ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 48,
            }}
          >
            <Spinner size="large" />
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!isLoading && grouped.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 24px',
              color: 'var(--ds-text-subtlest, #6B778C)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              No linked test cases
            </div>
            <div style={{ fontSize: 14 }}>
              Link test cases to work items in the test repository to see
              traceability coverage here.
            </div>
          </div>
        )}

        {/* ── Coverage summary ──────────────────────────────────────────── */}
        {!isLoading && grouped.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                gap: 24,
                padding: '12px 0 16px',
                borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                marginBottom: 16,
              }}
            >
              <SummaryStat
                label="Requirements covered"
                value={summary.covered}
              />
              <SummaryStat
                label="With passing tests"
                value={summary.withPassing}
                accent="success"
              />
              <SummaryStat
                label="With failing tests"
                value={summary.withFailing}
                accent="danger"
              />
            </div>

            {/* ── Matrix ─────────────────────────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr 130px',
                columnGap: 16,
              }}
              role="table"
              aria-label="Traceability matrix"
            >
              {/* Header */}
              <MatrixColHeader>Work item</MatrixColHeader>
              <MatrixColHeader>Linked test cases</MatrixColHeader>
              <MatrixColHeader>Coverage</MatrixColHeader>

              {/* Rows */}
              {grouped.map(({ workItem, cases }) => {
                const passingCount = cases.filter(
                  (c) => c.status === 'APPROVED'
                ).length;
                const failingCount = cases.filter(
                  (c) => c.status === 'DEPRECATED'
                ).length;

                return (
                  <React.Fragment key={workItem.id}>
                    {/* Work item cell */}
                    <MatrixCell>
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontFamily: 'var(--ds-font-family-code, monospace)',
                            color: 'var(--ds-link, #0052CC)',
                            fontWeight: 500,
                            marginBottom: 2,
                          }}
                        >
                          {workItem.issue_key ?? '—'}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: 'var(--ds-text, #172B4D)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 160,
                          }}
                          title={workItem.summary ?? undefined}
                        >
                          {workItem.summary ?? '—'}
                        </div>
                      </div>
                    </MatrixCell>

                    {/* Test cases cell */}
                    <MatrixCell>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {cases.length === 0 ? (
                          <span
                            style={{
                              fontSize: 13,
                              color: 'var(--ds-text-subtlest, #6B778C)',
                            }}
                          >
                            —
                          </span>
                        ) : (
                          cases.map((tc) => (
                            <span
                              key={tc.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '2px 8px',
                                background:
                                  'var(--ds-background-neutral, #F1F2F4)',
                                borderRadius: 3,
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily:
                                    'var(--ds-font-family-code, monospace)',
                                  color: 'var(--ds-text-subtle, #42526E)',
                                }}
                              >
                                {tc.case_key ?? '—'}
                              </span>
                              <Lozenge
                                appearance={caseStatusAppearance(tc.status)}
                              >
                                {caseStatusLabel(tc.status)}
                              </Lozenge>
                            </span>
                          ))
                        )}
                      </div>
                    </MatrixCell>

                    {/* Coverage cell */}
                    <MatrixCell>
                      {cases.length > 0 ? (
                        <CoveragePill
                          total={cases.length}
                          passing={passingCount}
                          failing={failingCount}
                        />
                      ) : (
                        '—'
                      )}
                    </MatrixCell>
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'success' | 'danger';
}) {
  const valueColor =
    accent === 'success'
      ? 'var(--ds-text-success, #216E4E)'
      : accent === 'danger'
      ? 'var(--ds-text-danger, #AE2A19)'
      : 'var(--ds-text, #172B4D)';

  return (
    <div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 653,
          color: valueColor,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--ds-text-subtlest, #6B778C)',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MatrixColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 653,
        color: 'var(--ds-text-subtlest, #6B778C)',
        padding: '8px 0',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

function MatrixCell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 14,
        color: 'var(--ds-text, #172B4D)',
        padding: '10px 0',
        borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children ?? '—'}
    </div>
  );
}
