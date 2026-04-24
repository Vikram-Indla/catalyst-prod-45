/**
 * ThemeCard — one clustered theme in the AI Theme Analyzer grid.
 *
 * Layout
 * ──────
 *   ┌────────────────────────────────────────────────────┐
 *   │ [Intent lozenge]              [count] issues · N%  │
 *   │ Theme Name (3–5 words)                             │
 *   │ Two-sentence summary explaining the shared cause.  │
 *   │ ────────────────────────────── (progress bar)      │
 *   │ [ View issues ▾ ]  [ Create Epic ]  [ Copy summary]│
 *   └────────────────────────────────────────────────────┘
 *
 * Visual language sits inside the ADS palette only — no golden-hour, no
 * custom hexes. Intent colours map to Atlaskit semantic slots so the
 * surface inherits dark-mode / WCAG contrast "for free" when the theme
 * switches.
 *
 * Drill-in
 * ────────
 *   Expanding a card reveals a compact @atlaskit/dynamic-table of the
 *   theme's issues — issue key (link) · summary · status lozenge. Opening
 *   an issue routes through the canonical StoryDetailModal entry point
 *   (useGlobalSearchStore.openDetail), matching For You's Jira-parity
 *   convention — NOT the bespoke /issues/:key route.
 *
 * Actions
 * ───────
 *   Create Epic: MVP is clipboard-copy (theme name + summary + issueKeys)
 *   plus a deep link to the Jira "Create issue" form prefilled with the
 *   issue-type param. Full Atlassian OAuth + server-side create is
 *   tracked as a follow-up (see TaskCreate when touched).
 *
 *   Copy summary: straight clipboard write of a markdown-formatted block
 *   — title, summary, 1 line per issue. Lets the user paste into Slack /
 *   WikiHub without leaving the page.
 *
 * Status lozenge guardrail
 * ────────────────────────
 *   CLAUDE.md §5: the 3-colour StatusLozenge rule (GREY/BLUE/GREEN) applies
 *   ONLY to work-item status. Theme INTENT is a different axis — it uses
 *   @atlaskit/lozenge's full appearance range (inprogress/new/moved/
 *   success/default) so 'bug', 'ux', 'infra' etc. read as distinct.
 *   StatusLozenge wrapped inside ThemeIssueList DOES follow the 3-colour
 *   rule, because those are issue statuses.
 */
import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import ProgressBar from '@atlaskit/progress-bar';
import Button, { IconButton } from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import AddIcon from '@atlaskit/icon/glyph/add';
import { type } from '@/lib/typography';
import type { Theme, ThemeIntent } from '@/hooks/useAiThemes';
import ThemeIssueList from './ThemeIssueList';

// ─── Intent → Atlaskit lozenge mapping ──────────────────────────────────────
// Lozenge appearance values exposed by @atlaskit/lozenge v11: 'default' |
// 'inprogress' | 'moved' | 'new' | 'removed' | 'success'. Intent is a
// semantic axis distinct from work-item status — we use this library
// instead of StatusLozenge because StatusLozenge is locked to 3 colours
// (CLAUDE.md §5) and intent has 6 mutually-exclusive categories.
const INTENT_META: Record<ThemeIntent, { label: string; appearance: React.ComponentProps<typeof Lozenge>['appearance'] }> = {
  bug:     { label: 'Bugs',         appearance: 'removed' },    // red
  feature: { label: 'Features',     appearance: 'new' },        // purple
  infra:   { label: 'Infra',        appearance: 'inprogress' }, // blue
  ux:      { label: 'UX',           appearance: 'moved' },      // yellow
  data:    { label: 'Data',         appearance: 'success' },    // green
  other:   { label: 'Other',        appearance: 'default' },    // grey
};

// ─── Progress bar appearance (Atlaskit v4) ──────────────────────────────────
// 'default' = neutral blue bar. 'success' shifts to green once the theme
// dominates the dataset (≥50%) — visual signal that "this cluster IS your
// backlog right now, not just a slice". We deliberately don't wire this to
// intent because intent is already carried by the lozenge; overloading
// colour channels would dilute both signals.
function progressAppearance(percentage: number): React.ComponentProps<typeof ProgressBar>['appearance'] {
  if (percentage >= 50) return 'success';
  return 'default';
}

// ─── Clipboard action formatters ────────────────────────────────────────────
function formatThemeMarkdown(theme: Theme): string {
  const lines: string[] = [];
  lines.push(`## ${theme.name}`);
  lines.push('');
  lines.push(theme.summary);
  lines.push('');
  lines.push(`**${theme.count} issues (${theme.percentage}%) · intent: ${theme.intent}**`);
  lines.push('');
  lines.push('Issues:');
  for (const key of theme.issueKeys ?? []) lines.push(`- ${key}`);
  return lines.join('\n');
}

function buildJiraCreateUrl(theme: Theme): string {
  // MVP deep-link — Atlassian's "Create issue" form accepts prefilled
  // summary + description + issuetype as query params. The exact cloud
  // subdomain is env-scoped (jira.example.com is a placeholder used
  // throughout the app) — if Catalyst ever publishes a real Jira host
  // env var, thread it through here instead of hardcoding.
  const base = 'https://jira.example.com/secure/CreateIssue!default.jspa';
  const keys = theme.issueKeys ?? [];
  const body = [theme.summary, '', 'Linked issues:', ...keys.map(k => `- ${k}`)].join('\n');
  const params = new URLSearchParams({
    issuetype: '10000', // Epic — Jira default issue type id
    summary: theme.name,
    description: body,
  });
  return `${base}?${params.toString()}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface ThemeCardProps {
  theme: Theme;
  /**
   * When true the card opens into drill-in view on first render. Used by
   * the panel's "View issues" primary CTA to deep-link into a specific
   * theme from outside the card. Default false.
   */
  defaultExpanded?: boolean;
}

export default function ThemeCard({ theme, defaultExpanded = false }: ThemeCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const intent = INTENT_META[theme.intent] ?? INTENT_META.other;
  const progressValue = useMemo(() => Math.max(0, Math.min(1, theme.percentage / 100)), [theme.percentage]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatThemeMarkdown(theme));
      setCopyState('copied');
      // Revert the label after a beat so repeat copies still read as action.
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      // Clipboard API unavailable (older browsers, insecure contexts).
      // No-op — the user can fall back to selecting text manually.
    }
  };

  const handleCreateEpic = () => {
    // New tab so the user doesn't lose context on For You. Jira will
    // open its own workflow; we're just handing off the seed data.
    window.open(buildJiraCreateUrl(theme), '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: 8,
        background: token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
        // Match ForYouRow hover surface so cards feel like one family
        // across the page — no bespoke card chrome.
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
      }}
    >
      {/* ─── Row 1: intent lozenge + count/percentage ──────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Lozenge appearance={intent.appearance}>{intent.label}</Lozenge>
        <span
          style={{
            ...type.meta,
            color: token('color.text.subtle', '#44546F'),
            whiteSpace: 'nowrap',
          }}
        >
          {theme.count} {theme.count === 1 ? 'issue' : 'issues'} · {theme.percentage}%
        </span>
      </div>

      {/* ─── Row 2: theme name ─────────────────────────────────────────── */}
      <h3
        style={{
          ...type.h4,
          color: token('color.text', '#172B4D'),
          margin: 0,
        }}
      >
        {theme.name}
      </h3>

      {/* ─── Row 3: summary (2 sentences) ──────────────────────────────── */}
      <p
        style={{
          ...type.body,
          color: token('color.text.subtle', '#44546F'),
          margin: 0,
        }}
      >
        {theme.summary}
      </p>

      {/* ─── Row 4: progress bar ───────────────────────────────────────── */}
      <div aria-label={`Share of input issues: ${theme.percentage}%`}>
        <ProgressBar
          value={progressValue}
          appearance={progressAppearance(theme.percentage)}
          ariaLabel={`${theme.name}: ${theme.percentage}% of analysed issues`}
        />
      </div>

      {/* ─── Row 5: action toolbar ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          paddingBlockStart: 4,
        }}
      >
        <Button
          spacing="compact"
          appearance={expanded ? 'primary' : 'default'}
          onClick={() => setExpanded(v => !v)}
          iconBefore={expanded ? ChevronDownIcon : ChevronRightIcon}
        >
          {expanded ? 'Hide issues' : 'View issues'}
        </Button>
        <Button
          spacing="compact"
          appearance="default"
          onClick={handleCreateEpic}
          iconBefore={AddIcon}
        >
          Create Epic
        </Button>
        <Button
          spacing="compact"
          appearance="subtle"
          onClick={handleCopy}
          iconBefore={CopyIcon}
        >
          {copyState === 'copied' ? 'Copied' : 'Copy summary'}
        </Button>
      </div>

      {/* ─── Drill-in table (conditional) ──────────────────────────────── */}
      {expanded && (
        <div
          style={{
            paddingBlockStart: 8,
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}
        >
          <ThemeIssueList issueKeys={theme.issueKeys ?? []} />
        </div>
      )}
    </div>
  );
}
