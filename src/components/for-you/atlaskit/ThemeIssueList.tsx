/**
 * ThemeIssueList — drill-in table inside a ThemeCard.
 *
 * Fetches the real ph_issues rows for the theme's issueKeys in one .in()
 * query, then renders via @atlaskit/dynamic-table so the row chrome
 * (hover, sort affordances, keyboard focus) matches the rest of
 * Catalyst's widget tables exactly. No bespoke <table> markup.
 *
 * Click-through
 * ─────────────
 *   Clicking an issue key routes through useGlobalSearchStore.openDetail —
 *   the same canonical StoryDetailModal entry point For You uses for its
 *   row list. This means drilling in from a theme lands the user in the
 *   identical detail UI as drilling in from Assigned/Recommended,
 *   including the comment composer, attachments, timeline, etc.
 *
 * Status lozenge
 * ──────────────
 *   Uses the Catalyst ADS StatusLozenge (NOT the generic Atlaskit Lozenge
 *   used for theme intent). StatusLozenge enforces the 3-colour guardrail
 *   from CLAUDE.md §5 — "GREY · BLUE · GREEN, nothing else". Status text
 *   is mapped through toStatusCategory so 'In Progress', 'In Review',
 *   'Active' all collapse to BLUE; 'Done', 'Closed', 'Resolved' to GREEN;
 *   everything else grey.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { Box, Text, xcss } from '@atlaskit/primitives';
import Spinner from '@atlaskit/spinner';
import { DynamicTable, StatusLozenge, toStatusCategory } from '@/components/ads';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

// ─── A5 · Atlaskit-pure cell tokens ─────────────────────────────────────────
// Loading + empty wrappers used `paddingBlock: 12` literals and a `type.meta`
// font; switched to Box + xcss + Text so every value resolves through ADS.
// `type.*` import dropped from this file — DynamicTable cells now lean on
// the Atlaskit token chain for typography (size & color from primitives).
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

// Column widths total 100 (14 + 64 + 22). Saudi-context names + transliterated
// Arabic summary lines run long, so summary widens at the cost of key + status.
const HEAD = {
  cells: [
    { key: 'key',     content: 'Key',     isSortable: true,  width: 14 },
    { key: 'summary', content: 'Summary', isSortable: false, width: 64 },
    { key: 'status',  content: 'Status',  isSortable: true,  width: 22 },
  ],
};

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
        // returned. DynamicTable's `isSortable` gives the user click-sort
        // on Key/Status afterwards.
        const byKey = new Map<string, IssueRow>();
        for (const r of (data ?? []) as IssueRow[]) byKey.set(r.issue_key, r);
        setRows(issueKeys.map(k => byKey.get(k)).filter((r): r is IssueRow => Boolean(r)));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [issueKeys]);

  const tableRows = useMemo(() => {
    return (rows ?? []).map((row) => ({
      key: row.id,
      cells: [
        {
          key: 'key',
          content: (
            <button
              type="button"
              onClick={() => useGlobalSearchStore.getState().openDetail({
                id: row.id,
                itemType: row.issue_type,
                projectKey: row.project_key,
              })}
              style={{
                color: token('color.link', '#0C66E4'),
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: token('font.family.code', 'JetBrains Mono, ui-monospace, monospace'),
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {row.issue_key}
            </button>
          ),
        },
        {
          key: 'summary',
          content: (
            <span style={{ color: token('color.text', '#172B4D') }}>
              {row.summary}
            </span>
          ),
        },
        {
          key: 'status',
          content: (
            <StatusLozenge status={toStatusCategory(row.status)}>
              {row.status || 'To Do'}
            </StatusLozenge>
          ),
        },
      ],
    }));
  }, [rows]);

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
    <DynamicTable
      head={HEAD}
      rows={tableRows}
      aria-label="Issues in this theme"
      rowsPerPage={0}
    />
  );
}
