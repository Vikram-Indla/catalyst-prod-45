/**
 * TicketBreadcrumbs — source-aware breadcrumb row for full-page ticket view.
 *
 * Built on the canonical Atlassian Design System stack:
 *   - @atlaskit/breadcrumbs       → container + items (a11y, truncation)
 *   - @atlaskit/primitives (Box)  → padding via design tokens
 *   - @atlaskit/tokens            → color/typography tokens + theme sync
 *
 * Shape (Catalyst mapping — "Spaces" in Jira ≡ "Projects" here):
 *   Projects ▸ <ProjectName> ▸ <Origin label>? ▸ <ISSUE-KEY>
 *
 * Origin resolves via useTicketOrigin (router state → sessionStorage → null).
 * When origin is null (deep link) the source crumb is omitted — we never
 * fabricate a backlog the user didn't come from.
 *
 * RouterBreadcrumbLink adapts BreadcrumbsItem's `component` render prop to
 * react-router's Link so crumbs navigate client-side (no full reload).
 *
 * Install reminder: adding this component introduced @atlaskit/breadcrumbs
 * as a new runtime dep. Run `bun install` (or `npm install --registry=
 * https://registry.npmjs.org/`) after pulling a commit that bumps this file
 * or package.json.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import { Box } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { Home } from 'lucide-react';
import { useAtlaskitThemeSync } from '@/modules/project-work-hub/components/SubtasksPanel/atlaskitTheme';
import { useTicketOrigin } from '../hooks/useTicketOrigin';

interface TicketBreadcrumbsProps {
  projectKey: string;
  projectName?: string;
  issueKey: string;
}

type AnyAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  children?: React.ReactNode;
};

/**
 * Adapter that satisfies BreadcrumbsItem's `component` contract while
 * rendering a react-router <Link>. Forwards ref + className + onClick so
 * Atlaskit retains focus/hover styling and analytics.
 */
const RouterBreadcrumbLink = React.forwardRef<HTMLAnchorElement, AnyAnchorProps>(
  ({ href, children, className, onClick, ...rest }, ref) => {
    if (!href) {
      return (
        <a ref={ref} className={className} onClick={onClick} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  },
);
RouterBreadcrumbLink.displayName = 'RouterBreadcrumbLink';

export function TicketBreadcrumbs({ projectKey, projectName, issueKey }: TicketBreadcrumbsProps) {
  useAtlaskitThemeSync();
  const origin = useTicketOrigin();

  return (
    <Box
      xcss={{
        paddingBlock: 'space.100',
        font: 'font.body',
        color: 'color.text.subtlest',
      } as never}
    >
      <Breadcrumbs label="Breadcrumbs">
        <BreadcrumbsItem
          href="/project-hub"
          text="Projects"
          iconBefore={<Home size={13} aria-hidden="true" />}
          component={RouterBreadcrumbLink}
        />
        <BreadcrumbsItem
          href={`/project-hub/${projectKey}/list`}
          text={projectName || projectKey}
          component={RouterBreadcrumbLink}
        />
        {origin && (
          <BreadcrumbsItem
            href={origin.fromUrl}
            text={origin.fromLabel}
            component={RouterBreadcrumbLink}
          />
        )}
        <BreadcrumbsItem
          text={issueKey}
          component={React.forwardRef<HTMLSpanElement, { children?: React.ReactNode; className?: string }>(
            ({ children, className }, ref) => (
              <span
                ref={ref}
                aria-current="page"
                className={className}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                }}
              >
                {children}
              </span>
            ),
          )}
        />
      </Breadcrumbs>
    </Box>
  );
}
