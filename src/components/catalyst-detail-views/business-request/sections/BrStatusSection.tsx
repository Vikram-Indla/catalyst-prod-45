/**
 * BrStatusSection — Business Request status pill (workflow-driven).
 *
 * Reads the canonical Business Request workflow from
 * `useCatalystWorkflow('Business Request')` and renders the SAME header
 * pill + click-to-open picker as the project's CatalystStatusPill.
 *
 * 2026-06-01 — interaction model adopted from CatalystStatusPill:
 *   @atlaskit/dropdown-menu has a known portal-empty bug on these detail
 *   surfaces (clicking opened nothing). Replaced with a hand-rolled
 *   createPortal popover (button + useState open + getBoundingClientRect
 *   anchor + outside-click/Esc), identical to CatalystStatusPill. The pill
 *   trigger is the canonical 32px/14px/500 category-coloured span.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { token } from '@atlaskit/tokens';
import { useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import type { BusinessRequest } from '@/types/business-request';

/**
 * Canonical header-pill background palette — copied verbatim from
 * CatalystStatusPill. Keyed by statusToLozenge appearance.
 */
const PILL_BG: Record<string, string> = {
  success:    'rgb(148, 199, 72)',
  inprogress: 'rgb(143, 184, 246)',
  moved:      'rgb(243, 214, 100)',
  removed:    'rgb(221, 222, 225)',
  new:        'rgb(184, 172, 246)',
  default:    'rgb(221, 222, 225)',
};

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrStatusSection({ request, onUpdate }: Props) {
  const { statuses, isLoading } = useCatalystWorkflow('Business Request');
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close on click-outside (allow clicks inside the portal popover).
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      const pop = document.querySelector('[data-testid="br-status-pill-popover"]');
      if (pop && pop.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!request) return null;

  const options = statuses.map((s) => ({ value: s.slug, label: s.name, category: s.category }));
  const current =
    options.find((o) => o.value === request.process_step) ??
    options[0] ?? {
      value: '',
      label: isLoading ? 'Loading…' : 'No status',
      category: 'todo' as const,
    };

  const triggerAppearance = statusToLozenge(current.label, current.category);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, left: r.left });
    }
    setOpen((o) => !o);
  };

  return (
    <section data-cv-section="br-status" aria-label="Status">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${current.label} — Change status`}
        data-testid="br-view--status-pill"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'filter 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.88)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      >
        {/* Canonical header pill — IDENTICAL to CatalystStatusPill. */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 32,
          lineHeight: '32px',
          padding: '0 10px',
          borderRadius: 3,
          fontSize: 14,
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: 'normal',
          background: PILL_BG[triggerAppearance] ?? PILL_BG.default,
          color: 'rgb(41, 42, 46)',
        }}>
          {current.label}
          <ChevronDownIcon label="" size="small" />
        </span>
      </button>

      {open && anchor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="br-status-pill-popover"
            role="menu"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              minWidth: 220,
              maxHeight: 360,
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              padding: '4px 0',
              zIndex: 9999,
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            {options.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 13, color: token('color.text.subtlest', '#8590A2') }}>
                {isLoading ? 'Loading…' : 'No statuses configured'}
              </div>
            )}
            {options.map((opt) => {
              const isActive = current.value === opt.value;
              const appearance = statusToLozenge(opt.label, opt.category);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (request.process_step !== opt.value) {
                      void onUpdate('process_step', opt.value);
                    }
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    height: 36,
                    padding: '0 12px',
                    background: isActive ? token('color.background.selected', '#E9F2FF') : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Dropdown pill — canonical 11px/700/uppercase, category bg. */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 20,
                    padding: '0 7px',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: PILL_BG[appearance] ?? PILL_BG.default,
                    color: 'rgb(41, 42, 46)',
                  }}>
                    {opt.label}
                  </span>
                  {isActive && (
                    <span style={{ fontSize: 12, color: token('color.text.brand', '#0C66E4'), fontWeight: 600 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </section>
  );
}

export default BrStatusSection;
