/**
 * TestCasesSection — inline "Test cases" section for the Story detail view.
 *
 * Pattern mirrors LinkedWorkItemsSection: collapsible header with count, empty
 * state with a gray "Add test cases" CTA, and a compact table of the story's
 * test cases once they exist.
 *
 * Data model:
 *   Row source is `tm_test_cases` filtered by `linked_story_key = <storyKey>`.
 *   Steps live in `tm_test_steps` (same as testhub). Priority/type foreign
 *   keys use the default IDs testhub's `useCreateTestCase` writes so this
 *   section's rows are indistinguishable from testhub-created rows.
 *
 * AI generation:
 *   Add-click invokes the `ai-generate-story-test-cases` edge function with
 *   the story's summary + description + acceptance criteria. The edge fn
 *   enforces the max-10 / 100%-coverage prompt rules and returns validated
 *   JSON. Rows + steps are batch-inserted with `is_ai_generated = true` and
 *   `linked_story_key = storyKey`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import AddIcon from '@atlaskit/icon/core/add';
import CloseIcon from '@atlaskit/icon/core/close';
// Canonical AI-generation affordance: rotating rainbow border + bouncing
// dots + typewriter caret. Same als-* classes AiLinkSimilarPanel and
// AiSuggestChildrenPanel use — do NOT duplicate the animation styles.
import '../dialogs/story-detail-modules/ai-link-similar-panel.css';
import './test-cases.css';

const GENERATING_COPY = 'Generating test cases';

const DEFAULT_PRIORITY_ID = '00000000-0000-0000-0001-000000000003'; // Medium
const DEFAULT_TYPE_ID = '00000000-0000-0000-0002-000000000001'; // Functional

const PRIORITY_ID_BY_NAME: Record<string, string> = {
  critical: '00000000-0000-0000-0001-000000000001',
  high: '00000000-0000-0000-0001-000000000002',
  medium: '00000000-0000-0000-0001-000000000003',
  low: '00000000-0000-0000-0001-000000000004',
};

type CaseStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'DEPRECATED';
type DbCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';

const statusToDb: Record<CaseStatus, DbCaseStatus> = {
  DRAFT: 'draft',
  REVIEW: 'ready',
  APPROVED: 'approved',
  DEPRECATED: 'deprecated',
};

const statusFromDb: Record<DbCaseStatus, CaseStatus> = {
  draft: 'DRAFT',
  ready: 'REVIEW',
  approved: 'APPROVED',
  deprecated: 'DEPRECATED',
};

// Lozenge appearances for the four CaseStatus values.
function statusAppearance(s: CaseStatus): 'default' | 'inprogress' | 'success' | 'removed' {
  switch (s) {
    case 'APPROVED':
      return 'success';
    case 'REVIEW':
      return 'inprogress';
    case 'DEPRECATED':
      return 'removed';
    default:
      return 'default';
  }
}

interface StoryTestCaseRow {
  id: string;
  case_key: string;
  title: string;
  status: CaseStatus;
  priority_id: string | null;
  is_ai_generated: boolean;
}

interface GeneratedCasePayload {
  title: string;
  objective: string;
  preconditions: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: CaseStatus;
  steps: {
    step_number: number;
    action: string;
    test_data?: string;
    expected_result: string;
  }[];
}

/** Mirror of testhub's `generateCaseKey` (duplicated so this section doesn't
 *  depend on hooks in @/hooks/test-management/*). Falls back to a count-based
 *  key when the RPC is unavailable. */
async function nextCaseKey(tmProjectId: string): Promise<string> {
  const { data, error } = await supabase.rpc('tm_next_entity_key', {
    p_prefix: 'TC',
    p_project_id: tmProjectId,
  });
  if (!error && data) return data as string;
  const { count } = await supabase
    .from('tm_test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', tmProjectId);
  return `TC-${String((count || 0) + 1).padStart(3, '0')}`;
}

/** Resolve (or auto-create) the tm_projects row that owns test cases for
 *  this Catalyst project. Testhub uses a separate `tm_projects` table keyed
 *  by the same short code (BAU, PORTFOLIO, etc.). If no tm_project matches
 *  the caller's projectKey, create one so the story's tests have a home.
 *  Returns the tm_projects.id UUID. */
async function resolveTmProjectId(
  projectKey: string,
  fallbackName: string,
): Promise<string> {
  if (!projectKey) throw new Error('projectKey is required');
  const { data: existing, error: selErr } = await supabase
    .from('tm_projects')
    .select('id')
    .eq('key', projectKey)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing.id as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: created, error: insErr } = await supabase
    .from('tm_projects')
    .insert({
      key: projectKey,
      name: fallbackName || projectKey,
      is_active: true,
      created_by: user?.id ?? null,
    } as any)
    .select('id')
    .single();
  if (insErr) throw insErr;
  return (created as any).id as string;
}

export interface TestCasesSectionProps {
  storyKey: string;
  storySummary: string;
  storyDescription: string;
  acceptanceCriteria?: string;
  /** Catalyst project short code (e.g. "BAU"). Used to look up (or create)
   *  the matching `tm_projects` row that owns this story's test cases. */
  projectKey: string;
  /** Optional display name — used only when auto-creating the tm_projects row. */
  projectName?: string;
  onOpenCase?: (caseId: string) => void;
}

export function TestCasesSection({
  storyKey,
  storySummary,
  storyDescription,
  acceptanceCriteria,
  projectKey,
  projectName,
  onOpenCase,
}: TestCasesSectionProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const bodyId = `tc-body-${storyKey}`;

  const openCase = (caseId: string) => {
    if (onOpenCase) {
      onOpenCase(caseId);
      return;
    }
    // Testhub Repository page owns the CaseDrawer / CatalystViewTestCase
    // detail. Same route the backlog and kanban use to open a test case
    // (see BacklogPage.atlaskit.tsx: `?case=<id>`).
    navigate(`/testhub/repository?case=${caseId}`);
  };

  // P1-S10b: read via tm_requirement_links (external_key + requirement_type='story'),
  // the same table+match TestCoveragePanel.tsx already reads — single link model,
  // not the disconnected tm_test_cases.linked_story_key column (D-009).
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['storyTestCases', storyKey],
    enabled: !!storyKey,
    queryFn: async (): Promise<StoryTestCaseRow[]> => {
      const { data: links, error: linksError } = await supabase
        .from('tm_requirement_links')
        .select('test_case_id')
        .eq('external_key', storyKey)
        .eq('requirement_type', 'story');
      if (linksError) throw linksError;
      const caseIds = Array.from(new Set((links ?? []).map((l: { test_case_id: string }) => l.test_case_id)));
      if (caseIds.length === 0) return [];

      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, status, priority_id, is_ai_generated')
        .in('id', caseIds)
        .eq('archived', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        case_key: r.case_key,
        title: r.title,
        status: statusFromDb[(r.status as DbCaseStatus) ?? 'draft'] ?? 'DRAFT',
        priority_id: r.priority_id ?? null,
        is_ai_generated: !!r.is_ai_generated,
      }));
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['storyTestCases', storyKey] });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!projectKey) throw new Error('projectKey is required to create test cases');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 0. tm_test_cases and tm_key_sequences FK to tm_projects (NOT the
      //    Catalyst `projects` table). Resolve the matching tm_projects row
      //    by projectKey; auto-create when the project has never been used
      //    in testhub before so the story's tests have a home.
      const tmProjectId = await resolveTmProjectId(
        projectKey,
        projectName ?? projectKey,
      );

      // 1. Ask the edge function for the case list. It enforces the 10-case
      //    ceiling and the 100%-coverage prompt.
      const { data, error } = await supabase.functions.invoke(
        'ai-generate-story-test-cases',
        {
          body: {
            story_key: storyKey,
            story_summary: storySummary,
            story_description: storyDescription,
            acceptance_criteria: acceptanceCriteria ?? '',
          },
        },
      );
      if (error) throw new Error(error.message || 'AI generation failed');
      if (data?.error) throw new Error(data.message || data.error);
      const cases: GeneratedCasePayload[] = Array.isArray(data?.test_cases)
        ? data.test_cases
        : [];
      if (cases.length === 0) throw new Error('AI returned no test cases');

      // 1b. Resolve the story's ph_issues.id once (best-effort — the reader
      //     only requires external_key, so a miss here doesn't block generation).
      const { data: storyIssue } = await supabase
        .from('ph_issues')
        .select('id')
        .eq('issue_key', storyKey)
        .maybeSingle();
      const storyIssueId = (storyIssue as any)?.id ?? null;

      // 2. Insert cases + steps sequentially so each case_key is unique.
      const now = new Date().toISOString();
      let inserted = 0;
      const insertedIds: string[] = [];
      for (const c of cases) {
        const caseKey = await nextCaseKey(tmProjectId);
        const { data: inserted_row, error: caseErr } = await supabase
          .from('tm_test_cases')
          .insert({
            project_id: tmProjectId,
            case_key: caseKey,
            title: c.title,
            description: c.objective || null,
            preconditions: c.preconditions || null,
            status: statusToDb[c.status] ?? 'draft',
            priority_id: PRIORITY_ID_BY_NAME[c.priority] ?? DEFAULT_PRIORITY_ID,
            case_type_id: DEFAULT_TYPE_ID,
            version: 1,
            created_by: user.id,
            assigned_to: user.id,
            is_ai_generated: true,
            ai_generation_prompt: `Story ${storyKey}: ${storySummary}`,
            ai_model: data?.model ?? null,
            ai_generated_at: now,
            linked_story_key: storyKey,
          } as any)
          .select('id')
          .single();
        if (caseErr) throw caseErr;
        const insertedId = (inserted_row as any).id as string;
        insertedIds.push(insertedId);

        if (c.steps.length > 0) {
          const stepsPayload = c.steps.map((s, i) => ({
            test_case_id: insertedId,
            step_number: i + 1,
            action: s.action,
            test_data: s.test_data ?? null,
            expected_result: s.expected_result,
          }));
          const { error: stepErr } = await supabase
            .from('tm_test_steps')
            .insert(stepsPayload);
          if (stepErr) throw stepErr;
        }

        // P1-S10b: link into tm_requirement_links (the table the reader now
        // uses) instead of relying solely on the tm_test_cases.linked_story_key
        // column set above.
        const { error: linkErr } = await supabase.rpc('tm_link_requirement', {
          p_case_id: insertedId,
          p_requirement_type: 'story',
          p_requirement_id: storyIssueId,
          p_external_key: storyKey,
          p_external_title: storySummary,
          p_link_type: 'verifies',
        });
        if (linkErr) throw linkErr;

        inserted += 1;
      }
      return { inserted, firstId: insertedIds[0] ?? null };
    },
    onSuccess: ({ inserted, firstId }) => {
      // Canonical flag pattern — mirrors CreateReleaseModal's success flag:
      // title + View + Copy link actions. When firstId is present the View
      // action opens the testhub Repository page with the case drawer
      // preloaded (same route the backlog + kanban use for test cases).
      const label = `${inserted} test case${inserted === 1 ? '' : 's'} for ${storyKey}`;
      if (firstId) {
        const url = `${window.location.origin}/testhub/repository?case=${firstId}`;
        catalystToast.show({
          type: 'success',
          title: `You've generated ${label}`,
          actions: [
            {
              label: 'View',
              onClick: () => window.open(url, '_blank', 'noopener,noreferrer'),
            },
            {
              label: 'Copy link',
              onClick: () => {
                void navigator.clipboard.writeText(url);
              },
            },
          ],
          duration: 6000,
        });
      } else {
        catalystToast.success(`Generated ${label}`);
      }
      setExpanded(true);
      invalidate();
    },
    onError: (err: any) => {
      const message =
        err?.message ??
        (typeof err === 'string' ? err : 'Unknown error');
      catalystToast.show({
        type: 'error',
        title: 'Failed to generate test cases',
        message,
        actions: [
          {
            label: 'Retry',
            onClick: () => generateMutation.mutate(),
          },
        ],
        duration: 6000,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ archived: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success('Test case removed');
      invalidate();
    },
    onError: (err: any) =>
      catalystToast.error('Failed to remove test case', err?.message),
  });

  const count = rows.length;
  const isGenerating = generateMutation.isPending;

  // Typewriter caret for the canonical AI-generation frame. Re-runs whenever
  // isGenerating flips true, resets on completion. Mirrors AiLinkSimilarPanel.
  const [typedText, setTypedText] = useState('');
  useEffect(() => {
    if (!isGenerating) {
      setTypedText('');
      return;
    }
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      i += 1;
      if (i > GENERATING_COPY.length) {
        clearInterval(interval);
        return;
      }
      setTypedText(GENERATING_COPY.substring(0, i));
    }, 55);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const generate = () => {
    if (!projectKey) {
      catalystToast.error('This story has no project — cannot create test cases');
      return;
    }
    generateMutation.mutate();
  };

  const loadingFrame = (
    <div
      className="als-loading-frame tcs-loading-frame"
      role="status"
      aria-live="polite"
    >
      <span className="als-bouncing-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span
        style={{
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text-subtle)',
        }}
      >
        {typedText}
        <span className="als-typewriter-caret" aria-hidden="true" />
      </span>
      <span className="sr-only">Generating test cases</span>
    </div>
  );

  return (
    <div className="tcs-root" data-story-key={storyKey}>
      <div className="tcs-header">
        <div className="tcs-header__left">
          <Tooltip content={expanded ? 'Collapse' : 'Expand'} position="bottom">
            <button
              type="button"
              className="tcs-header__toggle"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              aria-controls={bodyId}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronDownIcon label="" color="var(--ds-text-subtle)" />
              ) : (
                <ChevronRightIcon label="" color="var(--ds-text-subtle)" />
              )}
            </button>
          </Tooltip>
          <h2
            className="tcs-header__title"
            onClick={() => setExpanded((e) => !e)}
          >
            Test cases
          </h2>
          {count > 0 && (
            <span className="tcs-header__count" aria-label={`${count} test cases`}>
              {count}
            </span>
          )}
        </div>
        {/* Coverage chip — parity with the legacy TestCoveragePanel. When no
            test cases are linked to this story, show a "NOT COVERED" pill so
            reviewers can spot the coverage gap without expanding the section. */}
        {!isLoading && !isGenerating && count === 0 && (
          <span className="tcs-header__coverage" aria-label="No test coverage">
            <Lozenge appearance="default">Not covered</Lozenge>
          </span>
        )}
        {expanded && count > 0 && !isGenerating && (
          <button
            type="button"
            className="tcs-header__add"
            onClick={generate}
            aria-label="Add test cases"
            title="Add test cases with AI"
          >
            <AddIcon size="small" label="" primaryColor="var(--ds-icon)" />
            <span>Add test cases</span>
          </button>
        )}
      </div>

      {/* Canonical AI loading frame — rotating rainbow border + bouncing dots
          + typewriter caret. Same als-* affordance AiLinkSimilarPanel and
          AiSuggestChildrenPanel use so every AI-generation surface reads the
          same. Rendered inside the section (below the header, above rows). */}
      {isGenerating && (
        <div className="tcs-body">{loadingFrame}</div>
      )}

      {/* Empty-state CTA sits outside the collapse gate so users can trigger
          generation without expanding first — mirrors LinkedWorkItems. Hides
          while isGenerating; the animated frame owns the affordance then. */}
      {!isLoading && count === 0 && !isGenerating && (
        <button
          type="button"
          className="tcs-add-link"
          onClick={generate}
        >
          Add test cases
        </button>
      )}

      {expanded && (
        <div id={bodyId} className="tcs-body">
          {isLoading && (
            <div className="tcs-skeleton" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="tcs-skeleton__row" />
              ))}
            </div>
          )}
          {!isLoading && count > 0 && (
            <div className="tcs-group__rows">
              {rows.map((r) => (
                <div key={r.id} className="tcs-row" role="listitem">
                  <button
                    type="button"
                    className="tcs-row__key"
                    onClick={() => openCase(r.id)}
                    aria-label={`Open ${r.case_key} — ${r.title}`}
                  >
                    {r.case_key}
                  </button>
                  <button
                    type="button"
                    className="tcs-row__title"
                    onClick={() => openCase(r.id)}
                    title={r.title}
                  >
                    {r.title}
                  </button>
                  <span className="tcs-row__status">
                    <Lozenge appearance={statusAppearance(r.status)}>
                      {r.status}
                    </Lozenge>
                  </span>
                  <span className="tcs-row__actions">
                    <button
                      type="button"
                      className="tcs-row__action-btn"
                      onClick={() => removeMutation.mutate(r.id)}
                      disabled={removeMutation.isPending}
                      aria-label={`Remove ${r.case_key}`}
                      title="Remove test case"
                    >
                      <CloseIcon label="" size="small" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TestCasesSection;
