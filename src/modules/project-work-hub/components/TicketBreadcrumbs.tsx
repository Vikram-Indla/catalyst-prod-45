/**
 * TicketBreadcrumbs — source-aware breadcrumb row for full-page ticket view.
 *
 * Rendered above the CatalystDetailRouter in IssueDetailPage. Uses the canonical
 * shadcn Breadcrumb primitives (not Atlaskit — see CLAUDE.md §1 scoping).
 *
 * Shape (Catalyst mapping — "Spaces" in Jira ≡ "Projects" here):
 *   Projects ▸ <ProjectName> ▸ <Origin label>? ▸ <ISSUE-KEY>
 *
 * Origin is resolved by useTicketOrigin (router state → sessionStorage → null).
 * When origin is null (deep link), the middle crumb is omitted — we never
 * fabricate a backlog source we can't prove.
 */
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTheme } from '@/hooks/useTheme';
import { useTicketOrigin } from '../hooks/useTicketOrigin';

interface TicketBreadcrumbsProps {
  projectKey: string;
  projectName?: string;
  issueKey: string;
}

export function TicketBreadcrumbs({ projectKey, projectName, issueKey }: TicketBreadcrumbsProps) {
  const origin = useTicketOrigin();
  const { isDark } = useTheme();

  const linkColor = isDark ? '#A1A1A1' : '#42526E';
  const linkHoverColor = isDark ? '#EDEDED' : '#0052CC';
  const currentColor = isDark ? '#EDEDED' : '#172B4D';
  const separatorColor = isDark ? '#454545' : '#C1C7D0';

  const hoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = linkHoverColor;
    e.currentTarget.style.textDecoration = 'underline';
  };
  const hoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = linkColor;
    e.currentTarget.style.textDecoration = 'none';
  };

  const linkStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: linkColor,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    transition: 'color 120ms ease',
  };

  return (
    <Breadcrumb aria-label="Breadcrumbs">
      <BreadcrumbList
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: linkColor,
          flexWrap: 'wrap',
        }}
      >
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/project-hub" style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <Home size={13} aria-hidden="true" />
              <span>Projects</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator style={{ color: separatorColor }} />

        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to={`/project-hub/${projectKey}/list`}
              style={linkStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {projectName || projectKey}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {origin && (
          <>
            <BreadcrumbSeparator style={{ color: separatorColor }} />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to={origin.fromUrl}
                  style={linkStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                >
                  {origin.fromLabel}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        <BreadcrumbSeparator style={{ color: separatorColor }} />

        <BreadcrumbItem>
          <BreadcrumbPage
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: currentColor,
            }}
          >
            {issueKey}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Ellipsis re-export allows a future long-chain variant without reimporting primitives.
export { BreadcrumbEllipsis };
