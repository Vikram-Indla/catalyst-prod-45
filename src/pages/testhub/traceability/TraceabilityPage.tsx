import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import EmptyState from '@atlaskit/empty-state';
import Button from '@atlaskit/button/standard-button';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useTestHubProject } from '@/hooks/test-management/useTestHubProject';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
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
  // Live work-item metadata, joined from ph_issues on issue_key = external_key
  // (L002 / D045-046: was dead snapshot text; now real type + status + key link).
  issue_type: string | null;
  issue_status_category: string | null;
  issue_summary: string | null;
}

interface ReqGroup {
  reqKey: string;
  displayKey: string;
  displayTitle: string;
  issueType: string | null;
  issueStatusCategory: string | null;
  links: ReqLink[];
}

// ─── Work-item status helpers (ph_issues.status_category) ──────────────────────

function statusCategoryAppearance(cat: string | null): 'default' | 'inprogress' | 'success' {
  if (!cat) return 'default';
  const c = cat.toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'indeterminate' || c === 'in progress' || c === 'in_progress') return 'inprogress';
  return 'default';
}

function statusCategoryLabel(cat: string | null): string {
  if (!cat) return '';
  const c = cat.toLowerCase();
  if (c === 'done') return 'Done';
  if (c === 'indeterminate' || c === 'in progress' || c === 'in_progress') return 'In progress';
  if (c === 'new' || c === 'to do' || c === 'todo') return 'To do';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
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

      // L002 / D045-046: resolve live work-item metadata by joining ph_issues on
      // issue_key = external_key. The snapshot columns (external_title) are frozen
      // at link time; ph_issues carries the current type / status / summary.
      const extKeys = [...new Set(projectLinks.map((l: any) => l.external_key).filter(Boolean))] as string[];
      const issueByKey = new Map<string, { issue_type: string | null; status_category: string | null; summary: string | null }>();
      if (extKeys.length > 0) {
        const { data: issues, error: issuesError } = await supabase
          .from('ph_issues')
          .select('issue_key, issue_type, status_category, summary')
          .in('issue_key', extKeys);
        if (issuesError) throw issuesError;
        for (const i of (issues ?? [])) {
          issueByKey.set(i.issue_key, {
            issue_type: i.issue_type ?? null,
            status_category: i.status_category ?? null,
            summary: i.summary ?? null,
          });
        }
      }

      return projectLinks.map((l: any) => {
        const live = l.external_key ? issueByKey.get(l.external_key) : undefined;
        return {
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
          issue_type: live?.issue_type ?? null,
          issue_status_category: live?.status_category ?? null,
          issue_summary: live?.summary ?? null,
        };
      });
    },
    enabled: !!projectId,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TraceabilityPage() {
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const { projectId: defaultId, projects, isLoading: projLoading } = useTestHubProject();
  // Resolve the route's project; fall back to the resolver default (real
  // active Test Space) only when the route key matches nothing (legacy no-key URL).
  const projectId =
    (projectKey ? projects.find((p: any) => p.key === projectKey)?.id : undefined) ?? defaultId;

  const { data: links = [], isLoading: linksLoading } = useTraceability(projectId);
  const isLoading = projLoading || linksLoading;
  const [view, setView] = useState<'grid' | 'hierarchy' | 'matrix'>('grid');

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
          // Prefer the live ph_issues summary over the frozen snapshot title.
          displayTitle: l.issue_summary ?? l.external_title ?? `${l.requirement_type} (internal)`,
          issueType: l.issue_type,
          issueStatusCategory: l.issue_status_category,
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

  // ─── JiraTable columns (canonical) ───────────────────────────────────────────
  // A fixed 3-column coverage shape: Requirement · Test cases · Coverage. This is
  // NOT a dynamic per-cycle matrix, so it maps 1:1 onto JiraTable's Column<TRow>
  // API (no per-row dynamic columns needed). Cell content is preserved verbatim
  // from the prior DynamicTable render — JiraIssueTypeIcon + status_category
  // Lozenge + clickable key link + live summary, plus the per-case chips and the
  // coverage Lozenge (appearance computed per row inside the cell).
  const columns: Column<ReqGroup>[] = [
    {
      id: 'requirement',
      label: 'Requirement',
      width: 25,
      alwaysVisible: true,
      cell: ({ row: g }) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {g.issueType && (
            <span style={{ flexShrink: 0, display: 'inline-flex' }}>
              <JiraIssueTypeIcon type={g.issueType} size={16} />
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {g.displayKey && g.displayKey !== g.displayTitle && (
                g.reqKey.startsWith('ext:') || g.issueType ? (
                  <Link
                    to={`/browse/${g.displayKey}`}
                    style={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-link)', fontWeight: 500, textDecoration: 'none' }}
                  >
                    {g.displayKey}
                  </Link>
                ) : (
                  <span style={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtle)', fontWeight: 500 }}>
                    {g.displayKey}
                  </span>
                )
              )}
              {g.issueStatusCategory && (
                <Lozenge appearance={statusCategoryAppearance(g.issueStatusCategory)}>
                  {statusCategoryLabel(g.issueStatusCategory)}
                </Lozenge>
              )}
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={g.displayTitle}>
              {g.displayTitle}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'test-cases',
      label: 'Test cases',
      flex: true,
      cell: ({ row: g }) => (
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
      id: 'coverage',
      label: 'Coverage',
      width: 18,
      cell: ({ row: g }) => {
        const passCount = g.links.filter(l => l.exec_status === 'passed').length;
        const failCount = g.links.filter(l => l.exec_status === 'failed').length;
        const covAppearance: 'removed' | 'success' | 'default' =
          failCount > 0 ? 'removed' : passCount === g.links.length ? 'success' : 'default';
        return (
          <Lozenge appearance={covAppearance}>
            {passCount}/{g.links.length} passing
          </Lozenge>
        );
      },
    },
  ];

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

            {groups.length === 0 ? (
              // D045-046: no header row when empty — a real EmptyState with a CTA
              // to the Repository, where a case's Requirements tab links work items.
              <EmptyState
                header="No requirements linked"
                description="Link work items to test cases to build a coverage matrix. Open a test case in the Repository, then use its Requirements tab to link from a work item."
                primaryAction={
                  <Button appearance="primary" href={`/testhub/${projectKey}/repository`}>
                    Go to Repository
                  </Button>
                }
              />
            ) : (
              <>
                {/* H5/H6 (CAT-TESTHUB-V2): grid / hierarchy / matrix view switch */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {(['grid', 'hierarchy', 'matrix'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      style={{
                        padding: '4px 12px', borderRadius: 4, cursor: 'pointer',
                        border: '1px solid var(--ds-border)',
                        background: view === v ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
                        color: view === v ? 'var(--ds-text-selected)' : 'var(--ds-text-subtle)',
                        fontSize: 'var(--ds-font-size-200)', fontWeight: view === v ? 600 : 400,
                        textTransform: 'capitalize',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {view === 'grid' && (
                  <JiraTable<ReqGroup>
                    columns={columns}
                    data={groups}
                    getRowId={g => g.reqKey}
                    showRowCount
                    totalRowCount={groups.length}
                  />
                )}
                {view === 'hierarchy' && <HierarchyView groups={groups} />}
                {view === 'matrix' && <MatrixView groups={groups} />}
              </>
            )}
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

// ─── H5: Hierarchy view — requirement → test case → latest run chain ──────────
function HierarchyView({ groups }: { groups: ReqGroup[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Set<string>>(new Set(groups.slice(0, 8).map((g) => g.reqKey)));
  const toggle = (k: string) => setOpen((prev) => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {groups.map((g) => {
        const expanded = open.has(g.reqKey);
        const cases = Array.from(new Map(g.links.map((l) => [l.test_case_id, l])).values());
        return (
          <div key={g.reqKey} style={{ border: '1px solid var(--ds-border)', borderRadius: 6, overflow: 'hidden' }}>
            <div
              onClick={() => toggle(g.reqKey)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: 'var(--ds-surface-sunken)' }}
            >
              <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)', width: 12 }}>{expanded ? '▾' : '▸'}</span>
              {g.issueType && <JiraIssueTypeIcon type={g.issueType} size={16} />}
              <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{g.displayKey}</span>
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.displayTitle}</span>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
                {cases.length} case{cases.length === 1 ? '' : 's'}
              </span>
            </div>
            {expanded && (
              <div style={{ padding: '4px 0' }}>
                {cases.map((l) => (
                  <div
                    key={l.test_case_id}
                    onClick={() => l.case_key && navigate(`/testhub/repository/case/${l.case_key}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px 6px 40px', cursor: l.case_key ? 'pointer' : 'default',
                      fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', width: 76 }}>{l.case_key ?? '—'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ds-text-subtle)' }}>{l.case_title ?? '—'}</span>
                    <Lozenge appearance={execAppearance(l.exec_status)}>{execLabel(l.exec_status)}</Lozenge>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── H6: Coverage matrix — requirements × coverage verdict heat cells ─────────
function MatrixView({ groups }: { groups: ReqGroup[] }) {
  const verdict = (g: ReqGroup): { label: string; bg: string; fg: string } => {
    const statuses = g.links.map((l) => (l.exec_status ?? '').toLowerCase());
    if (statuses.some((s) => s === 'failed')) return { label: 'Failed', bg: 'var(--ds-background-danger)', fg: 'var(--ds-text-danger)' };
    if (statuses.some((s) => s === 'blocked')) return { label: 'Blocked', bg: 'var(--ds-background-warning)', fg: 'var(--ds-text-warning)' };
    if (statuses.length > 0 && statuses.every((s) => s === 'passed' || s === 'skipped')) return { label: 'Passed', bg: 'var(--ds-background-success)', fg: 'var(--ds-text-success)' };
    if (statuses.every((s) => !s || s === 'not_run')) return { label: 'Not run', bg: 'var(--ds-background-neutral)', fg: 'var(--ds-text-subtle)' };
    return { label: 'Partial', bg: 'var(--ds-background-information)', fg: 'var(--ds-text-information)' };
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
      {groups.map((g) => {
        const v = verdict(g);
        const caseCount = new Set(g.links.map((l) => l.test_case_id)).size;
        return (
          <div key={g.reqKey} style={{ border: '1px solid var(--ds-border)', borderRadius: 6, padding: 10, background: v.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {g.issueType && <JiraIssueTypeIcon type={g.issueType} size={14} />}
              <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>{g.displayKey}</span>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }} title={g.displayTitle}>
              {g.displayTitle}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: v.fg }}>{v.label}</span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>{caseCount} case{caseCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
