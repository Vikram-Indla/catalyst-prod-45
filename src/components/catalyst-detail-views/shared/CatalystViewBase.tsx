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
import { useNavigate } from 'react-router-dom';
import { X, Share2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@atlaskit/modal-dialog';
import Button, { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { Skel } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import { TicketBreadcrumbs } from '@/modules/project-work-hub/components/TicketBreadcrumbs';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import { IssueNavChevrons } from '@/components/shared/IssueNavChevrons';
import { WatchersChip } from './WatchersChip';

/* ═══════════════════════════════════════════
   ANIMATIONS — injected once
   ═══════════════════════════════════════════ */
const ANIM_STYLE_ID = 'catalyst-view-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = [
    '@keyframes cv-overlay-in { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes cv-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }',
    '@keyframes cv-panel-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }',
    '@keyframes cv-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }',
    '@keyframes cv-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }',
    '@keyframes cv-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }',
    '.cv-drawer-body { container-type: inline-size; }',
    '.cv-drawer-left { min-width: 280px; }',
    '@container (max-width: 1120px) {',
    '  .cv-drawer-splitter { display: none !important; }',
    '  .cv-drawer-sidebar { display: none !important; }',
    '  .cv-drawer-left { border-right: none !important; min-width: 0 !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
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
   *   Subtask                     → 'story'
   *   Defect / Task               → 'story_epic_feature'
   *   Production Incident         → 'story_epic_feature_br'
   */
  onParentChange?: (newParentKey: string | null) => Promise<void> | void;
  parentSource?: 'epic' | 'business_request' | 'story' | 'story_epic_feature' | 'story_epic_feature_br';

  /* Actions */
  onShare?: () => void;
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
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export function CatalystViewBase({
  isOpen, onClose, panelMode, fullPageMode,
  itemType, itemKey, projectKey, projectName, parentKey, parentType, onParentClick, breadcrumbExtra,
  onParentChange, parentSource,
  onShare, moreMenuItems,
  onTogglePanelMode, navigationItems, currentItemId, onNavigate,
  leftContent, rightContent,
  isLoading,
}: CatalystViewBaseLayoutProps) {

  /* ── State ──────────────────────────────── */
  // Default right sidebar width. Measured against live Jira 2026-04-18
  // (digital-transformation.atlassian.net BAU-5419): Jira's right sidebar
  // is 549px wide with 504px of content area. At 280px the Reporter name
  // "Nada alfassam" wraps onto two lines because the value column has only
  // ~130px after the 96px label + 20px gap. Bumping default to 380 and
  // max to 600 so values have real estate to breathe. Min stays at 220
  // for the compact-drawer (container-query) path used by Backlog.
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const isDraggingRef = useRef(false);
  const dotsMenuRef = useRef<HTMLDivElement>(null);

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

  /* ── Close dots menu on outside click ───── */
  useEffect(() => {
    if (!showDotsMenu) return;
    const h = (e: MouseEvent) => { if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) setShowDotsMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDotsMenu]);

  /* ── Escape key ───────────────────────────
     Phase A.2 (2026-04-18): gated to panel mode.
       - Modal mode: @atlaskit/modal-dialog handles Escape natively
         (closing via its own onClose + focus-trap semantics).
       - Fullpage mode: Escape is a no-op (back button replaces it).
       - Panel mode: we still own it. Double-calling onClose in panel mode
         (us + a BacklogPage-level handler) is idempotent. */
  useEffect(() => {
    if (!isOpen || !panelMode) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDotsMenu) { setShowDotsMenu(false); return; }
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, panelMode, showDotsMenu, onClose]);

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
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'rgba(9, 30, 66, 0.54)',
    padding: '40px 16px', overflowY: 'auto',
    animation: 'cv-overlay-in 200ms ease-out',
  };

  const MODAL: React.CSSProperties = fullPageMode ? {
    width: '100%', height: '100%', background: '#FFFFFF',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  } : panelMode ? {
    width: '100%', height: '100%', background: '#FFFFFF',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animation: 'cv-panel-in 200ms ease-out',
    borderLeft: '1px solid #DFE1E6',
  } : {
    width: 1100, maxWidth: '95vw', minHeight: 600, maxHeight: 'calc(100vh - 80px)',
    background: '#FFFFFF', borderRadius: 8,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)', overflow: 'hidden',
    animation: 'cv-card-in 250ms ease-out',
  };

  const hoverBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
    borderRadius: 4, color: '#42526E', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center',
    gap: 6, transition: 'background 0.15s', fontFamily: 'var(--cp-font-body)',
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 14px',
    background: 'none', border: 'none', fontSize: 13, color: '#344054', cursor: 'pointer',
    fontFamily: 'var(--cp-font-body)', textAlign: 'left',
  };

  /* ── Navigation (full-page back) ─────────── */
  const navigate = useNavigate();
  const handleBack = useCallback(() => {
    if (fullPageMode) {
      if (projectKey) {
        navigate(`/project-hub/${projectKey}/list`);
      } else {
        navigate(-1);
      }
    } else {
      onClose();
    }
  }, [fullPageMode, projectKey, navigate, onClose]);

  /* ── Share handler ──────────────────────── */
  const handleShare = useCallback(() => {
    if (onShare) { onShare(); return; }
    if (fullPageMode && itemKey && projectKey) {
      navigator.clipboard.writeText(`${window.location.origin}/project-hub/${projectKey}/issue/${itemKey}`);
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
    toast.success('Link copied to clipboard');
  }, [onShare, fullPageMode, itemKey, projectKey]);

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
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px', minHeight: 44, flexShrink: 0,
          borderBottom: '1px solid #EBECF0',
        }}>
          {/* Canonical breadcrumb — shown in every mode. When the current
              item has no parent and the owning view has wired onParentChange,
              we swap the default "+ Add parent" text link for the canonical
              AddParentPicker (Jira-parity bordered pencil chip). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {projectKey ? (
              <TicketBreadcrumbs
                projectKey={projectKey}
                itemType={itemType}
                itemKey={itemKey}
                parentKey={parentKey}
                parentType={parentType}
                onParentClick={onParentClick}
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
                IssueNavChevrons owns the 28×28 / 1px #DFE1E6 / 4px-radius
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

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Watchers eye + count — Jira parity. Lives between the
                nav chevrons and Share. ph_issue_watchers backs it. */}
            {itemKey && <WatchersChip issueKey={itemKey} />}

            {/* Phase B (2026-04-18): @atlaskit/button with iconBefore.
                Hover state + typography owned by Atlaskit tokens. */}
            <Button
              appearance="subtle"
              iconBefore={() => <Share2 size={16} />}
              onClick={handleShare}
            >
              Share
            </Button>

            {moreMenuItems && moreMenuItems.length > 0 && (
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                {/* Phase B (2026-04-18): Atlaskit IconButton trigger.
                    Dropdown render below is unchanged — trigger swap only. */}
                <IconButton
                  appearance="subtle"
                  isSelected={showDotsMenu}
                  icon={() => <MoreHorizontal size={18} />}
                  label="More actions"
                  onClick={() => setShowDotsMenu(!showDotsMenu)}
                />
                {showDotsMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: 32, background: '#FFF',
                    border: '1px solid #DFE1E6', borderRadius: 4,
                    boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '8px 0',
                    zIndex: 50, minWidth: 200,
                  }}>
                    {moreMenuItems.map((item, i) => (
                      <React.Fragment key={i}>
                        {item.danger && i > 0 && <div style={{ height: 1, background: '#EBECF0', margin: '6px 0' }} />}
                        <button
                          onClick={() => { setShowDotsMenu(false); item.onClick(); }}
                          style={{ ...menuItemStyle, color: item.danger ? '#DE350B' : '#344054' }}
                          onMouseEnter={e => (e.currentTarget.style.background = item.danger ? '#FFEBE6' : '#F4F5F7')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >{item.label}</button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Panel toggle — hidden in full-page mode AND panel mode
                (outer BacklogPage toolbar has Expand/Fullscreen IconButtons).
                Phase B (2026-04-18): IconButton + Tooltip. SVG kept inline
                since this is a custom glyph not in @atlaskit/icon. */}
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

            {/* Prev/Next removed from right actions — now rendered inline
                next to the breadcrumb (Jira parity, 2026-04-19). */}

            {/* Close — hidden in full-page mode (back button replaces it)
                AND hidden in panel mode (outer toolbar owns Close).
                Phase B (2026-04-18): IconButton + Tooltip. The hand-rolled
                danger-red hover tint has been dropped for Atlaskit's token-
                driven hover, consistent with the rest of the drawer chrome. */}
            {!fullPageMode && !panelMode && (
              <Tooltip content="Close (Esc)">
                <IconButton
                  appearance="subtle"
                  icon={() => <X size={18} />}
                  label="Close"
                  onClick={onClose}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── B. BODY — two-column (restacks to single column under 680px via @container) ── */}
        <div className="cv-drawer-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* LEFT PANEL */}
          <div className="cv-drawer-left" style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px 32px 24px',
            borderRight: '1px solid #EBECF0', minWidth: 0,
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} />
                <div style={{ height: 20 }} /><Skel w="100%" h={200} />
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
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
            onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 1.5, height: 32, borderRadius: 1, background: '#DFE1E6', transition: 'background 0.15s' }} />
          </div>

          {/* RIGHT PANEL — Sidebar */}
          <div className="cv-drawer-sidebar" style={{
            width: rightPanelWidth, minWidth: 220, maxWidth: 600,
            background: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skel w={100} h={28} /><div style={{ height: 12 }} />
                <Skel w={60} h={12} /><Skel w="100%" h={16} />
                <Skel w={60} h={12} /><Skel w="100%" h={16} />
              </div>
            ) : rightContent}
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
    return (
      <Modal onClose={onClose} width={1100} shouldScrollInViewport={false}>
        <div data-cv-scope style={{
          minHeight: 600,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {cardContents}
        </div>
      </Modal>
    );
  }

  /* ── Panel + fullpage modes: hand-rolled shell (unchanged from Phase A.1) ── */
  return (
    <div style={OVERLAY} onClick={panelMode || fullPageMode ? undefined : onClose}>
      <div data-cv-scope style={MODAL} onClick={e => e.stopPropagation()}>
        {cardContents}
      </div>
    </div>
  );
}