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
 *   View issues: toggles the in-card drill-in DynamicTable.
 *
 *   Copy summary: straight clipboard write of a markdown-formatted block
 *   — title, summary, 1 line per issue. Lets the user paste into Slack /
 *   WikiHub without leaving the page.
 *
 *   Note: a "Create Epic" deep-link sat between these two until April 2026.
 *   It was removed because the prefilled Jira create-issue form was a
 *   noisy hand-off — users already paste the Copy summary output into
 *   their own Epic flow. If a server-side OAuth-backed Create Epic lands
 *   later, restore it as the primary action.
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
import React, { useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { Box, xcss } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import ProgressBar from '@atlaskit/progress-bar';
import Button from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import { AvatarGroup } from '@/components/ads';
import { resolveAvatarUrl } from '@/lib/avatars';
import { supabase } from '@/integrations/supabase/client';
import { type } from '@/lib/typography';
import type { Theme, ThemeIntent } from '@/hooks/useAiThemes';
import ThemeIssueList from './ThemeIssueList';

// ─── A2 · Card surface (Atlaskit primitives Box + elevation tokens) ─────────
// Prior surface used `elevation.surface` (page-level white) — visually flat
// against the page. Promoted to `elevation.surface.raised` so the card reads
// as a floating layer. Border + shadow + radius all flow through tokens, so
// dark mode (NOCTURNE, CLAUDE.md §3) inherits without an override block.
//
// Radius note: original was 8px; Atlaskit token `border.radius.300` = 8px
// (canonical = 3px which is too tight for theme cards at this density).
//
// B2 · Hover/focus-within elevation
// ─────────────────────────────────
// On pointer hover OR when keyboard focus enters any descendant, the card
// promotes from elevation.shadow.raised → elevation.shadow.overlay. This is
// the standard ADS "interactive card" affordance — Linear, Jira, Notion all
// use the same shadow-up cue. Pure CSS via xcss nested pseudos so we avoid
// onMouseEnter/onMouseLeave state churn and React re-renders. Border
// strengthens to color.border.bold on the same trigger to reinforce the
// "this is reachable" signal at WCAG-friendly contrast (>3:1 against the
// raised surface). The 150ms ease transition declared above animates both
// box-shadow and border-color simultaneously.
//
// :focus-within (rather than :focus) is intentional — the card itself is not
// focusable, but its inner buttons are. focus-within lifts the card while
// any of its descendants holds keyboard focus, mirroring the visual pattern
// of the hover state for keyboard users.
const cardStyles = xcss({
  display: 'flex',
  flexDirection: 'column',
  gap: 'space.150',
  padding: 'space.200',
  borderRadius: 'border.radius.300',
  backgroundColor: 'elevation.surface.raised',
  borderColor: 'color.border',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  boxShadow: 'elevation.shadow.raised',
  transitionProperty: 'box-shadow, border-color',
  transitionDuration: '150ms',
  transitionTimingFunction: 'ease',
  // B1 anchor: relative positioning so the absolute intent ribbon attaches
  // to the card's edge; overflow: hidden so the ribbon respects the card's
  // border-radius and never bleeds past the corner.
  position: 'relative',
  overflow: 'hidden',
  ':hover': {
    boxShadow: 'elevation.shadow.overlay',
    borderColor: 'color.border.bold',
  },
  ':focus-within': {
    boxShadow: 'elevation.shadow.overlay',
    borderColor: 'color.border.bold',
  },
});

// ─── B5 · Expanded drill-in surface ─────────────────────────────────────────
// When the user reveals the issue table, we want the table region to read as
// a *different* surface from the card body — a "you've drilled in" cue. The
// ADS pattern for this is the sunken layer (elevation.surface.sunken,
// hex-equivalent ~#F7F8F9 light / ~#1D2125 dark), one step below the
// raised card.
//
// Layout
// ──────
// Card padding is space.200 (16px). To make the sunken zone extend to the
// card's left/right/bottom edges (instead of sitting as a smaller inset
// rectangle inside the padding), we apply negative inline + block-end
// margins of the same magnitude. Top border is the only divider — the
// card's own border + bottom radius wrap the rest. `overflow: hidden` on
// the card itself (set up in B1) keeps the sunken zone clipped to the
// card's border-radius, so the bottom-left/right corners read clean.
const drillInStyles = xcss({
  marginInline: 'space.negative.200',
  marginBlockEnd: 'space.negative.200',
  marginBlockStart: 'space.100',
  paddingInline: 'space.200',
  paddingBlock: 'space.150',
  backgroundColor: 'elevation.surface.sunken',
  borderTopWidth: 'border.width',
  borderTopStyle: 'solid',
  borderTopColor: 'color.border',
});

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

// ─── B1 · Intent ribbon → ADS semantic background tokens ───────────────────
// The 4px sticky left edge that gives each card an instant intent read at
// peripheral vision, even before the lozenge label registers. Token names
// match the Lozenge appearance family above, but use the *.bolder ramp so
// the ribbon stays legible against both light and dark page surfaces.
const INTENT_RIBBON: Record<ThemeIntent, { name: string; fallback: string }> = {
  bug:     { name: 'color.background.danger.bolder',    fallback: '#CA3521' },
  feature: { name: 'color.background.discovery.bolder', fallback: '#5E4DB2' },
  infra:   { name: 'color.background.brand.bolder',     fallback: '#0C66E4' },
  ux:      { name: 'color.background.warning.bolder',   fallback: '#B65C02' },
  data:    { name: 'color.background.success.bolder',   fallback: '#1F845A' },
  other:   { name: 'color.background.neutral.bolder',   fallback: '#626F86' },
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

// ─── B4 · Assignee fetch contract ──────────────────────────────────────────
// We need *just enough* of `ph_issues` to render an assignee avatar group:
// account_id (for dedup) and display_name (for initials + tooltip + avatar
// resolver lookup). The drill-in's ThemeIssueList already does its own
// fuller fetch when the user expands the card — these two queries do not
// overlap visually, and lifting one into the other would force ThemeIssueList
// to render a useless avatar column. We accept the second query in exchange
// for keeping the component scope surgical (one file, no ThemeIssueList edit).
interface AssigneeRow {
  assignee_account_id: string | null;
  assignee_display_name: string | null;
}

export default function ThemeCard({ theme, defaultExpanded = false }: ThemeCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [assignees, setAssignees] = useState<AssigneeRow[]>([]);

  const intent = INTENT_META[theme.intent] ?? INTENT_META.other;
  const progressValue = useMemo(() => Math.max(0, Math.min(1, theme.percentage / 100)), [theme.percentage]);

  // Fetch the assignee tuple for this theme's issues. We don't gate on
  // `expanded` — the avatar group lives in Row 1 and must render at first
  // paint so the card reads as "the cluster has people" before any
  // interaction. Fires once per mount (issueKeys identity is stable from
  // the LLM response).
  useEffect(() => {
    let cancelled = false;
    if (!theme.issueKeys || theme.issueKeys.length === 0) {
      setAssignees([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('assignee_account_id, assignee_display_name')
        .in('issue_key', theme.issueKeys);
      if (cancelled) return;
      if (error) {
        console.error('[ThemeCard] assignee fetch failed:', error.message);
        setAssignees([]);
        return;
      }
      setAssignees((data ?? []) as AssigneeRow[]);
    })();
    return () => { cancelled = true; };
  }, [theme.issueKeys]);

  // Dedup by account_id, preserving first-seen order. Account-id-less rows
  // (assignee unset) collapse into a single "Unassigned" entry only if they
  // dominate the cluster — otherwise they're suppressed so the avatar group
  // stays a "who's owning this" affordance, not a noise generator.
  const avatarData = useMemo(() => {
    const seen = new Set<string>();
    const items: { key: string; src?: string; name: string }[] = [];
    for (const row of assignees) {
      const id = row.assignee_account_id;
      const name = row.assignee_display_name;
      if (!id || !name) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        key: id,
        name,
        // Resolve through the canonical avatar chokepoint (CLAUDE.md §19).
        // Returns undefined when no local PNG matches; AvatarGroup then
        // falls back to initials, never to an external URL.
        src: resolveAvatarUrl(name) ?? undefined,
      });
    }
    return items;
  }, [assignees]);

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

  return (
    <Box xcss={cardStyles}>
      {/* B1 · Intent ribbon — 4px sticky left edge mapped to ADS semantic
          *.bolder tokens. The ribbon gives a peripheral-vision intent read
          at the page level, even before the lozenge label registers in
          the action toolbar. aria-hidden because INTENT_META lozenge below
          conveys the same information to assistive tech. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 4,
          backgroundColor: token(
            INTENT_RIBBON[theme.intent].name as Parameters<typeof token>[0],
            INTENT_RIBBON[theme.intent].fallback,
          ),
        }}
      />

      {/* ─── Row 1: avatar group + count/percentage ─────────────────────
          B1 · Lozenge previously sat here; relocated into the action toolbar
          so the top row reads as pure metadata.
          B4 · AvatarGroup renders unique assignees (deduped by
          assignee_account_id) on the left, count/percentage stays on the
          right. The two together turn Row 1 into a "who · how big"
          read — instantly answers the two questions a delivery manager
          asks first when scanning a theme cluster. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 24 }}>
        {avatarData.length > 0 ? (
          <AvatarGroup
            data={avatarData}
            size="small"
            maxCount={4}
            aria-label={`${avatarData.length} ${avatarData.length === 1 ? 'assignee' : 'assignees'} on this theme`}
          />
        ) : (
          // Empty <span/> as flex spacer so count/percentage stays
          // right-aligned even when no avatars resolved.
          <span aria-hidden="true" />
        )}
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
      {/* A3 · @atlaskit/heading replaces the bespoke `type.h4` styled <h3>.
          size="small" maps to the Atlaskit heading.small spec (16/20 700)
          and inherits color.text from the active theme automatically — no
          token() call needed at the JSX site. */}
      <Heading size="small" as="h3">
        {theme.name}
      </Heading>

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

      {/* ─── Row 3.5: B3 · issue-key chips ──────────────────────────────
          Surfaces the first three issue keys inside the card so the user
          can read "what's actually inside this theme" without expanding
          the drill-in. Mirrors Linear's cluster-card pattern.

          Why Lozenge appearance="default" rather than StatusLozenge:
          these are NOT statuses — they're identifiers, so the 3-colour
          guardrail (CLAUDE.md §5) does not apply. Atlaskit's neutral
          lozenge (grey/grey) is the canonical chrome for keys.

          Overflow: any keys beyond 3 collapse into a "+N more" lozenge
          so the chip row never wraps to two lines on the typical 3-up
          grid breakpoint. Clicking the row delegates to the existing
          `View issues` toggle so the user gets the full table without
          a second affordance to learn. The whole row is a single button
          for keyboard parity. */}
      {(theme.issueKeys?.length ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Show all ${theme.issueKeys?.length} issues in this theme`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: token('font.family.code', 'JetBrains Mono, ui-monospace, monospace'),
          }}
        >
          {(theme.issueKeys ?? []).slice(0, 3).map((key) => (
            <Lozenge key={key} appearance="default">
              {key}
            </Lozenge>
          ))}
          {(theme.issueKeys?.length ?? 0) > 3 && (
            <Lozenge appearance="default">
              +{(theme.issueKeys?.length ?? 0) - 3} more
            </Lozenge>
          )}
        </button>
      )}

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
        {/* Action toolbar — Lozenge + View issues + Copy summary.
            B1 · INTENT_META lozenge moved here from row 1, sits to the
            left of View issues so the action block reads
            [INTENT] [reveal] [utility]. View issues stays `default`
            (navigational reveal), Copy summary stays `subtle` (utility). */}
        <Lozenge appearance={intent.appearance}>{intent.label}</Lozenge>
        <Button
          spacing="compact"
          appearance="default"
          onClick={() => setExpanded(v => !v)}
          iconBefore={expanded ? ChevronDownIcon : ChevronRightIcon}
        >
          {expanded ? 'Hide issues' : 'View issues'}
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
      {/* B5 · Wrapped in a sunken Box that extends to the card edges via
          negative margins. The shift in elevation (raised → sunken) is the
          mental-model cue: "you have entered the data layer". Top border
          divider replaces the previous 1px hand-rolled <div> rule. */}
      {expanded && (
        <Box xcss={drillInStyles}>
          <ThemeIssueList issueKeys={theme.issueKeys ?? []} />
        </Box>
      )}
    </Box>
  );
}
