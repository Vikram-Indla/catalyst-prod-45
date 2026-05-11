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
import CrossIcon from '@atlaskit/icon/core/close';
import ShareIcon from '@atlaskit/icon/core/share';
import MoreIcon from '@atlaskit/icon/core/menu';
import LinkIcon from '@atlaskit/icon/core/link';
import { toast } from 'sonner';
import Modal from '@atlaskit/modal-dialog';
import Button, { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
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
if (typeof document !== 'undefined') {
  const css = [
    '@keyframes cv-overlay-in { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes cv-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }',
    '@keyframes cv-panel-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }',
    '@keyframes cv-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }',
    '@keyframes cv-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }',
    '@keyframes cv-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }',
    '.cv-drawer-body { container-type: inline-size; }',
    '.cv-drawer-left { min-width: 280px; }',
    /* jira-compare 2026-05-11 DC4: 680px threshold fired at 560px panel-mode body
       (allwork right pane), hiding the sidebar. Jira shows two columns at 461px.
       Lowered to 440px so panel mode (~560px) keeps the sidebar visible. */
    '@container (max-width: 440px) {',
    '  .cv-drawer-splitter { display: none !important; }',
    '  .cv-drawer-sidebar { display: none !important; }',
    '  .cv-drawer-left { border-right: none !important; min-width: 0 !important; }',
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
  /* True when the query finished but returned no record (deleted/invalid issue key) */
  isNotFound?: boolean;
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
  isLoading, isNotFound,
}: CatalystViewBaseLayoutProps) {

  /* ── State ──────────────────────────────── */
  // Default right sidebar width.
  // jira-compare 2026-05-10: re-probed BAU-5736. Modal split: left ~70% / right ~30%.
  // jira-compare 2026-05-11 DC4: panel mode body = 560px; 285px sidebar left only 269px
  // for content — too narrow. 220px gives 334px left panel at 560px body — acceptable.
  const [rightPanelWidth, setRightPanelWidth] = useState(panelMode ? 220 : 285);
  const isDraggingRef = useRef(false);

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
    /* jira-compare 2026-05-05: fullPageMode doesn't clip — the page-level scroll
       container owns scroll. minHeight:100% so the background fills the viewport
       even when content is short. overflow:visible so sticky right rail works. */
    width: '100%', minHeight: '100%', background: 'var(--ds-surface, #FFFFFF)',
    display: 'flex', flexDirection: 'column',
  } : panelMode ? {
    width: '100%', height: '100%', background: 'var(--ds-surface, #FFFFFF)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animation: 'cv-panel-in 200ms ease-out',
    borderLeft: '1px solid #DFE1E6',
  } : {
    width: 1100, maxWidth: '95vw', minHeight: 600, maxHeight: 'calc(100vh - 80px)',
    background: 'var(--ds-surface, #FFFFFF)', borderRadius: 8,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)', overflow: 'hidden',
    animation: 'cv-card-in 250ms ease-out',
  };

  const hoverBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
    borderRadius: 4, color: '#42526E', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center',
    gap: 6, transition: 'background 0.15s', fontFamily: 'var(--cp-font-body)',
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

  /* ── Share handler ──────────────────────────────────────────────────
     2026-05-10 fix: Share must always copy the canonical ticket URL,
     not the hub URL.  Previously gated on `fullPageMode`, which meant
     modal mode fell through to `window.location.href` — i.e. the page
     the modal was opened from (e.g. /project-hub/BAU/allwork), not the
     ticket itself.  Vikram defect: "When I click Share, it shows the
     hub URL but not the ticket URL."
     New contract: whenever itemKey + projectKey are known, the share
     URL is the canonical permalink, regardless of mode.
     ──────────────────────────────────────────────────────────────────── */
  const handleShare = useCallback(() => {
    if (onShare) { onShare(); return; }
    const ticketUrl = (itemKey && projectKey)
      ? `${window.location.origin}/project-hub/${projectKey}/issue/${itemKey}`
      : null;
    navigator.clipboard.writeText(ticketUrl ?? window.location.href);
    toast.success('Link copied to clipboard');
  }, [onShare, itemKey, projectKey]);

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
          padding: '10px 20px', minHeight: 44, flexShrink: 0,
          borderBottom: '1px solid #EBECF0',
          ...((!panelMode && !fullPageMode) ? {} : {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--ds-surface, #FFFFFF)',
          }),
        }}>
          {/* Canonical breadcrumb — shown in every mode. When the current
              item has no parent and the owning view has wired onParentChange,
              we swap the default "+ Add parent" text link for the canonical
              AddParentPicker (Jira-parity bordered pencil chip). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {projectKey ? (
              <TicketBreadcrumbs
                projectKey={projectKey}
                projectName={projectName}
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
                IssueNavChevrons owns the 28×28 / 1px var(--ds-border, #DFE1E6) / 4px-radius
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

            {/* B10: Link issue button — Jira parity: chain-link icon between
                Watchers and Share. Stub handler for now. */}
            <Tooltip content="Link issue">
              <IconButton
                appearance="subtle"
                icon={() => <LinkIcon size="small" />}
                label="Link issue"
                onClick={() => console.log('Link issue', itemKey)}
              />
            </Tooltip>

            {/* Phase B (2026-04-18): @atlaskit/button with iconBefore.
                Hover state + typography owned by Atlaskit tokens. */}
            <Button
              appearance="subtle"
              iconBefore={() => <ShareIcon size="small" />}
              onClick={handleShare}
            >
              Share
            </Button>

            {moreMenuItems && moreMenuItems.length > 0 && (
              <DropdownMenu
                trigger={({ triggerRef, ...props }) => (
                  <IconButton
                    {...props}
                    ref={triggerRef}
                    appearance="subtle"
                    icon={() => <MoreIcon size="small" />}
                    label="More actions"
                  />
                )}
                placement="bottom-end"
              >
                {/* Standard items (non-danger) */}
                <DropdownItemGroup>
                  {moreMenuItems.filter(item => !item.danger).map((item, i) => (
                    <DropdownItem key={i} onClick={item.onClick}>
                      {item.label}
                    </DropdownItem>
                  ))}
                </DropdownItemGroup>
                {/* Danger items in a separate group (visually separated) */}
                {moreMenuItems.some(item => item.danger) && (
                  <DropdownItemGroup>
                    {moreMenuItems.filter(item => item.danger).map((item, i) => (
                      <DropdownItem key={i} onClick={item.onClick}>
                        <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{item.label}</span>
                      </DropdownItem>
                    ))}
                  </DropdownItemGroup>
                )}
              </DropdownMenu>
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
                  icon={() => <CrossIcon size="small" />}
                  label="Close"
                  onClick={onClose}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── B. BODY — two-column (restacks to single column under 680px via @container) ──
            jira-compare 2026-05-05: fullPageMode removes overflow:hidden so the page-level
            scroll container (the layout's main flex pane) drives scrolling, enabling
            position:sticky on the right rail. Panel/modal modes keep overflow:hidden to
            clip columns within the bounded pane. */}
        <div className="cv-drawer-body" style={{ flex: 1, display: 'flex', overflow: fullPageMode ? 'visible' : 'hidden', alignItems: fullPageMode ? 'flex-start' : 'stretch' }}>

          {/* LEFT PANEL —
              jira-compare follow-up (2026-05-02): data-sdm-scope added so
              the SectionBlock count-badge / row typography rules in
              story-detail-extensions.css apply here. Without it the
              bare spans render as "Defects0" with no spacing or badge
              chrome. */}
          {/* jira-compare 2026-05-05: fullPageMode — left panel grows freely (no
              overflow-y:auto) so the page-level scroll container handles scrolling,
              enabling the sticky right rail. Panel/modal modes keep overflow-y:auto
              for independent column scroll within the bounded pane. */}
          <div className="cv-drawer-left" data-sdm-scope style={{
            flex: 1, padding: '20px 24px 32px 24px',
            borderRight: '1px solid #EBECF0', minWidth: 0, minHeight: 0,
            ...(!fullPageMode ? { overflowY: 'auto' } : {}),
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} />
                <div style={{ height: 20 }} /><Skel w="100%" h={200} />
              </div>
            ) : isNotFound ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: 'var(--ds-text-subtlest, #6B778C)', textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Issue not found</div>
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
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
            onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 1.5, height: 32, borderRadius: 1, background: 'var(--ds-border, #DFE1E6)', transition: 'background 0.15s' }} />
          </div>

          {/* RIGHT PANEL — Sidebar
              jira-compare 2026-05-05: Jira parity — right rail is sticky in
              fullPageMode (probed BAU-5609: rail stays pinned at top while
              left content scrolls past it). Panel/modal modes keep overflow-y:auto
              for independent column scroll within the bounded pane.
              position:sticky + align-self:flex-start only activate in fullPageMode. */}
          <div className="cv-drawer-sidebar" style={{
            width: rightPanelWidth, minWidth: 220, maxWidth: 600,
            background: 'var(--ds-surface, #FFFFFF)', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            minHeight: 0,
            ...(fullPageMode
              ? { position: 'sticky', top: 0, maxHeight: '100vh', overflowY: 'auto', alignSelf: 'flex-start' }
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
  );
}