/**
 * TicketBreadcrumbs — source-aware breadcrumb row for full-page ticket view.
 *
 * Visual spec (Apr 2026 refresh, matches Atlassian "Spaces" reference):
 *   Spaces  /  [project-icon] <Project>  /  [origin-icon]? <Origin>?  /  [type-icon] <ISSUE-KEY>
 *
 * - Crumb labels: 13px Inter 500, color #44546F (light) / #B6C2CF (dark)
 * - Separators:   thin "/" 13px, color #8590A1 (light) / #738496 (dark), 6px gutter
 * - Project chip: small rounded thumbnail (16×16) with first letter on a tinted square
 * - Issue key:    JetBrains Mono 13/600, color #172B4D (light) / #EDEDED (dark)
 * - Type icon:    canonical SVG from /lib/jira-issue-type-icons (16px)
 *
 * Built without @atlaskit/breadcrumbs so we have full control over the chip
 * rendering (Atlaskit's BreadcrumbsItem doesn't expose a slot for an icon
 * before the link text without flicker).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTicketOrigin } from '../hooks/useTicketOrigin';

interface TicketBreadcrumbsProps {
  projectKey: string;
  projectName?: string;
  issueKey: string;
  issueType?: string;
  /** Optional: issue type for the origin crumb (e.g. parent epic) */
  originIssueType?: string;
}

function ProjectChip({ name, projectKey }: { name: string; projectKey: string }) {
  const seed = (projectKey || name || '?').charCodeAt(0) || 65;
  // Deterministic pastel from the project key — Atlassian-style tinted square.
  const hue = (seed * 47) % 360;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: 3,
        background: `linear-gradient(135deg, hsl(${hue} 70% 78%), hsl(${(hue + 30) % 360} 70% 64%))`,
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {(name || projectKey || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export function TicketBreadcrumbs({
  projectKey,
  projectName,
  issueKey,
  issueType,
  originIssueType,
}: TicketBreadcrumbsProps) {
  const { isDark } = useTheme();
  const origin = useTicketOrigin();

  const linkColor = isDark ? '#B6C2CF' : '#44546F';
  const sepColor = isDark ? '#738496' : '#8590A1';
  const keyColor = isDark ? '#EDEDED' : '#172B4D';

  const linkStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    color: linkColor,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 4px',
    margin: '-2px -4px',
    borderRadius: 3,
    transition: 'background 120ms ease, color 120ms ease',
  };

  const onHover = (e: React.MouseEvent<HTMLElement>, on: boolean) => {
    (e.currentTarget as HTMLElement).style.background = on
      ? isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(9,30,66,0.06)'
      : 'transparent';
    (e.currentTarget as HTMLElement).style.color = on
      ? isDark
        ? '#EDEDED'
        : '#172B4D'
      : linkColor;
  };

  const Sep = () => (
    <span
      aria-hidden="true"
      style={{
        color: sepColor,
        fontSize: 13,
        fontWeight: 400,
        margin: '0 6px',
        userSelect: 'none',
      }}
    >
      /
    </span>
  );

  return (
    <nav
      aria-label="Breadcrumbs"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 4,
        paddingBlock: 6,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Link
        to="/project-hub"
        style={linkStyle}
        onMouseEnter={(e) => onHover(e, true)}
        onMouseLeave={(e) => onHover(e, false)}
      >
        Spaces
      </Link>

      <Sep />

      <Link
        to={`/project-hub/${projectKey}/list`}
        style={linkStyle}
        onMouseEnter={(e) => onHover(e, true)}
        onMouseLeave={(e) => onHover(e, false)}
      >
        <ProjectChip name={projectName || projectKey} projectKey={projectKey} />
        <span>{projectName || projectKey}</span>
      </Link>

      {origin && (
        <>
          <Sep />
          <Link
            to={origin.fromUrl}
            style={linkStyle}
            onMouseEnter={(e) => onHover(e, true)}
            onMouseLeave={(e) => onHover(e, false)}
          >
            {originIssueType && (
              <JiraIssueTypeIcon type={originIssueType} size={16} />
            )}
            <span>{origin.fromLabel}</span>
          </Link>
        </>
      )}

      <Sep />

      <span
        aria-current="page"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 4px',
          margin: '-2px -4px',
        }}
      >
        {issueType && <JiraIssueTypeIcon type={issueType} size={16} />}
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.1,
            color: keyColor,
          }}
        >
          {issueKey}
        </span>
      </span>
    </nav>
  );
}
