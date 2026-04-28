/**
 * CANONICAL — "Created … / Updated …" footer meta row for the
 * detail panel's left column.
 *
 * Apr 28, 2026 (jira-compare cycle 6 follow-up — Phase B B11):
 *   Jira renders a small footer at the bottom of every issue
 *   detail surface showing when the issue was created and last
 *   updated, e.g. "Created 28 Apr 2026 · Updated 2 minutes ago".
 *   Catalyst showed neither timestamp inline — users had to dig
 *   into the activity log. This component reads
 *   `issue.jira_created_at` and `issue.jira_updated_at` (both ISO
 *   strings on `ph_issues`) and renders a single muted-text row.
 *   Relative format ("2 minutes ago") for anything within 7 days,
 *   absolute format ("28 Apr 2026") otherwise.
 */

import React from 'react';
import { token } from '@atlaskit/tokens';
import type { PhIssue } from '../types';

interface CatalystFooterMetaProps {
  issue: PhIssue | null;
}

/* jira-compare S-61 (2026-04-28): Jira renders the absolute form as
 * "April 16, 2026 at 6:51 PM" (full month name + time). Updated stays
 * relative ("5 hours ago") — that's what live Jira does in modern UI.
 */
function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} at ${timePart}`;
}

function formatTimestamp(iso: string | null | undefined, mode: 'absolute' | 'auto' = 'auto'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  if (mode === 'absolute') return formatAbsolute(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs >= 0 && diffMs < 7 * day) {
    if (diffMs < 60 * 1000) return 'just now';
    if (diffMs < 60 * 60 * 1000) {
      const mins = Math.floor(diffMs / (60 * 1000));
      return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    }
    if (diffMs < day) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    const days = Math.floor(diffMs / day);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return formatAbsolute(iso);
}

export function CatalystFooterMeta({ issue }: CatalystFooterMetaProps) {
  if (!issue) return null;
  const created = (issue as { jira_created_at?: string | null }).jira_created_at;
  const updated = (issue as { jira_updated_at?: string | null }).jira_updated_at;
  if (!created && !updated) return null;

  return (
    <div
      data-testid="catalyst-footer-meta"
      style={{
        marginTop: 24,
        paddingTop: 16,
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        fontSize: 12,
        color: token('color.text.subtle', '#6B6E76'),
        lineHeight: '16px',
      }}
    >
      {created && (
        <span>
          Created <span style={{ color: token('color.text', '#292A2E') }}>{formatTimestamp(created, 'absolute')}</span>
        </span>
      )}
      {created && updated && <span aria-hidden="true">·</span>}
      {updated && (
        <span>
          Updated <span style={{ color: token('color.text', '#292A2E') }}>{formatTimestamp(updated)}</span>
        </span>
      )}
    </div>
  );
}
