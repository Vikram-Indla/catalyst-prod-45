/**
 * HubSwitcher — Jira-parity "app switcher" popover.
 *
 * Apr 2026 rewrite: previously rendered as a full-height left drawer
 * (translateX from -100%). Per Vikram's reference (Atlassian app switcher),
 * the correct UX is a compact popover anchored directly UNDER the grid
 * trigger, hugging its left edge with a small offset — not a drawer.
 *
 * Implementation: Radix DropdownMenu (same primitive as ProfileMenu, proven
 * to portal + anchor reliably in our shell). align="start" + side="bottom"
 * + sideOffset=6 matches the screenshot's tight padding.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import Tooltip from '@atlaskit/tooltip';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { HubIcon, HubName } from '@/components/navigation/HubIcon';

interface HubEntry {
  key: HubName;
  label: string;
  href: string;
  description: string;
}

const HUBS: HubEntry[] = [
  { key: 'home',     label: 'Home',         href: '/for-you',                    description: 'Your work across all hubs' },
  { key: 'strategy', label: 'StrategyHub',  href: '/strategyhub',                description: 'Vision, themes, OKRs' },
  { key: 'product',  label: 'ProductHub',   href: '/producthub',                 description: 'Products, ideas, roadmaps' },
  { key: 'project',  label: 'ProjectHub',   href: '/project-hub',                description: 'Delivery projects & backlogs' },
  { key: 'release',  label: 'ReleaseHub',   href: '/release-hub/command-center', description: 'Release planning & cutover' },
  { key: 'test',     label: 'TestHub',      href: '/testhub/dashboard',          description: 'Test cases, cycles, defects' },
  { key: 'incident', label: 'IncidentHub',  href: '/incident-hub',               description: 'Incidents & post-mortems' },
  { key: 'task',     label: 'TaskHub',      href: '/taskhub/boards',             description: 'Personal & team tasks' },
  { key: 'plan',     label: 'PlanHub',      href: '/planhub',                    description: 'Capacity & timeline planning' },
  { key: 'wiki',     label: 'WikiHub',      href: '/wiki',                       description: 'Knowledge base & docs' },
];

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setSidebarHidden, setSidebarExpanded, setSidebarPinned } = useCatalystContext();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const go = (href: string) => {
    setOpen(false);
    if (href !== '/for-you') {
      setSidebarHidden(false);
      setSidebarExpanded(true);
      setSidebarPinned(true);
    }
    navigate(href);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip content="Switch hub" position="bottom">
        {(tooltipProps) => (
          <DropdownMenuTrigger asChild>
            <button
              {...tooltipProps}
              type="button"
              data-hub-switcher="true"
              aria-label="Switch hub"
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 3,
                background: open ? 'rgba(9,30,66,0.14)' : 'transparent',
                cursor: 'pointer',
                color: 'var(--cp-text-secondary, #44546F)',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!open) e.currentTarget.style.background = 'rgba(9,30,66,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = open ? 'rgba(9,30,66,0.14)' : 'transparent';
              }}
            >
              <AppSwitcherIcon label="" color="currentColor" />
            </button>
          </DropdownMenuTrigger>
        )}
      </Tooltip>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        alignOffset={-8}
        avoidCollisions={false}
        className="z-[1000] p-0 shadow-[0_8px_24px_rgba(9,30,66,0.16)]"
        style={{
          width: 320,
          // Phase 12 (2026-04-29): reverted to Atlaskit elevation.surface.overlay
          // and color.border. Phase 11 unblocked Atlaskit's dark theme so both
          // tokens flip natively via --ds-* CSS variables.
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 6,
          fontFamily: 'var(--cp-font-body)',
          padding: 0,
          maxHeight: 'none',
          overflow: 'visible',
        }}
      >
        <div style={{ padding: '6px 4px' }}>
          {HUBS.map((hub) => {
            const active = isActive(hub.href);
            return (
              <button
                key={hub.href}
                type="button"
                onClick={() => go(hub.href)}
                className={`hub-nav-item${active ? ' hub-nav-item--active' : ''}`}
              >
                {active && <span className="hub-nav-item__bar" aria-hidden />}
                <span className="hub-nav-item__tile">
                  <HubIcon name={hub.key} size={18} />
                </span>
                <span className="hub-nav-item__text">
                  <span className="hub-nav-item__label">{hub.label}</span>
                  <span className="hub-nav-item__desc">{hub.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
