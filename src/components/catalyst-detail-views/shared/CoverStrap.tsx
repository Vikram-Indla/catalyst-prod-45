/**
 * CoverStrap — canonical Jira-parity card cover strip for detail views.
 *
 *   • Renders a 100px full-bleed strap using the raw CSS background stored
 *     in `cover` (hex / linear-gradient() / url()).
 *   • On hover, shows a subtle "Edit cover" pill top-right that opens the
 *     SelectCoverPanel (same component the kanban ⋯ menu uses) in a portal
 *     anchored to the strap.
 *   • Callers own persistence — CoverStrap only fires onSelect / onRemove.
 *
 * Used by the shared CatalystViewBase left panel AND right sidebar so a
 * single component keeps the modal, panel, and full-page detail surfaces
 * in visual parity.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import EditIcon from '@atlaskit/icon/core/edit';
import Tooltip from '@atlaskit/tooltip';
import { SelectCoverPanel } from '@/features/kanban-board/components/SelectCoverPanel';
import type { WorkItemTable } from '@/features/kanban-board/data/useCoverGallery';

interface Props {
  cover: string | null | undefined;
  height?: number;
  /** Work item context so the SelectCoverPanel Upload tab can read + write
   *  the gallery. When omitted, Upload falls back to local-only data URLs. */
  workItemId?: string | null;
  workItemTable?: WorkItemTable | null;
  onSelect: (cover: string) => void;
  onRemove: () => void;
}

const PICKER_WIDTH = 380;
const PICKER_GAP = 6;
const VIEWPORT_MARGIN = 8;

export const CoverStrap: React.FC<Props> = ({ cover, height = 100, workItemId, workItemTable, onSelect, onRemove }) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => { setOpen(false); setPos(null); }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (pickerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);

  const recompute = useCallback(() => {
    const aEl = anchorRef.current;
    const mEl = pickerRef.current;
    if (!aEl || !mEl) return;
    const anchor = aEl.getBoundingClientRect();
    const menu = mEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer bottom-right of strap; flip up/left if it overflows.
    let left = anchor.right - menu.width;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (left + menu.width > vw - VIEWPORT_MARGIN) left = vw - menu.width - VIEWPORT_MARGIN;

    let top = anchor.bottom + PICKER_GAP;
    if (top + menu.height > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, anchor.top - menu.height - PICKER_GAP);
    }
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => { if (open) recompute(); }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const ro = new ResizeObserver(() => recompute());
    if (pickerRef.current) ro.observe(pickerRef.current);
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, recompute]);

  // No strap AND no user has ever opened the picker → don't render anything.
  // (The picker is opened via the "Add cover" affordance elsewhere or by the
  // kanban card menu; the detail-view strap only shows when a cover exists.)
  if (!cover) return null;

  return (
    <>
      <div
        ref={anchorRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          width: '100%',
          height,
          background: cover,
          borderRadius: 6,
          marginBottom: 12,
        }}
      >
        {(hover || open) && (
          <Tooltip content="Edit cover">
            <button
              type="button"
              aria-label="Edit cover"
              onClick={() => setOpen((v) => !v)}
              style={{
                position: 'absolute', top: 8, right: 8,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, padding: 0, borderRadius: 3, border: 'none',
                background: token('elevation.surface.overlay', 'var(--ds-surface-overlay)'),
                boxShadow: token('elevation.shadow.overlay', 'var(--ds-shadow-overlay)'),
                color: token('color.text', 'var(--ds-text)'),
                cursor: 'pointer',
              }}
            >
              <EditIcon label="" color={token('color.icon', 'var(--ds-icon)')} />
            </button>
          </Tooltip>
        )}
      </div>

      {open && createPortal(
        <div
          ref={pickerRef}
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            background: token('elevation.surface.overlay', 'var(--ds-surface-overlay)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 6,
            boxShadow: token('elevation.shadow.overlay', 'var(--ds-shadow-overlay)'),
            zIndex: 9999,
            width: PICKER_WIDTH,
            overflow: 'hidden',
          }}
        >
          <SelectCoverPanel
            currentCover={cover}
            workItemId={workItemId ?? null}
            workItemTable={workItemTable ?? null}
            onSelect={(bg) => { onSelect(bg); }}
            onRemove={() => { onRemove(); }}
            onClose={close}
          />
        </div>,
        document.body,
      )}
    </>
  );
};
