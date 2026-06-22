// =====================================================
// CATALYST DETAIL PANEL — shared right-side detail panel
// Used by Backlog and Timeline. Owns drag-resize handle,
// header chrome, and mounts CatalystDetailRouter in panelMode.
// =====================================================

import React, { lazy, Suspense, useEffect, useState } from 'react';
import Spinner from '@atlaskit/spinner';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter')
);
/* 2026-06-19: release entityKind short-circuits to the canonical 8-tab
   ReleaseDetailContent — the same component the full-page /release-hub/:id
   route mounts. No CatalystViewRelease; no parallel reimplementation. */
const ReleaseDetailContent = lazy(
  () => import('@/pages/releasehub/ReleaseDetailPage').then(m => ({ default: m.ReleaseDetailContent }))
);

export interface CatalystDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: string;
  /** Type label for JiraIssueTypeIcon in the header (e.g. 'Story', 'Epic', 'QA Bug') */
  typeIconLabel: string;
  projectKey: string;
  projectId?: string;
  /** Optional: shows the "open in full page" arrow button in header when provided */
  onOpenFullPage?: () => void;
  /** Controlled width — parent owns this so it can set sibling paddingRight, etc. */
  width: number;
  /** Called on every drag tick and key-step (live updates so sibling layouts can reflow) */
  onResize: (next: number) => void;
  /** Optional: fired once at drag end (mouseup) — use for persistence (e.g. localStorage write) */
  onResizeCommit?: (final: number) => void;
  minWidth?: number;
  maxWidth?: number;
  /** Pixels reserved above the panel (global topbar height). Default 56. */
  topOffset?: number;
  /**
   * Source table the itemId belongs to. Default 'ph_issue' (project hub /
   * product hub legacy path). Tasks Hub passes 'task' to route through
   * TaskCatalystView. Added 2026-06-16 (Task 1.5d).
   */
  entityKind?: 'ph_issue' | 'task' | 'release';
}

export function CatalystDetailPanel({
  isOpen,
  onClose,
  itemId,
  itemType,
  typeIconLabel,
  projectKey,
  projectId,
  onOpenFullPage,
  width,
  onResize,
  onResizeCommit,
  minWidth = 360,
  maxWidth = 550,
  topOffset = 56,
  entityKind,
}: CatalystDetailPanelProps) {
  const [resizing, setResizing] = useState<{ originX: number; originWidth: number } | null>(null);

  useEffect(() => {
    if (!resizing) return;
    const clamp = (w: number) => Math.max(minWidth, Math.min(maxWidth, w));
    const onMove = (e: MouseEvent) => {
      // Drag handle is on the LEFT edge of a right-anchored panel:
      // dragging LEFT widens the panel.
      const next = clamp(resizing.originWidth + (resizing.originX - e.clientX));
      onResize(next);
    };
    const onUp = (e: MouseEvent) => {
      const final = clamp(resizing.originWidth + (resizing.originX - e.clientX));
      onResize(final);
      onResizeCommit?.(final);
      setResizing(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, minWidth, maxWidth, onResize, onResizeCommit]);

  if (!isOpen) return null;

  return (
    <div
      data-cv-stacked-panel="true"
      style={{
        position: 'fixed',
        top: topOffset,
        right: 0,
        bottom: 0,
        width,
        zIndex: 50,
        borderLeft: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: resizing ? 'none' : 'width 180ms ease',
      }}
    >
      {/* Drag handle — 6px wide bar straddling the panel's left edge */}
      <div
        role="separator"
        aria-label="Resize detail panel"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          setResizing({ originX: e.clientX, originWidth: width });
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const next = Math.min(maxWidth, width + (e.shiftKey ? 40 : 10));
            onResize(next);
            onResizeCommit?.(next);
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = Math.max(minWidth, width - (e.shiftKey ? 40 : 10));
            onResize(next);
            onResizeCommit?.(next);
          }
        }}
        /* Jira-parity splitter (2026-06-22 Vikram):
             - idle: invisible
             - hover/drag: blue hairline via inset box-shadow */
        onMouseEnter={(e) => {
          if (!resizing) e.currentTarget.style.boxShadow = 'inset 1px 0 0 0 var(--ds-link, #1868DB)';
        }}
        onMouseLeave={(e) => {
          if (!resizing) e.currentTarget.style.boxShadow = 'none';
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: -2,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          background: 'transparent',
          boxShadow: resizing ? 'inset 1px 0 0 0 var(--ds-link, #1868DB)' : 'none',
          zIndex: 51,
          transition: 'box-shadow 120ms ease',
        }}
      />

      {/* Header chrome — type icon · "Catalyst work item" · open-full-page · close */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          minHeight: 44,
          flexShrink: 0,
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface, #FFFFFF)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <JiraIssueTypeIcon type={typeIconLabel} size={16} />
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ds-text-subtle, #505258)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Catalyst work item
          </span>
        </div>

        {onOpenFullPage && (
          <button
            type="button"
            aria-label="Open detail in full page"
            onClick={onOpenFullPage}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              color: 'var(--ds-text-subtle, #505258)',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ds-background-neutral, #EBECF0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        )}

        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 3,
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            color: 'var(--ds-text-subtle, #505258)',
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ds-background-neutral, #EBECF0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      {/* Detail content — CatalystDetailRouter in panelMode */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Suspense
          fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Spinner size="medium" />
            </div>
          }
        >
          {entityKind === 'release' ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <ReleaseDetailContent releaseId={itemId} hideChromeHeader />
            </div>
          ) : (
            <CatalystDetailRouter
              isOpen={true}
              onClose={onClose}
              itemId={itemId}
              itemType={itemType}
              projectKey={projectKey}
              projectId={projectId}
              panelMode={true}
              hideSidebar={true}
              entityKind={entityKind}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default CatalystDetailPanel;
