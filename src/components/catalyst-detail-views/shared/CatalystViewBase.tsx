// @ts-nocheck
/**
 * CatalystViewBase — Shared layout shell for all Catalyst detail views.
 *
 * Provides:
 *  - Modal overlay (fixed) OR panel mode (relative)
 *  - Top bar with breadcrumb slot + action buttons (Share, More, Close)
 *  - Two-column body: resizable left panel + right sidebar
 *  - Splitter resize logic
 *  - Escape key handling
 *  - Shared animations
 *
 * Each type-specific view (CatalystViewStory, CatalystViewEpic, etc.)
 * renders its own content into the left/right slots.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import CrossIcon from '@atlaskit/icon/core/close';
import LinkIcon from '@atlaskit/icon/core/link';
import AkFlag, { FlagGroup } from '@atlaskit/flag';
import SuccessIcon from '@atlaskit/icon/glyph/check-circle';
import Modal from '@atlaskit/modal-dialog';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { Skel } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import { TicketBreadcrumbs } from '@/modules/project-work-hub/components/TicketBreadcrumbs';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import { IssueNavChevrons } from '@/components/shared/IssueNavChevrons';
import { useStartTicketThread } from '@/hooks/chat/useStartTicketThread';
import { openConversationInDock } from '@/lib/chat-dock-bridge';

/* ═══════════════════════════════════════════
   ANIMATIONS — injected once
   ═══════════════════════════════════════════ */
const ANIM_STYLE_ID = 'catalyst-view-anims';
if (typeof document !== 'undefined') {
  const css = [
    '@keyframes cv-overlay-in { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes cv-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }',
    '@keyframes cv-panel-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }',
    '@keyframes cv-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }',
    '@keyframes cv-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }',
    '@keyframes cv-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }',
    '.cv-drawer-body { container-type: inline-size; }',
    // ads-scanner:ignore-next-line
    '.cv-drawer-left { min-width: 288px; }',
    /* jira-compare 2026-05-11 DC4: 680px threshold fired at 560px panel-mode body
       (allwork right pane), hiding the sidebar. Jira shows two columns at 461px.
       Lowered to 440px so panel mode (~560px) keeps the sidebar visible. */
    '@container (max-width: 440px) {',
    '  .cv-drawer-splitter { display: none !important; }',
    '  .cv-drawer-sidebar { display: none !important; }',
    '  .cv-drawer-left { border-right: none !important; min-width: 0 !important; }',
    '}',
    /* jira-compare 2026-05-11 — burger-menu Print fix.
       The burger's Print action calls window.print(). Without print-aware
       rules, the printout includes the right rail, splitter, action chrome
       (Close/Share/Watchers/More), and the modal overlay backdrop — none
       of which make sense on paper. Vikram defect: "burger menu print
       clone does not work."
       Rules below: collapse to a single-column body, drop chrome, force
       static layout so the detail view prints like a plain document. */
    /* fullPageMode responsive breakpoint: viewport < 1600px collapses sidebar removed as per plan */
    '@media print {',
    '  .cv-drawer-body { overflow: visible !important; container-type: normal !important; }',
    '  .cv-drawer-sidebar, .cv-drawer-splitter { display: none !important; }',
    '  .cv-drawer-left { width: 100% !important; min-width: 0 !important; border-right: none !important; overflow: visible !important; }',
    '  [data-cv-drawer-topbar-actions], [data-cv-drawer-back], [data-cv-drawer-close] { display: none !important; }',
    '  .cv-drawer-left button[aria-label="Close"],',
    '  .cv-drawer-left button[aria-label="Share"],',
    '  .cv-drawer-left button[aria-label="Manage watchers"],',
    '  .cv-drawer-left button[aria-label="More options"],',
    '  .cv-drawer-left button[aria-label="Toggle panel mode"] { display: none !important; }',
    '}',
  ].join('\n');
  const existing = document.getElementById(ANIM_STYLE_ID);
  if (existing) {
    existing.textContent = css;
  } else {
    const s = document.createElement('style');
    s.id = ANIM_STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }
}

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export interface CatalystViewBaseLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  panelMode?: boolean;
  /** Full-page mode: no overlay/modal chrome, fills viewport below top nav */
  fullPageMode?: boolean;

  /* Breadcrumb */
  itemType: string;
  itemKey: string | null;
  projectKey?: string;
  projectName?: string;
  parentKey?: string | null;
  parentType?: string;
  onParentClick?: () => void;
  breadcrumbExtra?: React.ReactNode;
  /**
   * Canonical Add-parent wiring (Jira parity, 2026-04-19).
   *
   * When provided AND there is no current parent, the detail view's
   * breadcrumb renders an AddParentPicker (bordered pencil chip) that
   * opens the Recent <plural> dropdown and View-all search panel.
   *
   * `parentSource` must match Catalyst's parent-linking rules
   * (see parent-rules.ts for canonical mapping):
   *   Story / Feature             → 'epic'
   *   Epic                        → 'business_request'
   *   Subtask family              → 'story'
   *   Defect / Task               → 'story_epic_feature'
   *   Production Incident / BG    → 'br_epic_feature'
   *   Change Request              → 'story_epic_br'
   */
  onParentChange?: (newParentKey: string | null) => Promise<void> | void;
  parentSource?: 'epic' | 'business_request' | 'story' | 'story_epic_feature' | 'br_epic_feature' | 'story_epic_br' | 'story_epic_feature_br';

  /* Actions */
  moreMenuItems?: { label: string; onClick: () => void; danger?: boolean }[];

  /* Panel navigation */
  onTogglePanelMode?: () => void;
  navigationItems?: { id: string; summary: string; issue_key?: string }[];
  currentItemId?: string;
  onNavigate?: (itemId: string) => void;

  /* Content slots */
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;

  /* Loading */
  isLoading?: boolean;
  /* True when the query finished but returned no record (deleted/invalid issue key) */
  isNotFound?: boolean;
  /** Force-hide the right sidebar regardless of @container query.
   *  Used when the parent layout is in medium mode and the detail container
   *  is too narrow to host both body and sidebar comfortably. */
  hideSidebar?: boolean;
  /** 2026-06-16: override URL builder for the "Open in full page" button.
   *  Used by incident-hub (no project-hub backlog route). */
  fullPageHrefBuilder?: (itemKey: string) => string;
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export function CatalystViewBase({
  isOpen, onClose, panelMode, fullPageMode,
  itemType, itemKey, projectKey, projectName, parentKey, parentType, onParentClick, breadcrumbExtra,
  onParentChange, parentSource,
  moreMenuItems,
  onTogglePanelMode, navigationItems, currentItemId, onNavigate,
  leftContent, rightContent,
  isLoading, isNotFound, hideSidebar, fullPageHrefBuilder,
}: CatalystViewBaseLayoutProps) {

  /* ── State ──────────────────────────────── */
  // Default right sidebar width.
  // jira-compare 2026-05-10: re-probed BAU-5736. Modal split: left ~70% / right ~30%.
  // jira-compare 2026-05-11 DC4: panel mode body = 560px; 285px sidebar left only 269px
  // for content — too narrow. 220px gives 334px left panel at 560px body — acceptable.
  // 313px matches Jira's right rail width (probed 2026-05-15). Panel mode uses 260px
  // (raised from 220 → 260 on 2026-05-19: "Improve Production Incident" button is 236px
  // and was visually clipping at 220px; 260 gives it breathing room without crowding the
  // left content area at typical 1140px AllWork panel widths).
  // 2026-06-15: 260 → 320 → 400 (Vikram, two passes). Right-rail elements
  // (Status pill + Improve dropdown + Discuss CTA + field rows) need real
  // headroom; 320 still felt cramped. 400 gives every field its full
  // affordance without overflow at typical 1140–1440px AllWork panel widths.
  // User can drag-resize narrower via the splitter handle if needed.
  const [rightPanelWidth, setRightPanelWidth] = useState(panelMode ? 400 : 480);
  const [showCopyFlag, setShowCopyFlag] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<DOMRect | null>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);

  /* Discuss CTA — find-or-create the ticket-anchored chat thread and open
     the global chat dock on it. Inherited by ALL detail views via the ⋯ menu.
     Reuses chat_get_or_create_ticket_thread RPC (migration 20260608000100). */
  const startThread = useStartTicketThread();
  const handleDiscuss = useCallback(async () => {
    if (!itemKey || startThread.isPending) return;
    try {
      const convId = await startThread.mutateAsync(itemKey);
      openConversationInDock(convId);
    } catch (e) {
      console.error('Discuss failed:', e);
    }
  }, [itemKey, startThread]);
  const effectiveMoreMenuItems = [
    ...(itemKey ? [{ label: 'Discuss', onClick: handleDiscuss }] : []),
    ...(moreMenuItems ?? []),
  ];

  /* G4: Track recently visited issues in localStorage (catalyst-recent-issues).
     Push when the issue key changes and the panel is open. */
  useEffect(() => {
    if (!isOpen || !itemKey) return;
    try {
      const STORAGE_KEY = 'catalyst-recent-issues';
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: { key: string; title: string; type: string }[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((e) => e.key !== itemKey);
      const updated = [{ key: itemKey, title: itemKey, type: itemType }, ...filtered].slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* quota/parse error — ignore */ }
  }, [isOpen, itemKey, itemType]);

  /* ── Resizable splitter ─────────────────── */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const modalEl = document.querySelector('[data-cv-scope]') as HTMLElement;
      if (!modalEl) return;
      const rect = modalEl.getBoundingClientRect();
      // Clamp 220..600. Max was 480; raised to match Jira's ~549 sidebar.
      setRightPanelWidth(Math.max(220, Math.min(600, rect.right - e.clientX)));
    };
    const onMouseUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  /* Portal dropdown: close on Escape (capture phase beats parent modal) + click-outside */
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setMoreOpen(false); } };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest('[data-cv-more-portal]') && !moreTriggerRef.current?.contains(t)) setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey, true); document.removeEventListener('mousedown', onDown); };
  }, [moreOpen]);

/* ── Escape key ───────────────────────────
     Phase A.2 (2026-04-18): gated to panel mode.
       - Modal mode: @atlaskit/modal-dialog handles Escape natively
         (closing via its own onClose + focus-trap semantics).
       - Fullpage mode: Escape is a no-op (back button replaces it).
       - Panel mode: we still own it. Double-calling onClose in panel mode
         (us + a BacklogPage-level handler) is idempotent. */
  useEffect(() => {
    if (!isOpen || !panelMode) return;
    const isInputFocused = () => {
      const t = document.activeElement as HTMLElement | null;
      return (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t?.isContentEditable
      );
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // 'e' key — activate title inline edit
      if (e.key === 'e') {
        if (isInputFocused()) return;
        const titleEl = document.querySelector<HTMLElement>(
          '[data-testid="catalyst-title-editor"] [role="textbox"], .cv-title-edit-hide-label h1'
        );
        if (titleEl) { titleEl.click(); }
        return;
      }
      // '[' / ']' — prev / next issue navigation (B3)
      if (e.key === '[') {
        if (isInputFocused()) return;
        const prevBtn = document.querySelector<HTMLElement>('[data-cv-nav-prev]');
        if (prevBtn) prevBtn.click();
        return;
      }
      if (e.key === ']') {
        if (isInputFocused()) return;
        const nextBtn = document.querySelector<HTMLElement>('[data-cv-nav-next]');
        if (nextBtn) nextBtn.click();
        return;
      }
      // 't' — open status transition picker (B5)
      if (e.key === 't') {
        if (isInputFocused()) return;
        const statusBtn = document.querySelector<HTMLElement>(
          '[data-testid="status-pill-trigger"], [data-cv-status-trigger]'
        );
        if (statusBtn) statusBtn.click();
        return;
      }
      // 'a' — open assignee picker (B6)
      if (e.key === 'a') {
        if (isInputFocused()) return;
        const assigneeBtn = document.querySelector<HTMLElement>(
          '[data-testid="assignee-field"] [class*="control"], [data-cv-assignee-trigger]'
        );
        if (assigneeBtn) assigneeBtn.click();
        return;
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, panelMode, onClose]);

  /* ── Navigation (full-page back) ─────────── */
  const navigate = useNavigate();
  const location = useLocation();
  const hubBase = location.pathname.startsWith('/product-hub/')
    ? `/product-hub/${projectKey}`
    : `/project-hub/${projectKey}`;
  const projectListHref = location.pathname.includes('/backlog/')
    ? `${hubBase}/backlog`
    : location.pathname.includes('/timeline/')
    ? `${hubBase}/timeline`
    : `${hubBase}/list`;
  const handleBack = useCallback(() => {
    if (fullPageMode) {
      if (projectKey) {
        navigate(projectListHref);
      } else {
        navigate(-1);
      }
    } else {
      onClose();
    }
  }, [fullPageMode, projectKey, navigate, onClose]);

  if (!isOpen) return null;

  /* ── Panel navigation helpers ───────────── */
  const currentNavIndex = navigationItems?.findIndex(n => n.id === currentItemId) ?? -1;
  const canNavPrev = currentNavIndex > 0;
  const canNavNext = navigationItems ? currentNavIndex < navigationItems.length - 1 : false;
  const navPrev = () => { if (canNavPrev && navigationItems) onNavigate?.(navigationItems[currentNavIndex - 1].id); };
  const navNext = () => { if (canNavNext && navigationItems) onNavigate?.(navigationItems[currentNavIndex + 1].id); };

  /* ── Styles ─────────────────────────────── */
  const OVERLAY: React.CSSProperties = fullPageMode ? {
    position: 'relative', width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
  } : panelMode ? {
    position: 'relative', width: '100%', height: '100%',
  } : {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'var(--ds-blanket, rgba(9,30,66,.54))',
    padding: '40px 16px', overflowY: 'auto',
    animation: 'cv-overlay-in 200ms ease-out',
  };

  const MODAL: React.CSSProperties = fullPageMode ? {
    /* 2026-05-12: fullPageMode is always inside a constrained-height container
       (BacklogDetailPage / IssueFullPage both wrap with height:100%;flex:1;minHeight:0).
       overflow:hidden + height:100% constrains MODAL to parent height so cv-drawer-body
       (flex:1) gets a fixed height and can be the scroll container.
       Prior approach (minHeight:100%, overflow:visible) assumed page-level scroll, which
       doesn't exist inside the project hub layout. */
    width: '100%', height: '100%', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  } : panelMode ? {
    width: '100%', minWidth: '100%', height: '100%', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    // 2026-05-24 — anti-dance fix: cv-panel-in slide-in intentionally absent here.
    // The panel is already on-screen; replaying the entrance animation on every
    // cross-type ticket remount (QA Bug → Story etc.) made the panel jump 20px
    // sideways. Modal mode keeps its cv-card-in entrance; panel mode has no
    // entrance animation because it never "enters" mid-session.
    borderLeft: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
  } : {
    width: 1100, maxWidth: '95vw', minHeight: 600, maxHeight: 'calc(100vh - 80px)',
    background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', borderRadius: 8,
    display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--ds-shadow-overlay, 0 8px 32px rgba(9,30,66,.25))', overflow: 'hidden',
    animation: 'cv-card-in 250ms ease-out',
  };


  /* ── Card contents ─────────────────────────────────────────────────────
     Top bar + body JSX, extracted as a fragment so all three modes
     (modal / panel / fullpage) render the same content inside different
     wrappers. Phase A.2 (2026-04-18): modal mode now wraps in
     @atlaskit/modal-dialog; panel + fullpage keep the hand-rolled shell.
     ──────────────────────────────────────────────────────────────────── */
  const cardContents = (
    <>

        {/* ── A. TOP BAR ─────────────────────────────────────────────────────
            Jira-parity (2026-04-19): breadcrumb + inline Prev/Next chevrons
            render in ALL modes (panel, modal, full-page). The BAU surface
            at /project-hub/:key/allwork uses panelMode but has no outer
            toolbar that owns the breadcrumb, so the detail view itself
            must render it — matches Atlassian's pattern where chevrons
            sit immediately after the issue key with tooltips such as
            "Next work item 'BAU-5421'".
            ──────────────────────────────────────────────────────────────── */}

        {/* ── A. TOP BAR ─────────────────────────────────────────────────────
            Jira-parity (2026-04-19): breadcrumb + inline Prev/Next chevrons
            render in ALL modes (panel, modal, full-page). The BAU surface
            at /project-hub/:key/allwork uses panelMode but has no outer
            toolbar that owns the breadcrumb, so the detail view itself
            must render it — matches Atlassian's pattern where chevrons
            sit immediately after the issue key with tooltips such as
            "Next work item 'BAU-5421'".
            ──────────────────────────────────────────────────────────────── */}
        {/* jira-compare 2026-05-11 DC4: sticky top bar for panel/fullpage modes.
            When the outer page scrolls, the breadcrumb/action bar must remain
            pinned so subtasks don't scroll behind an inaccessible header.
            Modal mode omitted — @atlaskit/modal-dialog owns its own scroll context. */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px', minHeight: 32, flexShrink: 0,
          ...((!panelMode && !fullPageMode) ? {} : {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          }),
        }}>
          {/* Canonical breadcrumb — shown in every mode. When the current
              item has no parent and the owning view has wired onParentChange,
              we swap the default "+ Add parent" text link for the canonical
              AddParentPicker (Jira-parity bordered pencil chip). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>

            {projectKey ? (
              <TicketBreadcrumbs
                projectKey={projectKey}
                projectName={projectName}
                itemType={itemType}
                itemKey={itemKey}
                parentKey={parentKey}
                parentType={parentType}
                onParentClick={onParentClick}
                projectHref={projectListHref}
                middleSlot={
                  !parentKey && itemKey && onParentChange
                    ? (
                      <AddParentPicker
                        issueKey={itemKey}
                        parentKey={null}
                        projectKey={projectKey}
                        parentIssueType={parentType}
                        onParentChange={onParentChange}
                        variant="breadcrumb"
                        parentSource={parentSource ?? 'epic'}
                      />
                    )
                    : undefined
                }
              />
            ) : null}
            {breadcrumbExtra}

            {/* Inline Prev/Next chevrons — Jira parity. Up = previous,
                Down = next (Atlassian convention). Canonical component
                IssueNavChevrons owns the 28×28 / 1px var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))) / 4px-radius
                styling (verified against Jira Cloud, 2026-04-19). */}
            {navigationItems && navigationItems.length > 1 && (() => {
              const prevKey = canNavPrev ? (navigationItems[currentNavIndex - 1].issue_key ?? '') : '';
              const nextKey = canNavNext ? (navigationItems[currentNavIndex + 1].issue_key ?? '') : '';
              return (
                <IssueNavChevrons
                  style={{ marginLeft: 4 }}
                  onPrev={navPrev}
                  onNext={navNext}
                  prevDisabled={!canNavPrev}
                  nextDisabled={!canNavNext}
                  prevTooltip={canNavPrev && prevKey ? `Previous work item '${prevKey}'` : 'No previous work item'}
                  nextTooltip={canNavNext && nextKey ? `Next work item '${nextKey}'` : 'No next work item'}
                />
              );
            })()}
          </div>

          {/* Right actions — More menu + Open-in-fullpage + Close.
              WatchersChip / CopyLink / Share text button removed 2026-05-26
              (Vikram: deprecated, redundant). DropdownMenu replaced with a
              portal-based implementation to fix the @atlaskit/popup v4.16
              top-left positioning bug (same pattern as ProjectHeaderChip). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* B10: Link issue button — copies canonical ticket permalink to clipboard. */}
            <Tooltip content="Copy link">
              <IconButton
                appearance="subtle"
                icon={() => <LinkIcon size="small" />}
                label="Copy link"
                onClick={() => {
                  const url = (itemKey && projectKey)
                    ? `${window.location.origin}/browse/${itemKey}`
                    : window.location.href;
                  navigator.clipboard.writeText(url);
                  setShowCopyFlag(true);
                  setTimeout(() => setShowCopyFlag(false), 3000);
                }}
              />
            </Tooltip>

            {effectiveMoreMenuItems.length > 0 && (
              <>
                <button
                  ref={moreTriggerRef}
                  aria-label="More actions"
                  aria-haspopup="true"
                  aria-expanded={moreOpen}
                  onClick={() => {
                    const rect = moreTriggerRef.current?.getBoundingClientRect() ?? null;
                    setMoreAnchor(rect);
                    setMoreOpen(v => !v);
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 4, borderRadius: 4, width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ds-text-subtle, #42526E)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,.06))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="3.5" r="1.25" fill="currentColor"/>
                    <circle cx="8" cy="8" r="1.25" fill="currentColor"/>
                    <circle cx="8" cy="12.5" r="1.25" fill="currentColor"/>
                  </svg>
                </button>
                {moreOpen && moreAnchor && createPortal(
                  <div
                    data-cv-more-portal
                    style={{
                      position: 'fixed',
                      top: moreAnchor.bottom + 4,
                      right: window.innerWidth - moreAnchor.right,
                      zIndex: 10000,
                      background: 'var(--ds-surface-overlay, #FFFFFF)',
                      borderRadius: 4,
                      boxShadow: 'var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,.25))',
                      minWidth: 180,
                      padding: '4px 0',
                      border: '1px solid var(--ds-border, #DFE1E6)',
                    }}
                  >
                    {effectiveMoreMenuItems.filter(item => !item.danger).map((item, i) => (
                      <button key={i} onClick={() => { item.onClick(); setMoreOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,.06))')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >{item.label}</button>
                    ))}
                    {effectiveMoreMenuItems.some(item => item.danger) && (
                      <>
                        <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
                        {effectiveMoreMenuItems.filter(item => item.danger).map((item, i) => (
                          <button key={i} onClick={() => { item.onClick(); setMoreOpen(false); }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 14, color: 'var(--ds-text-danger, #AE2A19)', fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,.06))')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >{item.label}</button>
                        ))}
                      </>
                    )}
                  </div>,
                  document.body
                )}
              </>
            )}

            {/* Open in full page — panel mode only */}
            {panelMode && !fullPageMode && itemKey && (
              <Tooltip content="Open in full page">
                <IconButton
                  appearance="subtle"
                  icon={() => (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                  )}
                  label="Open in full page"
                  onClick={() => {
                    /* 2026-06-16: builder override for non-project-hub
                       surfaces (incident hub navigates to /incident-hub/view/:uuid). */
                    if (fullPageHrefBuilder && itemKey) {
                      navigate(fullPageHrefBuilder(itemKey));
                      return;
                    }
                    navigate(projectKey ? `/project-hub/${projectKey}/backlog/${itemKey}` : `/browse/${itemKey}`);
                  }}
                />
              </Tooltip>
            )}

            {/* Panel toggle — modal mode only */}
            {onTogglePanelMode && !fullPageMode && !panelMode && (
              <Tooltip content={panelMode ? 'Show as modal' : 'Show as side panel'}>
                <IconButton
                  appearance="subtle"
                  icon={() => (panelMode ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                  ))}
                  label={panelMode ? 'Show as modal' : 'Show as side panel'}
                  onClick={onTogglePanelMode}
                />
              </Tooltip>
            )}

            {/* Close — modal mode only */}
            {!fullPageMode && !panelMode && (
              <Tooltip content="Close (Esc)">
                <IconButton
                  appearance="subtle"
                  icon={() => <CrossIcon size="small" />}
                  label="Close"
                  onClick={onClose}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── B. BODY — two-column (restacks to single column under 680px via @container) ──
            2026-05-12: fullPageMode — body IS the scroll container (overflowY:auto).
            MODAL is constrained to height:100% so body gets a fixed height via flex:1.
            Left panel grows freely; sidebar stays sticky at top of body's visible area.
            Panel/modal modes keep overflow:hidden (columns each scroll independently). */}
        <div className="cv-drawer-body" style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'hidden', overflowY: fullPageMode ? 'auto' : 'hidden', alignItems: fullPageMode ? 'flex-start' : 'stretch' }}>

          {/* LEFT PANEL —
              jira-compare follow-up (2026-05-02): data-sdm-scope added so
              the SectionBlock count-badge / row typography rules in
              story-detail-extensions.css apply here. Without it the
              bare spans render as "Defects0" with no spacing or badge
              chrome. */}
          {/* 2026-05-12: fullPageMode — left panel grows freely (no overflow-y:auto);
              cv-drawer-body (overflowY:auto) is now the scroll container.
              Panel/modal modes keep overflow-y:auto for independent column scroll. */}
          <div className="cv-drawer-left" data-sdm-scope style={{
            flex: 1, padding: '8px 16px 32px 16px',
            borderRight: '1px solid var(--ds-border-subtle, #EBECF0)', minWidth: 0, minHeight: 0,
            // fullPageMode: cap field rows at ~1200px (Jira parity). Without this, fields like
            // Priority and Severity stretch to fill the full viewport width.
            ...(fullPageMode ? { maxWidth: 1200 } : { overflowY: 'auto' }),
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} />
                <div style={{ height: 20 }} /><Skel w="100%" h={200} />
              </div>
            ) : isNotFound ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))', textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Issue not found</div>
                <div style={{ fontSize: 14 }}>This issue may have been deleted or the key is invalid.</div>
              </div>
            ) : leftContent}
          </div>

          {/* RESIZABLE SPLITTER */}
          <div
            className="cv-drawer-splitter"
            onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
            style={{
              width: 6, minWidth: 6, cursor: 'col-resize', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))')}
            onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 1.5, height: 32, borderRadius: 1, background: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))', transition: 'background 0.15s' }} />
          </div>

          {/* RIGHT PANEL — Sidebar
              2026-05-12: sticky within cv-drawer-body (the scroll container).
              maxHeight:100% = body height (not 100vh) so the sidebar can't exceed
              the scroll container's visible area. overflowY:auto for internal scroll
              when sidebar content is taller than the body.
              Panel/modal modes keep overflow-y:auto for independent column scroll. */}
          <div className="cv-drawer-sidebar" style={{
            width: rightPanelWidth, minWidth: 220, maxWidth: 600,
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', overflowX: 'hidden',
            display: hideSidebar ? 'none' : 'flex', flexDirection: 'column', padding: '16px 4px 32px 16px',
            minHeight: 0,
            ...(fullPageMode
              ? { position: 'sticky', top: 0, maxHeight: '100%', overflowY: 'auto', alignSelf: 'flex-start' }
              : { overflowY: 'auto' }
            ),
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skel w={100} h={28} /><div style={{ height: 12 }} />
                <Skel w={60} h={12} /><Skel w="100%" h={16} />
                <Skel w={60} h={12} /><Skel w="100%" h={16} />
              </div>
            ) : isNotFound ? null : rightContent}
          </div>
        </div>
    </>
  );

  /* ── Modal mode: @atlaskit/modal-dialog wrapper ─────────────────────────
     Owns overlay, focus trap, escape, body-scroll-lock, and click-outside-
     to-close. All hand-rolled equivalents for modal mode have been removed
     (escape gated to panelMode above; OVERLAY / MODAL style objects for
     the modal branch are now dead in this path but kept for the panel /
     fullpage return below so we don't duplicate the style map). */
  if (!panelMode && !fullPageMode) {
    // jira-compare 2026-05-08: removed height:'90vh' + overflow:'hidden' from the root wrapper.
    // @atlaskit/modal-dialog's ScrollContainer already has overflow:hidden + its own max-height
    // context. Setting height:90vh inside it created a double height context that clipped the
    // top bar (modal header overlap). The modal dialog owns its own sizing; our wrapper just
    // needs flex layout. Each column (left/right) independently scrolls via overflowY:'auto'.
    return (
      <Modal onClose={onClose} width={1280} shouldScrollInViewport={false}>
        <div data-cv-scope style={{
          minHeight: 600, display: 'flex', flexDirection: 'column',
        }}>
          {cardContents}
        </div>
      </Modal>
    );
  }

  /* ── Panel + fullpage modes: hand-rolled shell (unchanged from Phase A.1) ──
     Apr 28, 2026 (jira-compare cycle 2 — Phase B B13): added
     `role="dialog"` + `aria-label` on the inner shell so screen
     readers announce it as a discrete view. `aria-modal` is set per
     mode — modal-style overlay traps focus (true), the side-panel
     mode coexists with the table behind it (false), full-page mode
     IS the page (omitted). Falls back to a generic "Work item
     details" label if `itemKey` hasn't loaded yet. */
  const ariaLabel = itemKey ? `${itemKey} — work item details` : 'Work item details';
  return (
    <>
      <div style={OVERLAY} onClick={panelMode || fullPageMode ? undefined : onClose}>
        <div
          data-cv-scope
          role={fullPageMode ? undefined : 'dialog'}
          aria-modal={fullPageMode ? undefined : panelMode ? 'false' : 'true'}
          aria-label={fullPageMode ? undefined : ariaLabel}
          style={MODAL}
          onClick={e => e.stopPropagation()}
        >
          {cardContents}
        </div>
      </div>
    </>
  );
}