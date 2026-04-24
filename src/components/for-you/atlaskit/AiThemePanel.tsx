/**
 * AiThemePanel — For You / AI Theme tab.
 *
 * Replaces the previous AI Recap tab (same slot in the tab strip).
 * Instead of a digest of today's actions, it surfaces a clustered view
 * of the user's open Jira issues — "what is my backlog about?" instead
 * of "what should I do today?".
 *
 * Scope model
 * ───────────
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [Personal]  [Project: ▾ Senaei BAU ▾]   [Re-analyze ⟳]   │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ Analysed 47 issues into 5 themes · updated 3 min ago     │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ ┌─────────────┐  ┌─────────────┐                         │
 *   │ │ Theme card  │  │ Theme card  │                         │
 *   │ └─────────────┘  └─────────────┘                         │
 *   │ ┌─────────────┐                                          │
 *   │ │ Theme card  │                                          │
 *   │ └─────────────┘                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 *   Scope toggle — two Atlaskit buttons that act as a segmented
 *   control. Personal = issues where assignee_id = me (no project
 *   selector needed). Project = one project, selector required.
 *
 * Load-more / pagination
 * ──────────────────────
 *   None. Themes are bounded by the Edge Function to 50 issues → max
 *   6 clusters. That fits one viewport. The "Load more" pattern that
 *   AssignedPanel uses doesn't apply here — there is no flat list.
 *
 * Minimum-dataset state
 * ─────────────────────
 *   Edge Function returns empty themes[] + totalIssuesAnalyzed < 5 when
 *   there aren't enough issues to cluster meaningfully. We render an
 *   explicit "Not enough activity yet" empty state so the user knows
 *   the system isn't broken — it's just quiet.
 *
 * CLAUDE.md §20 Jira parity escape hatch applies: this surface is
 * Catalyst-native (AI Theme Analyzer doesn't exist in Jira/Atlassian).
 * The probe/diff/patch/re-probe loop doesn't run here; the Catalyst
 * design token system is the source of truth instead.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Select from '@atlaskit/select';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import { useAiThemes } from '@/hooks/useAiThemes';
import type { Project } from '@/hooks/useForYouData';
import ThemeCard from './ThemeCard';
import { ForYouEmptyState } from './helpers';
import { type } from '@/lib/typography';

type Scope = 'personal' | 'project';

interface ProjectOption {
  value: string;
  label: string;
}

interface AiThemePanelProps {
  /**
   * Account-scoped project list, supplied by ForYouPage (single source
   * of truth via useForYouData). AiThemePanel intentionally does NOT
   * call useForYouData itself — doing so would mount a second full
   * instance of an expensive data pipeline and caused a runtime
   * "Cannot read properties of undefined (reading 'length')" crash
   * under certain load orderings. Accept the already-resolved list
   * as a prop instead.
   */
  allUserProjects: Project[];
}

// localStorage keys — keep the scope + selected project across refreshes
// so users don't have to re-pick every session. Namespaced under
// 'for-you:ai-theme:' so they don't collide with other panels.
const LS_SCOPE = 'for-you:ai-theme:scope';
const LS_PROJECT = 'for-you:ai-theme:project-key';

function formatGeneratedAt(iso: string | undefined): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export default function AiThemePanel({ allUserProjects }: AiThemePanelProps) {
  // NOTE: Previously this component called `useForYouData()` directly to
  // grab `allUserProjects`. That mounted a second full instance of an
  // expensive data pipeline (auth lookups, Supabase queries, set-state
  // effects) and — under certain mount-order interleavings — triggered
  // a runtime TypeError in a child component before the default array
  // had settled. We now accept the list as a prop, wired from the page
  // shell that already calls useForYouData once.

  const [scope, setScope] = useState<Scope>(() => {
    try {
      const v = localStorage.getItem(LS_SCOPE);
      return v === 'project' ? 'project' : 'personal';
    } catch { return 'personal'; }
  });

  const [projectKey, setProjectKey] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_PROJECT); } catch { return null; }
  });

  // Persist scope + project on change. Wrapped in try/catch for SSR /
  // privacy-mode browsers.
  useEffect(() => { try { localStorage.setItem(LS_SCOPE, scope); } catch { /* no-op */ } }, [scope]);
  useEffect(() => {
    try {
      if (projectKey) localStorage.setItem(LS_PROJECT, projectKey);
      else localStorage.removeItem(LS_PROJECT);
    } catch { /* no-op */ }
  }, [projectKey]);

  const projectOptions: ProjectOption[] = useMemo(
    () => (allUserProjects ?? []).map(p => ({ value: p.key, label: `${p.name} (${p.key})` })),
    [allUserProjects],
  );

  // Auto-select the first project if scope=project and no key is stored.
  // Prevents an in-scope hook call with an undefined projectKey from
  // returning project_key_required from the Edge Function.
  useEffect(() => {
    if (scope === 'project' && !projectKey && projectOptions.length > 0) {
      setProjectKey(projectOptions[0].value);
    }
  }, [scope, projectKey, projectOptions]);

  // The hook arg shape is a discriminated union — switch on scope so
  // TypeScript narrows projectKey to required-when-project.
  const themesHookArgs = useMemo(() => {
    if (scope === 'project') {
      return {
        scope: 'project' as const,
        projectKey: projectKey ?? '',
        enabled: Boolean(projectKey),
      };
    }
    return { scope: 'personal' as const, enabled: true };
  }, [scope, projectKey]);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refresh,
    isRefreshing,
    isBelowMinimumDataset,
  } = useAiThemes(themesHookArgs);

  const selectedOption = useMemo(
    () => projectOptions.find(o => o.value === projectKey) ?? null,
    [projectOptions, projectKey],
  );

  const handleScopeChange = useCallback((next: Scope) => {
    setScope(next);
  }, []);

  // ─── Header chrome (scope toggle + project picker + refresh) ──────────────

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        paddingInline: 12,
        paddingBlockStart: 8,
        paddingBlockEnd: 12,
        borderBlockEnd: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      {/* Segmented scope control — two Atlaskit buttons adjacent, first is
          primary when active. Subtle when inactive. Avoids a custom toggle. */}
      <div role="group" aria-label="Theme scope" style={{ display: 'inline-flex', gap: 4 }}>
        <Button
          appearance={scope === 'personal' ? 'primary' : 'subtle'}
          spacing="compact"
          onClick={() => handleScopeChange('personal')}
        >
          Assigned to me
        </Button>
        <Button
          appearance={scope === 'project' ? 'primary' : 'subtle'}
          spacing="compact"
          onClick={() => handleScopeChange('project')}
        >
          By project
        </Button>
      </div>

      {scope === 'project' && (
        <div style={{ minWidth: 260 }}>
          <Select<ProjectOption, false>
            inputId="ai-theme-project-select"
            value={selectedOption}
            options={projectOptions}
            onChange={(opt) => setProjectKey(opt?.value ?? null)}
            placeholder="Choose a project…"
            spacing="compact"
            isSearchable
            isClearable={false}
          />
        </div>
      )}

      <div style={{ flex: 1 }} />

      {data && !isLoading && Array.isArray(data.themes) && (
        <span style={{ ...type.meta, color: token('color.text.subtle', '#44546F') }}>
          Analysed {data.totalIssuesAnalyzed ?? 0}{' '}
          {(data.totalIssuesAnalyzed ?? 0) === 1 ? 'issue' : 'issues'} into {data.themes.length}{' '}
          {data.themes.length === 1 ? 'theme' : 'themes'} · {formatGeneratedAt(data.generatedAt)}
          {data.cached ? ' · cached' : ''}
        </span>
      )}

      <Button
        appearance="subtle"
        spacing="compact"
        onClick={() => refresh()}
        iconBefore={RefreshIcon}
        isDisabled={isLoading || isRefreshing}
      >
        {isRefreshing ? 'Re-analyzing…' : 'Re-analyze'}
      </Button>
    </div>
  );

  // ─── Render states ───────────────────────────────────────────────────────

  // Scope=project but no projects available (edge case: user has no
  // project memberships). Short-circuit before the loading spinner.
  if (scope === 'project' && projectOptions.length === 0 && !isLoading) {
    return (
      <div>
        {header}
        <ForYouEmptyState
          title="You are not a member of any project"
          description="Join a project to see its themes, or switch to Assigned to me to see themes across everything you own."
          primaryActionText="Switch to Assigned to me"
          onPrimaryAction={() => setScope('personal')}
        />
      </div>
    );
  }

  if (isLoading || (scope === 'project' && !projectKey)) {
    return (
      <div>
        {header}
        <div
          style={{
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Spinner size="small" />
          <span style={{ ...type.body, color: token('color.text.subtle', '#44546F') }}>
            Clustering your issues into themes…
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = error?.message ?? '';
    const title = msg.includes('rate_limited')
      ? 'AI Theme Analyzer is rate-limited'
      : msg.includes('credits_exhausted')
      ? 'AI Theme Analyzer is over its credit limit'
      : 'Could not analyse themes right now';
    const description = msg.includes('rate_limited')
      ? 'Too many theme analyses in a short window. Wait a minute and try Re-analyze.'
      : msg.includes('credits_exhausted')
      ? 'The AI Gateway credit pool is exhausted. An operator needs to top it up before themes will generate.'
      : 'We could not reach the theme analyzer. Try Re-analyze — transient failures usually clear within a minute.';
    return (
      <div>
        {header}
        <ForYouEmptyState
          title={title}
          description={description}
          primaryActionText="Retry"
          onPrimaryAction={() => refresh()}
        />
      </div>
    );
  }

  if (isBelowMinimumDataset) {
    return (
      <div>
        {header}
        <ForYouEmptyState
          title="Not enough activity to theme yet"
          description={
            scope === 'personal'
              ? "You have fewer than 5 open or recently updated issues assigned to you in the last 7 days. Themes need at least 5 issues to cluster meaningfully — come back when your plate fills up."
              : "This project has fewer than 5 issues updated in the last 7 days. Themes need at least 5 issues to cluster meaningfully."
          }
        />
      </div>
    );
  }

  if (!data || !Array.isArray(data.themes) || data.themes.length === 0) {
    return (
      <div>
        {header}
        <ForYouEmptyState
          title="No themes generated"
          description="The analyzer returned without grouping any issues. Try Re-analyze to regenerate."
          primaryActionText="Retry"
          onPrimaryAction={() => refresh()}
        />
      </div>
    );
  }

  // ─── Main grid ───────────────────────────────────────────────────────────
  // Two-column grid ≥760px, one-column narrower. The breakpoint matches
  // the For You page's maxWidth=1280 container minus padding — at that
  // width two 340-ish cards fit comfortably with an 16px gap.
  return (
    <div>
      {header}
      {isFetching && !isLoading && (
        <div
          style={{
            paddingInline: 12,
            paddingBlock: 8,
            ...type.meta,
            color: token('color.text.subtle', '#44546F'),
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Spinner size="xsmall" />
          Refreshing themes…
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 12,
          padding: 12,
        }}
      >
        {data.themes.map(theme => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>
    </div>
  );
}
