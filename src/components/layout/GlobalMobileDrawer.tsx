/**
 * GlobalMobileDrawer — off-canvas left drawer for <1024px.
 *
 * Renders any sidebar node passed in as `children` inside an Atlaskit-style
 * portal panel. ADS tokens only — no raw hex. Activated by CatalystShell
 * when `useNavBreakpoint().isNarrow` is true.
 *
 * Contract:
 *  - Width: min(320px, 86vw); height: 100dvh
 *  - Click backdrop / X / Escape / route change → close
 *  - Body scroll lock while open (restored on close)
 *  - Focus moves to close button on open, returns to opener on close
 *  - Honours prefers-reduced-motion (no transform animation)
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface GlobalMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Element that opened the drawer; focus returns here on close. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** Optional aria title (defaults to "Navigation"). */
  ariaLabel?: string;
}

export function GlobalMobileDrawer({
  open,
  onClose,
  children,
  returnFocusRef,
  ariaLabel = 'Navigation',
}: GlobalMobileDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Body scroll lock + Escape handler + focus management
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);

    // Move focus into drawer
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
      window.clearTimeout(focusTimer);
      // Return focus to opener
      returnFocusRef?.current?.focus?.();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-cp-mobile-drawer
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--cp-drawer-z, 9000)' as unknown as number,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--ds-blanket, rgba(9, 30, 66, 0.54))',
          // Reduced-motion: no fade
          animation: 'cpDrawerFadeIn 160ms ease-out',
        }}
      />

      {/* Panel */}
      <aside
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100dvh',
          width: 'var(--cp-drawer-width, min(320px, 86vw))',
          background: 'var(--ds-surface-overlay, var(--cp-bg, #FFFFFF))',
          borderRight: '1px solid var(--ds-border, var(--cp-bd, #DFE1E6))',
          boxShadow: 'var(--ds-shadow-overlay, 0 8px 24px rgba(9, 30, 66, 0.25))',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'cpDrawerSlideIn 200ms cubic-bezier(.2,0,0,1)',
        }}
      >
        {/* Drawer header (48px) */}
        <header
          style={{
            height: 48,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderBottom: '1px solid var(--ds-border, var(--cp-bd, #DFE1E6))',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ds-text, var(--cp-t1, #172B4D))',
            }}
          >
            Navigation
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-text-subtle, var(--cp-t2, #42526E))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Sidebar slot — scrollable */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </aside>

      {/* Local keyframes (scoped via id; cheap and avoids editing global CSS) */}
      <style>{`
        @keyframes cpDrawerSlideIn {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes cpDrawerFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] aside { animation: none !important; }
          [role="dialog"] > div[aria-hidden] { animation: none !important; }
        }
        /* Loop 4 (2026-04-30): module sidebars hardcode 240px width via
           SidebarBase. Inside the 320px drawer that leaves ~64px of dead
           gutter on the right and forces Recent-item titles to truncate
           earlier than necessary. Stretch any descendant <aside> to fill
           the drawer width — desktop is untouched because this rule only
           applies inside [data-cp-mobile-drawer]. The inner ProjectHub
           "Recent" rail (data-projecthub-rail) and any nested asides keep
           their own widths unaffected because the rule is scoped to the
           direct sidebar slot. */
        [data-cp-mobile-drawer] [data-cp-drawer-slot] > aside {
          width: 100% !important;
        }
        /* Border-right on the inner sidebar is redundant inside the drawer
           (the drawer already has its own right edge against the backdrop). */
        [data-cp-mobile-drawer] [data-cp-drawer-slot] > aside {
          border-right: none !important;
        }
      `}</style>
    </div>,
    document.body,
  );
}

export default GlobalMobileDrawer;
