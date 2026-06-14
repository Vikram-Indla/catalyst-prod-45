/**
 * HubSidebarNav — Collapsed sidebar hub navigation (52px wide panel)
 *
 * Renders 11 hub icons (28px) in a 44x44 hit target within 52px panel width.
 * Each icon has a tooltip showing the hub name. Active state shows 2px left
 * border + subtle blue background per ADS selection token.
 *
 * Props:
 *   - currentHub: HubKey | null — used to highlight active hub
 *   - onNavigate: (hub: HubKey) => void — click handler
 */

import { useLocation } from 'react-router-dom';
import Tooltip from '@atlaskit/tooltip';
import { HUB_ICON_REGISTRY, type HubKey } from '@/components/icons';

interface HubNavEntry {
  key: HubKey;
  label: string;
  href: string;
}

const HUBS: HubNavEntry[] = [
  { key: 'home',     label: 'Home',     href: '/for-you' },
  { key: 'strategy', label: 'Strategy', href: '/strategyhub' },
  { key: 'ideation', label: 'Ideation', href: '/ideation/backlog' },
  { key: 'product',  label: 'Product',  href: '/product-hub' },
  { key: 'project',  label: 'Project',  href: '/project-hub' },
  { key: 'release',  label: 'Release',  href: '/release-hub/command-center' },
  { key: 'test',     label: 'Test',     href: '/testhub/dashboard' },
  { key: 'incident', label: 'Incident', href: '/incident-hub' },
  { key: 'task',     label: 'Tasks',    href: '/tasks/board' },
  { key: 'plan',     label: 'Plan',     href: '/planhub' },
  { key: 'wiki',     label: 'Wiki',     href: '/wiki' },
];

function isActiveHub(current: string, hub: HubNavEntry): boolean {
  return current === hub.href || current.startsWith(hub.href + '/');
}

interface HubSidebarNavProps {
  onNavigate: (hub: HubKey) => void;
}

export function HubSidebarNav({ onNavigate }: HubSidebarNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div
      role="navigation"
      aria-label="Hub navigation"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 4px',
        width: 52,
      }}
    >
      {HUBS.map((hub) => {
        const active = isActiveHub(currentPath, hub);
        return (
          <Tooltip key={hub.key} content={hub.label} position="right">
            {(tooltipProps) => (
              <button
                {...tooltipProps}
                type="button"
                onClick={() => onNavigate(hub.key)}
                aria-current={active ? 'page' : undefined}
                aria-label={`${hub.label} hub`}
                data-hub-nav={hub.key}
                style={{
                  width: 44,
                  height: 44,
                  padding: 0,
                  border: active ? '2px solid var(--ds-background-information-bold, #0052CC)' : '2px solid transparent',
                  borderRadius: 6,
                  background: active
                    ? 'var(--ds-background-selected, #E9F2FE)'
                    : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 120ms ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background =
                      'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = active
                    ? 'var(--ds-background-selected, #E9F2FE)'
                    : 'transparent';
                }}
              >
                <img
                  src={HUB_ICON_REGISTRY[hub.key]}
                  alt=""
                  aria-hidden="true"
                  width={28}
                  height={28}
                  style={{
                    display: 'block',
                    flexShrink: 0,
                    borderRadius: 4,
                  }}
                />
              </button>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}
