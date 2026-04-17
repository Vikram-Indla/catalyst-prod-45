/**
 * TicketBreadcrumbs — source-aware breadcrumb row for full-page ticket view.
 *
 * Built on already-installed Atlassian Design System primitives:
 *   - @atlaskit/primitives  → Box for layout via design tokens
 *   - @atlaskit/tokens      → color/typography tokens + runtime theme sync
 *   - react-router-dom Link → client-side navigation
 *
 * We intentionally do NOT depend on @atlaskit/breadcrumbs — that package
 * is not in the stable install set here and would require a fresh
 * dependency install. Recreating the visual + a11y contract with
 * primitives + tokens gives Atlassian Design System parity without the
 * extra package.
 *
 * Shape (Catalyst mapping — "Spaces" in Jira ≡ "Projects" here):
 *   Projects ▸ <ProjectName> ▸ <Origin label>? ▸ <ISSUE-KEY>
 *
 * Origin resolves via useTicketOrigin (router state → sessionStorage → null).
 * When origin is null (deep link) the source crumb is omitted — we never
 * fabricate a backlog the user didn't come from.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Inline } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { Home, ChevronRight } from 'lucide-react';
import { useAtlaskitThemeSync } from '@/modules/project-work-hub/components/SubtasksPanel/atlaskitTheme';
import { useTicketOrigin } from '../hooks/useTicketOrigin';

interface TicketBreadcrumbsProps {
  projectKey: string;
  projectName?: string;
  issueKey: string;
}

interface CrumbLinkProps {
  to: string;
  children: React.ReactNode;
  iconBefore?: React.ReactNode;
}

function CrumbLink({ to, children, iconBefore }: CrumbLinkProps) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: token('color.text.subtlest', '#5E6C84'),
        textDecoration: 'none',
        borderRadius: 3,
        padding: '2px 4px',
        transition: 'color 120ms ease, background 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = token('color.text', '#172B4D');
        e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)');
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = token('color.text.subtlest', '#5E6C84');
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.textDecoration = 'none';
      }}
    >
      {iconBefore}
      <span>{children}</span>
    </Link>
  );
}

function Separator() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: token('color.text.disabled', '#C1C7D0'),
      }}
    >
      <ChevronRight size={14} />
    </span>
  );
}

export function TicketBreadcrumbs({ projectKey, projectName, issueKey }: TicketBreadcrumbsProps) {
  useAtlaskitThemeSync();
  const origin = useTicketOrigin();

  return (
    <Box
      as="nav"
      xcss={{
        paddingBlock: 'space.050',
      } as never}
    >
      <Inline
        space="space.050"
        alignBlock="center"
        {...{ 'aria-label': 'Breadcrumbs' }}
      >
        <CrumbLink to="/project-hub" iconBefore={<Home size={13} aria-hidden="true" />}>
          Projects
        </CrumbLink>
        <Separator />
        <CrumbLink to={`/project-hub/${projectKey}/list`}>
          {projectName || projectKey}
        </CrumbLink>
        {origin && (
          <>
            <Separator />
            <CrumbLink to={origin.fromUrl}>{origin.fromLabel}</CrumbLink>
          </>
        )}
        <Separator />
        <span
          aria-current="page"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            padding: '2px 4px',
          }}
        >
          {issueKey}
        </span>
      </Inline>
    </Box>
  );
}
