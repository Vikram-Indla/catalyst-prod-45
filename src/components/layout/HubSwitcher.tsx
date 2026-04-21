/**
 * HubSwitcher — Jira-style "app switcher" for Catalyst hubs.
 *
 * Trigger: 9-dot grid glyph in the header, immediately right of the sidebar
 * chevron. Atlaskit does not ship a public AppSwitcher component, so this is
 * a custom control built on @atlaskit/popup conventions but rendered as a
 * full-height left-anchored DRAWER (not a tiny popover) so it can list every
 * hub with icon + description, matching Jira's app switcher drawer. See
 * CLAUDE.md §2 for the documented deviation from AtlassianNavigation's
 * built-in `renderAppSwitcher` popover slot.
 *
 * Behavior:
 *   - Click trigger → drawer slides in from the left (320px wide).
 *   - Click a hub tile → navigate + close drawer.
 *   - Click outside / press Esc → close drawer.
 *   - Focus is trapped inside the drawer while open (BE-9, Apr 2026). On
 *     open the first tile receives focus; Tab / Shift+Tab cycle within the
 *     drawer; Esc restores focus to the trigger.
 *   - Drawer is INDEPENDENT of the contextual hub sidebar; it always shows
 *     the same hub list regardless of which hub the user is currently in.
 *     Works on /for-you (where there is no contextual sidebar).
 *
 * Icons: standardized on @atlaskit/icon/core/* (modern set) per DS-5. The
 * legacy @atlaskit/icon/glyph/* imports were retired Apr 2026.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';
import Tooltip from '@atlaskit/tooltip';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';
import HomeIcon from '@atlaskit/icon/core/home';
import OfficeBuildingIcon from '@atlaskit/icon/core/office-building';
import RoadmapIcon from '@atlaskit/icon/core/roadmap';
import FolderClosedIcon from '@atlaskit/icon/core/folder-closed';
import ReleaseIcon from '@atlaskit/icon/core/release';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import WarningIcon from '@atlaskit/icon/core/warning';
import TaskIcon from '@atlaskit/icon/core/task';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import BookIcon from '@atlaskit/icon/core/book-with-bookmark';
import { HubKey, hubTone, hubTileFill } from '@/lib/hub-colors';

type CoreIconProps = {
  label: string;
  color?: string;
  spacing?: 'none' | 'spacious';
};
type CoreIcon = React.ComponentType<CoreIconProps>;

interface HubEntry {
  key: HubKey;
  label: string;
  href: string;
  description: string;
  Icon: CoreIcon;
}

const HUBS: HubEntry[] = [
  { key: 'home',     label: 'Home',         href: '/for-you',                    description: 'Your work across all hubs',    Icon: HomeIcon },
  { key: 'strategy', label: 'StrategyHub',  href: '/strategyhub',                description: 'Vision, themes, OKRs',         Icon: OfficeBuildingIcon },
  { key: 'product',  label: 'ProductHub',   href: '/producthub',                 description: 'Products, ideas, roadmaps',    Icon: RoadmapIcon },
  { key: 'project',  label: 'ProjectHub',   href: '/project-hub',                description: 'Delivery projects & backlogs', Icon: FolderClosedIcon },
  { key: 'release',  label: 'ReleaseHub',   href: '/release-hub/command-center', description: 'Release planning & cutover',   Icon: ReleaseIcon },
  { key: 'test',     label: 'TestHub',      href: '/testhub/dashboard',          description: 'Test cases, cycles, defects',  Icon: CheckCircleIcon },
  { key: 'incident', label: 'IncidentHub',  href: '/incident-hub',               description: 'Incidents & post-mortems',     Icon: WarningIcon },
  { key: 'task',     label: 'TaskHub',      href: '/taskhub/boards',             description: 'Personal & team tasks',        Icon: TaskIcon },
  { key: 'plan',     label: 'PlanHub',      href: '/planhub',                    description: 'Capacity & timeline planning', Icon: CalendarIcon },
  { key: 'wiki',     label: 'WikiHub',      href: '/wiki',                       description: 'Knowledge base & docs',        Icon: BookIcon },
];

// Matches DOM nodes focusable via Tab inside the drawer. Atlaskit Drawer
// bakes this in natively — our bespoke drawer has to replicate it.
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setSidebarHidden, setSidebarExpanded, setSidebarPinned } = useCatalystContext();
  const { isMobile } = useNavBreakpoint();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const firstTileRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape + outside click. Esc also returns focus to the trigger
  // (WCAG 2.4.3 Focus Order).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
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

  // Focus-trap: on open move focus to the first tile; constrain Tab/Shift+Tab
  // inside the drawer so keyboard users cannot escape into the page chrome.
  useEffect(() => {
    if (!open) return;
    const drawerEl = drawerRef.current;
    if (!drawerEl) return;
    // Move initial focus off the trigger into the drawer (next frame so the
    // drawer has painted before focus lands — avoids the "focus a hidden
    // element" warning in some browsers).
    const raf = requestAnimationFrame(() => {
      firstTileRef.current?.focus();
    });
    const onTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(drawerEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hasAttribute('aria-hidden'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!drawerEl.contains(active)) {
        // Focus wandered outside (rare — e.g. focus()'d programmatically)
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTrap);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onTrap);
    };
  }, [open]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const go = (href: string) => {
    setOpen(false);
    // Auto-reveal the contextual hub sidebar so users land on the new hub with
    // its left-rail navigation already visible (e.g., ReleaseHubSidebar for
    // /release-hub, ProjectHubSidebar for /project-hub). Home (/for-you) has
    // no sidebar — skip the reveal there.
    if (href !== '/for-you') {
      setSidebarHidden(false);
      setSidebarExpanded(true);
      setSidebarPinned(true);
    }
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
            <AppSwitcherIcon label="" color="currentColor" />
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
          {/* Drawer — full-width at mobile (<768px) so every hub tile is
              readable on a 360px viewport; 320px at tablet+ per BE-2. */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Switch hub"
            aria-hidden={!open}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: isMobile ? '100vw' : 320,
              maxWidth: isMobile ? '100vw' : 320,
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
                <AppSwitcherIcon label="" color="currentColor" />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D', letterSpacing: '0.02em' }}>
                Switch hub
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
              {HUBS.map((hub, index) => {
                const active = isActive(hub.href);
                const tone = hubTone(hub.key);
                return (
                  <button
                    key={hub.href}
                    ref={index === 0 ? firstTileRef : undefined}
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
                        background: hubTileFill(hub.key),
                        color: tone,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <hub.Icon label="" color={tone} />
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
