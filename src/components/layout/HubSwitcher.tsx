/**
 * HubSwitcher — Jira-style "app switcher" for Catalyst hubs.
 *
 * Trigger: 9-dot grid glyph in the header, immediately right of the sidebar
 * chevron. Atlaskit does not ship a public AppSwitcher component, so this is
 * a custom control built on @atlaskit/popup conventions but rendered as a
 * full-height left-anchored DRAWER (not a tiny popover) so it can list every
 * hub with icon + description, matching Jira's app switcher drawer.
 *
 * Behavior:
 *   - Click trigger → drawer slides in from the left (320px wide).
 *   - Click a hub tile → navigate + close drawer.
 *   - Click outside / press Esc → close drawer.
 *   - Drawer is INDEPENDENT of the contextual hub sidebar; it always shows
 *     the same hub list regardless of which hub the user is currently in.
 *     Works on /for-you (where there is no contextual sidebar).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Tooltip from '@atlaskit/tooltip';
import AppSwitcherIcon from '@atlaskit/icon/glyph/app-switcher';
import HomeIcon from '@atlaskit/icon/glyph/home';
import OfficeBuildingIcon from '@atlaskit/icon/glyph/office-building';
import PortfolioIcon from '@atlaskit/icon/glyph/portfolio';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import ShipIcon from '@atlaskit/icon/glyph/ship';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import TaskIcon from '@atlaskit/icon/glyph/task';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import BookIcon from '@atlaskit/icon/glyph/book';

interface HubEntry {
  label: string;
  href: string;
  description: string;
  Icon: React.ComponentType<{ label: string; primaryColor?: string; size?: 'small' | 'medium' | 'large' | 'xlarge' }>;
  tone: string;
}

const HUBS: HubEntry[] = [
  { label: 'Home',         href: '/for-you',                   description: 'Your work across all hubs',         Icon: HomeIcon,             tone: '#42526E' },
  { label: 'StrategyHub',  href: '/strategyhub',               description: 'Vision, themes, OKRs',              Icon: OfficeBuildingIcon,   tone: '#8270DB' },
  { label: 'ProductHub',   href: '/producthub',                description: 'Products, ideas, roadmaps',         Icon: PortfolioIcon,        tone: '#0052CC' },
  { label: 'ProjectHub',   href: '/project-hub',               description: 'Delivery projects & backlogs',      Icon: FolderIcon,           tone: '#00A3BF' },
  { label: 'ReleaseHub',   href: '/release-hub/command-center',description: 'Release planning & cutover',        Icon: ShipIcon,             tone: '#FF8B00' },
  { label: 'TestHub',      href: '/testhub/dashboard',         description: 'Test cases, cycles, defects',       Icon: CheckCircleIcon,      tone: '#36B37E' },
  { label: 'IncidentHub',  href: '/incident-hub',              description: 'Incidents & post-mortems',          Icon: WarningIcon,          tone: '#DE350B' },
  { label: 'TaskHub',      href: '/taskhub/boards',            description: 'Personal & team tasks',             Icon: TaskIcon,             tone: '#FFAB00' },
  { label: 'PlanHub',      href: '/planhub',                   description: 'Capacity & timeline planning',      Icon: CalendarIcon,         tone: '#E774BB' },
  { label: 'WikiHub',      href: '/wiki',                      description: 'Knowledge base & docs',             Icon: BookIcon,             tone: '#65BA43' },
];

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape + outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (drawerRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <>
      <Tooltip content="Switch hub" position="bottom">
        {(tooltipProps) => (
          <button
            {...tooltipProps}
            ref={(node) => {
              triggerRef.current = node;
              const tipRef = (tooltipProps as any).ref;
              if (typeof tipRef === 'function') tipRef(node);
              else if (tipRef) (tipRef as any).current = node;
            }}
            type="button"
            data-hub-switcher="true"
            aria-label="Switch hub"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
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
            onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(9,30,66,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = open ? 'rgba(9,30,66,0.14)' : 'transparent'; }}
          >
            <AppSwitcherIcon label="" size="small" primaryColor="currentColor" />
          </button>
        )}
      </Tooltip>

      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Scrim — subtle, click to close */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(9,30,66,0.25)',
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none',
              transition: 'opacity 180ms cubic-bezier(0.2, 0, 0, 1)',
              zIndex: 1200,
            }}
          />
          {/* Drawer */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-label="Switch hub"
            aria-hidden={!open}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 320,
              background: '#FFFFFF',
              borderRight: '1px solid #DFE1E6',
              boxShadow: '4px 0 16px rgba(9,30,66,0.12)',
              transform: open ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
              pointerEvents: open ? 'auto' : 'none',
              visibility: open ? 'visible' : 'hidden',
              zIndex: 1201,
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div
              style={{
                padding: '14px 20px 12px',
                borderBottom: '1px solid #EBECF0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: '#44546F', display: 'inline-flex' }}>
                <AppSwitcherIcon label="" size="small" primaryColor="currentColor" />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D', letterSpacing: '0.02em' }}>
                Switch hub
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
              {HUBS.map((hub) => {
                const active = isActive(hub.href);
                return (
                  <button
                    key={hub.href}
                    type="button"
                    onClick={() => go(hub.href)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      borderRadius: 6,
                      background: active ? 'rgba(9,30,66,0.06)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'rgba(9,30,66,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = active ? 'rgba(9,30,66,0.06)' : 'transparent';
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 6,
                        background: `${hub.tone}1A`,
                        color: hub.tone,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <hub.Icon label="" size="small" primaryColor={hub.tone} />
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: active ? 700 : 600,
                          color: '#172B4D',
                          lineHeight: '18px',
                        }}
                      >
                        {hub.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 400,
                          color: '#6B778C',
                          lineHeight: '16px',
                          marginTop: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {hub.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
