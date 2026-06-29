import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';

// ─── Detection ───────────────────────────────────────────────────────
//
// Two formats are detected anywhere in plain text:
//
//   1. Bare key: PROJECTKEY-NUMBER (e.g. BAU-5920, MWR-947, ABC123-42)
//      - Project key starts with a letter, then up to 9 alphanumerics
//      - Hyphen, then digits
//      - Bounded by non-alphanumeric to avoid matching inside URLs or
//        compound identifiers — the URL match handles browse links.
//
//   2. Full Atlassian browse URL:
//        https://<host>.atlassian.net/browse/<KEY>[?…|#…]
//
// Both produce the same TicketLinkCard render path keyed by issue key.
// Negative look-arounds keep this from matching keys embedded INSIDE
// a URL (e.g. "?issue=BAU-1", "/browse/BAU-1") — URL handling lives
// separately in the link-mark / inlineCard renderers.
export const TICKET_KEY_REGEX =
  /(?<![A-Za-z0-9/?&=:_-])([A-Z][A-Z0-9]{0,9}-\d+)(?![A-Za-z0-9/?&=_-])/g;
export const TICKET_URL_REGEX =
  /https?:\/\/[a-z0-9-]+\.atlassian\.net\/browse\/([A-Z][A-Z0-9]{0,9}-\d+)(?:\?[^\s)]*)?(?:#[^\s)]*)?/gi;

/**
 * Returns the first Jira-style ticket key found anywhere in the
 * input. Covers canonical Atlassian browse URLs, Catalyst
 * `/browse/KEY` and legacy `?issue=KEY` URLs, and bare keys. Useful
 * for link-mark hrefs whose visible text differs from the URL.
 */
export function extractIssueKey(s: string): string | null {
  if (!s) return null;
  const m = /\b([A-Z][A-Z0-9]{0,9}-\d+)\b/.exec(s);
  return m ? m[1] : null;
}

// ─── Data hook ───────────────────────────────────────────────────────
//
// Resolves an issue key against ph_issues. Caches per-key for the
// session so multiple cards referencing the same ticket only fetch
// once. Returns null when the row doesn't exist — caller falls back
// to a plain link.
interface ResolvedTicket {
  issueKey: string;
  summary: string | null;
  issueType: string | null;
  status: string | null;
  statusCategory: string | null;
}

export function useTicketLink(issueKey: string | null | undefined) {
  return useQuery<ResolvedTicket | null>({
    queryKey: ['ticket-link', issueKey],
    enabled: !!issueKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!issueKey) return null;
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', issueKey)
        .maybeSingle();
      if (!data) return null;
      return {
        issueKey: data.issue_key,
        summary: data.summary,
        issueType: data.issue_type,
        status: data.status,
        statusCategory: data.status_category,
      };
    },
  });
}

// ─── Render ──────────────────────────────────────────────────────────

export interface TicketLinkCardProps {
  issueKey: string;
  /** When true the card stretches to fill its parent (block layout).
   *  Default is inline (max-content). */
  block?: boolean;
}

/**
 * Smart card for a referenced ticket: type icon + key + summary +
 * status pill, wrapped in a hairline-bordered, padded surface tile.
 * Click → useGlobalSearchStore.openDetail to open the detail view
 * for that ticket (cross-project supported).
 *
 * When the key doesn't resolve in ph_issues yet (not synced or
 * stale), falls back to a plain bordered link with just the key so
 * the user still sees what was referenced.
 */
export function TicketLinkCard({ issueKey, block = false }: TicketLinkCardProps) {
  const { data, isLoading } = useTicketLink(issueKey);
  const navigate = useNavigate();
  const href = `/browse/${issueKey}`;

  const handleClick = (e: React.MouseEvent) => {
    // Honor modifier-clicks (open in new tab) and non-primary buttons
    // so the anchor's native behavior still works for power users.
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(href);
  };

  const containerStyle: React.CSSProperties = {
    display: block ? 'flex' : 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    overflow: 'hidden',
    verticalAlign: 'middle',
    border: `1px solid ${token('color.border', 'rgba(11, 18, 14, 0.14)')}`,
    borderRadius: 4,
    backgroundColor: token('elevation.surface', 'var(--ds-surface)'),
    padding: '0px 6px',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    lineHeight: '20px',
  };

  // Pending data — show the key in muted style so we don't flash an
  // empty box. Same card chrome so layout doesn't jump when data
  // arrives.
  if (isLoading) {
    return (
      <a
        href={href}
        onClick={handleClick}
        style={containerStyle}
        data-ticket-key={issueKey}
      >
        <span
          style={{
            fontWeight: 600,
            color: token('color.link', 'var(--ds-link)'),
            whiteSpace: 'nowrap',
          }}
        >
          {issueKey}
        </span>
      </a>
    );
  }

  // Resolved fallback — issue not in ph_issues. Still clickable so
  // openDetail can show its own "not found" surface, but with no
  // icon/summary/status since none is known.
  if (!data) {
    return (
      <a
        href={href}
        onClick={handleClick}
        style={containerStyle}
        data-ticket-key={issueKey}
      >
        <span
          style={{
            fontWeight: 600,
            color: token('color.link', 'var(--ds-link)'),
            whiteSpace: 'nowrap',
          }}
        >
          {issueKey}
        </span>
      </a>
    );
  }

  return (
    <a
      href={`/?issue=${issueKey}`}
      onClick={handleClick}
      style={containerStyle}
      data-ticket-key={issueKey}
      title={data.summary ?? issueKey}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <JiraIssueTypeIcon type={data.issueType ?? 'Task'} size={16} />
      </span>
      <span
        style={{
          fontWeight: 600,
          color: token('color.link', 'var(--ds-link)'),
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {data.issueKey}
      </span>
      {data.summary && (
        <span
          style={{
            fontWeight: 400,
            color: token('color.link', 'var(--ds-link)'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {data.summary}
        </span>
      )}
      {data.status && (
        <span style={{ flexShrink: 0 }}>
          <StatusLozenge
            status={data.status}
            appearance={statusToLozenge(data.status, data.statusCategory ?? undefined)}
          />
        </span>
      )}
    </a>
  );
}
