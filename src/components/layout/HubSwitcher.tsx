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
import Tooltip from '@atlaskit/tooltip';
import AppSwitcherIcon from '@atlaskit/icon/core/app-switcher';
import { HubIcon, HubName } from '@/components/navigation/HubIcon';
import { useNavBreakpoint } from '@/hooks/useNavBreakpoint';

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

// Matches DOM nodes focusable via Tab inside the drawer. Atlaskit Drawer
// bakes this in natively — our bespoke drawer has to replicate it.
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HubSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setSidebarHidden, setSidebarExpanded, setSidebarPinned } = useCatalystContext();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const firstTileRef = useRef<HTMLButtonElement | null>(null);
  const { isMobile } = useNavBreakpoint();

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
          {/* Drawer — 320px on desktop, full-bleed 100vw on mobile (<768)
              so the 10 hub tiles + labels are readable on phone widths. */}
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
                return (
                  <button
                    key={hub.href}
                    ref={index === 0 ? firstTileRef : undefined}
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
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
