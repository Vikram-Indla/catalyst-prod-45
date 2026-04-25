/**
 * ThemeIssueList — drill-in list inside a ThemeCard.
 *
 * B6 · DynamicTable was replaced with a stacked Atlaskit list because the
 * theme card width (~400px when grid-3-up) cannot fit a 3-column table:
 * the key column wraps "BAU-5061" to two lines, the summary column wraps
 * Saudi-context lines to 4–5 lines, and the status lozenge column crunches
 * "READY FOR DEVELOPMENT" so the lozenge text becomes unreadable. A
 * single-column stack (key+status inline above, summary below) gives the
 * summary the FULL row width and lets the status sit shoulder-to-shoulder
 * with the key.
 *
 * Click-through
 * ─────────────
 *   The issue key is an @atlaskit/primitives Pressable that routes through
 *   useGlobalSearchStore.openDetail — same canonical StoryDetailModal entry
 *   For You uses for its row list. Drilling in from a theme lands the user
 *   in the identical detail UI as drilling in from Assigned/Recommended.
 *
 * Status lozenge
 * ──────────────
 *   Uses the Catalyst ADS StatusLozenge (NOT generic Atlaskit Lozenge).
 *   StatusLozenge enforces the 3-colour guardrail from CLAUDE.md §5
 *   (GREY · BLUE · GREEN). Status text is mapped through toStatusCategory
 *   so 'In Progress' / 'In Review' / 'Active' all collapse to BLUE; 'Done'
 *   / 'Closed' / 'Resolved' to GREEN; everything else GREY.
 *
 * Atlaskit-only typography contract
 * ─────────────────────────────────
 *   This file imports zero from `@/lib/typography`. Every type spec comes
 *   from @atlaskit/heading or @atlaskit/primitives Text via tokens. The
 *   key uses font.family.code via xcss; everything else flows through ADS
 *   primitives. This is the contract for the entire For You / AI Theme
 *   surface — no bespoke type scale anywhere.
 */
import React, { useEffect, useState } from 'react';
import { Box, Stack, Inline, Pressable, Text, xcss } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import Spinner from '@atlaskit/spinner';
import { StatusLozenge, toStatusCategory } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

// ─── Row container — divider via tokens ─────────────────────────────────────
// Each row sits on the raised card surface (NOT sunken — explicit user
// constraint from the B5 critique). The hairline divider is a single
// border-block-end rule resolved through color.border so dark-mode picks
// up the right hex without an override block. The last row's divider is
// suppressed via the :last-child pseudo so the list flush-fits the card's
// bottom edge.
const rowStyles = xcss({
  paddingBlock: 'space.150',
  borderBlockEndWidth: 'border.width',
  borderBlockEndStyle: 'solid',
  borderBlockEndColor: 'color.border',
  ':last-child': {
    borderBlockEndWidth: '0',
  },
});

// Pressable wrapping the issue key. We avoid hand-rolled <button> styles —
// Pressable inherits the ADS focus ring and high-contrast focus mode for
// free. Monospace font via the Atlaskit code family token; weight medium
// to keep the key visually anchored as the row's identifier.
const keyPressableStyles = xcss({
  color: 'color.link',
  fontFamily: 'font.family.code',
  font: 'font.body.small',
  fontWeight: 'font.weight.medium',
  paddingBlock: 'space.0',
  paddingInline: 'space.0',
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius',
  ':hover': {
    color: 'color.link.pressed',
  },
});

// Summary clamps to 2 lines via line-clamp so theme cards never grow
// vertically out of their grid track. Atlaskit primitives don't ship a
// truncate prop on Heading, so this xcss layer adds it via the standard
// -webkit-line-clamp idiom — token-resolved colour, no literal hex.
const summaryStyles = xcss({
  display: '-webkit-box',
  // @ts-expect-error — non-standard but required for line-clamp; safe per ADS guidance.
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  color: 'color.text',
});

// State wrappers (loading + empty) — keep typography ADS-pure via Text.
const stateMessageStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
  paddingBlock: 'space.150',
});

interface IssueRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  issue_type: string;
  project_key: string;
}

interface ThemeIssueListProps {
  issueKeys: string[];
}

export default function ThemeIssueList({ issueKeys }: ThemeIssueListProps) {
  const [rows, setRows] = useState<IssueRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (issueKeys.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, issue_type, project_key')
        .in('issue_key', issueKeys);
      if (cancelled) return;
      if (error) {
        console.error('[ThemeIssueList] ph_issues fetch failed:', error.message);
        setRows([]);
      } else {
        // Preserve input order so the row sequence matches what the LLM
        // returned — the model groups related issues adjacently and that
        // adjacency is meaningful signal.
        const byKey = new Map<string, IssueRow>();
        for (const r of (data ?? []) as IssueRow[]) byKey.set(r.issue_key, r);
        setRows(issueKeys.map(k => byKey.get(k)).filter((r): r is IssueRow => Boolean(r)));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [issueKeys]);

  if (loading) {
    return (
      <Box xcss={stateMessageStyles}>
        <Spinner size="small" />
        <Text size="small" color="color.text.subtle">
          Loading issues…
        </Text>
      </Box>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Box xcss={stateMessageStyles}>
        <Text size="small" color="color.text.subtle">
          No synced issue records for this theme yet.
        </Text>
      </Box>
    );
  }

  return (
    <Stack space="space.0">
      {rows.map((row) => (
        <Box key={row.id} xcss={rowStyles}>
          <Stack space="space.050">
            {/* Top line: key + status. Inline with spread="space-between"
                pushes status to the right edge while letting the key sit
                left — no fixed column that crunches "READY FOR
                DEVELOPMENT" into illegibility. */}
            <Inline space="space.100" alignBlock="center" spread="space-between">
              <Pressable
                xcss={keyPressableStyles}
                onClick={() => useGlobalSearchStore.getState().openDetail({
                  id: row.id,
                  itemType: row.issue_type,
                  projectKey: row.project_key,
                })}
                aria-label={`Open issue ${row.issue_key}`}
              >
                {row.issue_key}
              </Pressable>
              <StatusLozenge status={toStatusCategory(row.status)}>
                {row.status || 'To Do'}
              </StatusLozenge>
            </Inline>
            {/* Bottom line: summary. Heading at xsmall (12/16/600 in ADS) is
                the right scale here — hierarchically below the
                AiThemePanel page heading and the ThemeCard heading. The
                Heading itself accepts no truncation prop, so we wrap the
                child string in a Box span carrying the line-clamp xcss.
                Full text remains in `title` so hover/long-press users get
                the untruncated string. */}
            <Heading size="xsmall" as="p">
              <Box as="span" xcss={summaryStyles} title={row.summary}>
                {row.summary}
              </Box>
            </Heading>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
