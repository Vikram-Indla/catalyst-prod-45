import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import DynamicTable from '@atlaskit/dynamic-table';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useProjects } from '@/hooks/test-management/useProjects';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReqLink {
  id: string;
  requirement_type: string;
  requirement_id: string | null;
  external_key: string | null;
  external_title: string | null;
  link_type: string | null;
  test_case_id: string;
  case_key: string | null;
  case_title: string | null;
  exec_status: string | null;
}

interface ReqGroup {
  reqKey: string;
  displayKey: string;
  displayTitle: string;
  links: ReqLink[];
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function execAppearance(status: string | null): 'default' | 'inprogress' | 'success' | 'removed' | 'moved' {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'passed') return 'success';
  if (s === 'failed') return 'removed';
  if (s === 'blocked') return 'moved';
  if (s === 'in_progress') return 'inprogress';
  return 'default';
}

function execLabel(status: string | null): string {
  if (!status) return 'Not run';
  const map: Record<string, string> = {
    passed: 'Passed', failed: 'Failed', blocked: 'Blocked',
    in_progress: 'In progress', not_run: 'Not run', skipped: 'Skipped',
  };
  return map[status.toLowerCase()] ?? status;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

function useTraceability(projectId: string | undefined) {
  return useQuery({
    queryKey: ['traceability-matrix', projectId],
    queryFn: async (): Promise<ReqLink[]> => {
      if (!projectId) return [];

      const { data: links, error } = await supabase
        .from('tm_requirement_links')
        .select(`
          id,
          requirement_type,
          requirement_id,
          external_key,
          external_title,
          link_type,
          test_case_id,
          test_case:tm_test_cases!test_case_id!inner(case_key, title, status, project_id)
        `)
        .eq('test_case.project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const projectLinks = links ?? [];

      if (projectLinks.length === 0) return [];

      // P1-S11: latest run status per case, computed by v_tm_requirement_coverage
      // (TRC-004/009 — one coverage engine, not a client-side reimplementation).
      const caseIds = [...new Set(projectLinks.map((l: any) => l.test_case_id as string))];
      const { data: coverage, error: coverageError } = await supabase
        .from('v_tm_requirement_coverage')
        .select('test_case_id, latest_run_status')
        .in('test_case_id', caseIds);
      if (coverageError) throw coverageError;

      const latestByCase = new Map<string, string>();
      for (const c of (coverage ?? [])) {
        if (c.latest_run_status) latestByCase.set(c.test_case_id, c.latest_run_status);
      }

      return projectLinks.map((l: any) => ({
        id: l.id,
        requirement_type: l.requirement_type,
        requirement_id: l.requirement_id,
        external_key: l.external_key,
        external_title: l.external_title,
        link_type: l.link_type,
        test_case_id: l.test_case_id,
        case_key: l.test_case?.case_key ?? null,
        case_title: l.test_case?.title ?? null,
        exec_status: latestByCase.get(l.test_case_id) ?? null,
      }));
    },
    enabled: !!projectId,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TraceabilityPage() {
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const { data: projects = [], isLoading: projLoading } = useProjects();
  // Resolve the route's project; fall back to first project only when the
  // route key matches nothing (legacy no-key URL).
  const projectId = (projects.find((p: any) => p.key === projectKey) ?? projects[0])?.id;

  const { data: links = [], isLoading: linksLoading } = useTraceability(projectId);
  const isLoading = projLoading || linksLoading;

  const groups = useMemo((): ReqGroup[] => {
    const map = new Map<string, ReqGroup>();
    for (const l of links) {
      const key = l.requirement_id
        ? `${l.requirement_type}:${l.requirement_id}`
        : `ext:${l.external_key ?? ''}:${l.external_title ?? ''}`;
      if (!map.has(key)) {
        map.set(key, {
          reqKey: key,
          displayKey: l.external_key ?? l.requirement_type,
          displayTitle: l.external_title ?? `${l.requirement_type} (internal)`,
          links: [],
        });
      }
      map.get(key)!.links.push(l);
    }
    return Array.from(map.values());
  }, [links]);

  const totalCases = useMemo(() => new Set(links.map(l => l.test_case_id)).size, [links]);
  const passed = useMemo(() => groups.filter(g => g.links.some(l => l.exec_status === 'passed')).length, [groups]);
  const failed = useMemo(() => groups.filter(g => g.links.some(l => l.exec_status === 'failed')).length, [groups]);

  const head = {
    cells: [
      { key: 'requirement', content: 'Requirement', width: 25 },
      { key: 'test-cases', content: 'Test cases' },
      { key: 'coverage', content: 'Coverage', width: 18 },
    ],
  };

  const rows = groups.map(g => {
    const passCount = g.links.filter(l => l.exec_status === 'passed').length;
    const failCount = g.links.filter(l => l.exec_status === 'failed').length;
    const covAppearance: 'removed' | 'success' | 'default' =
      failCount > 0 ? 'removed' : passCount === g.links.length ? 'success' : 'default';

    return {
      key: g.reqKey,
      cells: [
        {
          key: 'requirement',
          content: (
            <div>
              {g.displayKey && g.displayKey !== g.displayTitle && (
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-link)', fontWeight: 500, marginBottom: 0 }}>
                  {g.displayKey}
                </div>
              )}
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={g.displayTitle}>
                {g.displayTitle}
              </div>
            </div>
          ),
        },
        {
          key: 'test-cases',
          content: (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {g.links.map(l => (
                <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0px 8px', background: 'var(--ds-background-neutral)', borderRadius: 3 }}>
                  <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
                    {l.case_key ?? '—'}
                  </span>
                  <Lozenge appearance={execAppearance(l.exec_status)}>
                    {execLabel(l.exec_status)}
                  </Lozenge>
                </span>
              ))}
            </div>
          ),
        },
        {
          key: 'coverage',
          content: (
            <Lozenge appearance={covAppearance}>
              {passCount}/{g.links.length} passing
            </Lozenge>
          ),
        },
      ],
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--ds-font-family-body)', background: 'var(--ds-surface)', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="large" />
          </div>
        )}

        {!isLoading && (
          <>
            {groups.length > 0 && (
              <div style={{ display: 'flex', gap: 32, padding: '12px 0 20px', borderBottom: '1px solid var(--ds-border)', marginBottom: 16 }}>
                <Stat label="Requirements" value={groups.length} />
                <Stat label="Test cases linked" value={totalCases} />
                <Stat label="With passing run" value={passed} accent="success" />
                <Stat label="With failing run" value={failed} accent="danger" />
              </div>
            )}

            <DynamicTable
              head={head}
              rows={rows}
              isLoading={false}
              emptyView={
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ds-text-subtlest)' }}>
                  <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 500, marginBottom: 8 }}>No requirements linked</div>
                  <div style={{ fontSize: 'var(--ds-font-size-400)' }}>
                    Open a test case → Requirements tab → Link requirement to start tracking coverage.
                  </div>
                </div>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'success' | 'danger' }) {
  const color = accent === 'success' ? 'var(--ds-text-success)' : accent === 'danger' ? 'var(--ds-text-danger)' : 'var(--ds-text)';
  return (
    <div>
      <div style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 600, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>{label}</div>
    </div>
  );
}
