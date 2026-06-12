/**
 * CANONICAL — Header status pill for all CatalystView* components.
 * Change here → updates all 7 work item types.
 *
 * Positioning: createPortal to document.body with getBoundingClientRect —
 * avoids Popper.js/fixed-position failure inside overflow:hidden ancestors
 * (cv-drawer-sidebar has overflow:hidden auto + position:sticky).
 *
 * Data: useWorkflow(issueType) → only available transitions from current state
 * shown (Jira-parity verb→lozenge). Falls back to STATUS_OPTION_GROUPS when
 * no workflow mapped for this issue type.
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { useWorkflow } from '@/lib/workflows/WorkflowProvider';
import type { Transition } from '@/lib/workflows/types';
import { JiraStatusLozenge } from '@/components/workflow/JiraStatusLozenge';
import { WorkflowViewerModal } from './WorkflowViewerModal';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';

const HEADER_BG: Record<string, string> = {
  success:    token('color.background.success.bold',     '#1F845A'),
  inprogress: token('color.background.information.bold', '#0C66E4'),
  moved:      token('color.background.warning.bold',     '#CF9F02'),
  removed:    token('color.background.danger.bold',      '#CA3521'),
  default:    token('color.background.neutral.bold',     '#44546F'),
  new:        token('color.background.neutral.bold',     '#44546F'),
};
const HEADER_TEXT: Record<string, string> = {
  success:    token('color.text.inverse',         '#FFFFFF'),
  inprogress: token('color.text.inverse',         '#FFFFFF'),
  moved:      token('color.text.warning.inverse', '#1D2125'),
  removed:    token('color.text.inverse',         '#FFFFFF'),
  default:    token('color.text.inverse',         '#FFFFFF'),
  new:        token('color.text.inverse',         '#FFFFFF'),
};

function groupCategoryToAppearance(cat: string): 'default' | 'inprogress' | 'success' {
  if (cat === 'done') return 'success';
  if (cat === 'in_progress') return 'inprogress';
  return 'default';
}

interface CatalystStatusPillProps {
  status?: string | null;
  statusCategory?: string | null;
  onStatusChange?: (newStatus: string) => void;
  issueType?: string | null;
}

export function CatalystStatusPill({
  status,
  statusCategory,
  onStatusChange,
  issueType,
}: CatalystStatusPillProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [workflowViewerOpen, setWorkflowViewerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const display = status || 'Backlog';
  const appearance = statusToLozenge(display, statusCategory) as string;
  const bg = HEADER_BG[appearance] ?? HEADER_BG.default;
  const fg = HEADER_TEXT[appearance] ?? HEADER_TEXT.default;

  const workflow = useWorkflow(issueType ?? '');
  const currentState = useMemo(() => {
    if (!workflow) return undefined;
    return (
      workflow.states.find(s => s.name.toLowerCase() === display.toLowerCase()) ??
      workflow.states.find(s => s.id === display.toLowerCase().replace(/[^a-z0-9]+/g, '_')) ??
      workflow.states.find(s => s.id === workflow.initialStateId)
    );
  }, [workflow, display]);

  const availableTransitions = useMemo((): Transition[] => {
    if (!workflow || !currentState) return [];
    const explicit = workflow.transitions.filter(t => t.from === currentState.id);
    const implicit: Transition[] = [];
    const allAnyToThis = workflow.states.every(s => s.anyToThis);
    if (allAnyToThis || currentState.anyFromThis) {
      workflow.states.forEach(target => {
        if (target.id === currentState.id) return;
        if (explicit.some(e => e.to === target.id)) return;
        implicit.push({ from: currentState.id, to: target.id, verb: target.name });
      });
    }
    return [...explicit, ...implicit];
  }, [workflow, currentState]);

  const openMenu = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: r.left });
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, closeMenu]);

  const handleWorkflowTransition = useCallback((transition: Transition) => {
    if (!workflow) return;
    const target = workflow.states.find(s => s.id === transition.to);
    if (!target) return;
    onStatusChange?.(target.name);
    closeMenu();
  }, [workflow, onStatusChange, closeMenu]);

  const handleFallbackSelect = useCallback((st: string) => {
    onStatusChange?.(st);
    closeMenu();
  }, [onStatusChange, closeMenu]);

  const menuContent = workflow && currentState ? (
    availableTransitions.length === 0 ? (
      <div style={{ padding: '8px 12px', fontSize: 13, color: token('color.text.subtlest', '#626F86') }}>
        No transitions available
      </div>
    ) : (
      <>
        {availableTransitions.map(tr => {
          const target = workflow.states.find(s => s.id === tr.to);
          if (!target) return null;
          return (
            <button
              key={`${tr.from}->${tr.to}`}
              type="button"
              onClick={() => handleWorkflowTransition(tr)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '7px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: 220,
                font: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, color: token('color.text', '#172B4D') }}>{tr.verb}</span>
              <span aria-hidden style={{ fontSize: 12, color: token('color.text.subtlest', '#8590A2') }}>→</span>
              <JiraStatusLozenge category={target.category} name={target.name} />
            </button>
          );
        })}
      </>
    )
  ) : (
    STATUS_OPTION_GROUPS.map(group => (
      <div key={group.category}>
        <div style={{
          padding: '6px 12px 2px',
          fontSize: 11,
          fontWeight: 600,
          color: token('color.text.subtlest', '#626F86'),
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em',
        }}>
          {group.groupLabel}
        </div>
        {group.statuses.map(st => (
          <button
            key={st}
            type="button"
            onClick={() => handleFallbackSelect(st)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '5px 12px',
              border: 'none',
              background: display === st ? token('color.background.selected', '#E9F2FE') : 'transparent',
              cursor: 'pointer',
              font: 'inherit',
            }}
            onMouseEnter={e => { if (display !== st) (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
            onMouseLeave={e => { if (display !== st) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
              <Lozenge appearance={groupCategoryToAppearance(group.category)} isBold>{st}</Lozenge>
            </span>
          </button>
        ))}
      </div>
    ))
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="catalyst-status-pill-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={open ? closeMenu : openMenu}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 32,
          padding: '0 10px',
          borderRadius: 3,
          border: 'none',
          cursor: 'pointer',
          background: bg,
          color: fg,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'inherit',
          transition: 'opacity 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      >
        {display}
        <span aria-hidden style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          data-catalyst-status-portal="true"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            zIndex: 9999,
            minWidth: 220,
            padding: '4px 0',
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {menuContent}
          <div style={{ borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, marginTop: 4, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => { setWorkflowViewerOpen(true); closeMenu(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 14,
                color: token('color.text', '#172B4D'),
                textAlign: 'left',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              View workflow
            </button>
          </div>
        </div>,
        document.body,
      )}

      <WorkflowViewerModal
        isOpen={workflowViewerOpen}
        onClose={() => setWorkflowViewerOpen(false)}
        issueType={issueType}
        currentStatus={status}
      />
    </>
  );
}

export default CatalystStatusPill;
