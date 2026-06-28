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
import { Box, Text, xcss } from '@atlaskit/primitives';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { useAiThemes } from '@/hooks/useAiThemes';
import { useThemeQuota } from '@/hooks/useThemeQuota';
import type { Project } from '@/hooks/useForYouData';
import ThemeCard from './ThemeCard';
import { CatyButton, CatyHead } from './CatyButton';
import { ForYouEmptyState } from './helpers';

// ─── A1 · Toolbar surface (Atlaskit primitives Box + xcss) ──────────────────
// Replaces the previous `<div style={{ paddingInline: 12, ... borderBlockEnd:
// `1px solid ${token(...)}` }}>` with a Box driven by space.* / border.*
// tokens. Keeps the same visual rhythm (12-8-12 inset, 1px hairline below)
// but every value resolves through @atlaskit/tokens — guaranteeing dark-mode
// + WCAG inheritance "for free". CLAUDE.md §1 / §10 surgical scope: only
// the header chrome changes; render-state branches below the header keep
// their existing inline styles (those land in later commits).
const headerStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.150',
  flexWrap: 'wrap',
  paddingInline: 'space.150',
  paddingBlockStart: 'space.100',
  paddingBlockEnd: 'space.150',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
});

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

/**
 * Format the generation timestamp as an "As of HH:MM AM/PM today · cached"
 * label per product spec. Uses absolute clock time (not relative) so users
 * know exactly when the analysis ran — "As of 8:00 AM today" is immediately
 * actionable; "3 hours ago" requires mental arithmetic.
 *
 * Same-day    → "As of 8:00 AM today"
 * Yesterday   → "As of yesterday at 8:00 AM"
 * Older       → "As of Mon 12 May at 8:00 AM"
 */
function formatGeneratedAt(iso: string | undefined): string {
  if (!iso) return '';
  const generated = new Date(iso);
  if (isNaN(generated.getTime())) return '';

  const now = new Date();
  const timeStr = generated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 86_400_000);
  const generatedMidnight = new Date(
    generated.getFullYear(), generated.getMonth(), generated.getDate()
  );

  if (generatedMidnight >= todayMidnight) return `As of ${timeStr} today`;
  if (generatedMidnight >= yesterdayMidnight) return `As of yesterday at ${timeStr}`;

  const dateStr = generated.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return `As of ${dateStr} at ${timeStr}`;
}

/**
 * Skeleton placeholder card — shown during a cold load with no cached snapshot
 * to seed. Keeps the grid populated so the surface is never blank and never
 * collapses to a centered spinner. Pure ADS tokens; a subtle pulse conveys
 * "loading" without any text.
 */
function ThemeCardSkeleton() {
  const bar = (w: string, h = 12) => ({
    width: w,
    height: h,
    borderRadius: 4,
    background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
  });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: 8,
        border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        background: token('elevation.surface.raised', 'var(--ds-surface, #FFFFFF)'),
        animation: 'catyShimmerPulse 1.4s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={bar('48px', 20)} />
        <div style={bar('72px')} />
      </div>
      <div style={bar('70%', 16)} />
      <div style={bar('100%')} />
      <div style={bar('85%')} />
      <div style={bar('100%', 7)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={bar('96px', 30)} />
        <div style={bar('110px', 30)} />
      </div>
      <style>{`@keyframes catyShimmerPulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
    </div>
  );
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

  // Daily Re-analyze budget (3/day/user, Riyadh-day reset). Server enforces;
  // this drives the hover counter + locked state on the button.
  const quota = useThemeQuota();

  const handleReanalyze = useCallback(() => {
    if (quota.isExhausted || isRefreshing) return;
    refresh();
    // Server increments the quota inside the forceRefresh path; re-read after
    // a beat so the counter reflects the new "left" value.
    window.setTimeout(() => quota.refetch(), 1500);
  }, [quota, isRefreshing, refresh]);

  // ─── Header chrome (scope toggle + project picker + refresh) ──────────────

  const header = (
    <Box xcss={headerStyles}>
      {/* Hidden Caty mark + segmented scope control. The neutral pill
          background gives the two options equal visual weight so "By project"
          stops reading as secondary text — it's a real toggle, not a link. */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <CatyHead size={20} title="Caty themes" />
        <div
          role="group"
          aria-label="Theme scope"
          style={{
            display: 'inline-flex',
            gap: 2,
            padding: 4,
            background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
            borderRadius: 8,
          }}
        >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text size="small" color="color.text.subtle">
            Analysed {data.totalIssuesAnalyzed ?? 0}{' '}
            {(data.totalIssuesAnalyzed ?? 0) === 1 ? 'issue' : 'issues'} into{' '}
            {data.themes.length}{' '}
            {data.themes.length === 1 ? 'theme' : 'themes'}
          </Text>
          {/* Freshness chip — "As of 8:00 AM today · cached" */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            paddingInline: '6px',
            paddingBlock: '2px',
            borderRadius: 4,
            background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
            font: `400 11px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
            whiteSpace: 'nowrap',
          }}>
            {/* Green dot when data is fresh (within 2h); grey otherwise */}
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: (() => {
                if (!data.generatedAt) return token('color.icon.disabled', 'var(--ds-text-disabled, var(--ds-border-bold, #8590A2))');
                const ageMs = Date.now() - new Date(data.generatedAt).getTime();
                return ageMs < 2 * 3_600_000
                  ? token('color.icon.success', 'var(--ds-background-success-bold, #1F845A)')
                  : token('color.icon.disabled', 'var(--ds-text-disabled, #8590A2)');
              })(),
            }} />
            {formatGeneratedAt(data.generatedAt)}
            {data.cached ? ' · cached' : ''}
          </span>
        </div>
      )}

      {/* Re-analyze — the pulse-line Caty CTA. Idle reads "Re-analyze"; while
          running the label flips to "Thinking" with the animated EKG line +
          dots (motion lives ONLY here, never as a page-level takeover). The
          quota counter ("· N left") is hover-revealed; at zero the button
          locks with a polite tooltip. */}
      <CatyButton
        label="Re-analyze"
        size="compact"
        loading={isRefreshing}
        disabled={quota.isExhausted}
        onClick={handleReanalyze}
        title={
          quota.isExhausted
            ? "You've used all 3 re-analyses today — fresh themes return at 6:00 AM"
            : data?.no_delta
            ? 'No changes since last analysis — results are still current'
            : undefined
        }
        trailing={<span className="caty-btn__count">· {quota.remaining} left</span>}
      />
    </Box>
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

  // Cold load with no cached snapshot to seed. Never show a centered spinner +
  // "Clustering…" takeover — render the header (so Re-analyze still animates as
  // "Thinking") plus skeleton cards. The page is never blank.
  if (isLoading || (scope === 'project' && !projectKey)) {
    return (
      <div>
        {header}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 12,
            padding: 12,
          }}
          aria-busy="true"
          aria-label="Loading themes"
        >
          {[0, 1, 2].map((i) => (
            <ThemeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = error?.message ?? '';
    const isTimeout = msg.includes('ai_timeout') || msg.includes('timeout') || msg.includes('aborted');
    const title = isTimeout
      ? 'Theme analysis timed out'
      : msg.includes('rate_limited')
      ? 'AI Theme Analyzer is rate-limited'
      : msg.includes('credits_exhausted')
      ? 'AI Theme Analyzer is over its credit limit'
      : 'Could not analyse themes right now';
    const description = isTimeout
      ? 'The AI took longer than 30 seconds to cluster your issues. This usually happens during peak load. Try Re-analyze — it typically completes faster on a warm server.'
      : msg.includes('rate_limited')
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
