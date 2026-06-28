/**
 * ProjectTabBar — Jira-parity navigation-kit tab strip.
 *
 * jira-compare catalog item 2 (2026-05-02). Vikram authorised after
 * Lane A probe of Jira BAU project.
 *
 * Lane A measurements (testid navigation-kit-ui-tab.ui.link-tab on
 * https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/...):
 *   container: <ul> · height 32px · gap 4px · padding 0 12px · no border-bottom
 *   inactive tab: <a> · 14px / 500 / color #505258
 *   active tab:   <span> · 14px / 500 / color #1558BC (Atlaskit blue 700)
 *
 * Catalyst routes mounted as tabs (existing surfaces):
 *   Backlog  → /project-hub/:key/backlog
 *   Board    → /project-hub/:key/board
 *   Kanban   → /project-hub/:key/boards
 *   Project work → /project-hub/:key/allwork
 *
 * Cross-hub note: same tab strip should mount on every project-scoped
 * surface (already cascaded with ProjectHeaderChip). Items "List" and
 * "Releases" from Jira are deferred — Catalyst doesn't have those
 * surfaces yet.
 */
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

interface Props {
  projectKey: string;
}

interface TabSpec {
  id: string;
  label: string;
  /** Path segment matched against location.pathname suffix. */
  path: string;
}

export function ProjectTabBar({ projectKey }: Props) {
  const loc = useLocation();
  const base = `/project-hub/${projectKey}`;
  const tabs: TabSpec[] = [
    { id: 'backlog', label: 'Backlog', path: `${base}/backlog` },
    { id: 'board', label: 'Board', path: `${base}/board` },
    { id: 'kanban', label: 'Kanban', path: `${base}/boards` },
    { id: 'allwork', label: 'Project work', path: `${base}/allwork` },
  ];

  return (
    <ul
      data-testid="catalyst-project-tabs.list"
      style={{
        display: 'flex', alignItems: 'center',
        listStyle: 'none', margin: 0,
        padding: '0 12px',
        height: 32, gap: 4,
        fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        flexShrink: 0,
      }}
    >
      {tabs.map(t => {
        const active = loc.pathname.startsWith(t.path);
        return (
          <li key={t.id} style={{ display: 'inline-flex', alignItems: 'center', height: '100%' }}>
            {active ? (
              <span
                data-testid={`catalyst-project-tabs.${t.id}.active`}
                aria-current="page"
                style={{
                  fontSize: 14, fontWeight: 500,
                  color: 'var(--ds-text-brand, #1558BC)',
                  padding: '0 8px', display: 'inline-flex', alignItems: 'center', height: '100%',
                  borderBottom: '2px solid var(--ds-border-brand, #1558BC)',
                }}
              >
                {t.label}
              </span>
            ) : (
              <Link
                to={t.path}
                data-testid={`catalyst-project-tabs.${t.id}.link`}
                style={{
                  fontSize: 14, fontWeight: 500,
                  color: 'var(--ds-text-subtle, #505258)',
                  padding: '0 8px', display: 'inline-flex', alignItems: 'center', height: '100%',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, #292A2E)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #505258)'; }}
              >
                {t.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
