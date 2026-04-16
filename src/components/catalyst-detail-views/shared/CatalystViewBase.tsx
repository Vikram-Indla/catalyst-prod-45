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
import { useNavigate, Link } from 'react-router-dom';
import { X, Share2, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { IssueIcon, Skel } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';

/* ═══════════════════════════════════════════
   ANIMATIONS — injected once
   ═══════════════════════════════════════════ */
const ANIM_STYLE_ID = 'catalyst-view-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes cv-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes cv-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes cv-panel-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes cv-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes cv-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cv-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `;
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
  onShare, moreMenuItems,
  onTogglePanelMode, navigationItems, currentItemId, onNavigate,
  leftContent, rightContent,
  isLoading,
}: CatalystViewBaseLayoutProps) {

  /* ── State ──────────────────────────────── */
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
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
      setRightPanelWidth(Math.max(220, Math.min(480, rect.right - e.clientX)));
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

  /* ── Escape key ─────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDotsMenu) { setShowDotsMenu(false); return; }
        if (!fullPageMode) onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showDotsMenu, onClose, fullPageMode]);

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
    gap: 6, transition: 'background 0.15s', fontFamily: "'Inter', sans-serif",
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 14px',
    background: 'none', border: 'none', fontSize: 13, color: '#344054', cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', textAlign: 'left',
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

  return (
    <div style={OVERLAY} onClick={panelMode || fullPageMode ? undefined : onClose}>
      <div data-cv-scope style={MODAL} onClick={e => e.stopPropagation()}>

        {/* ── A. TOP BAR ─────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px', minHeight: 44, flexShrink: 0,
          borderBottom: '1px solid #EBECF0',
        }}>
          {/* Breadcrumb — Jira pattern: Project / ParentKey / ItemKey */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#42526E', minWidth: 0 }}>
            {/* Full-page back button */}
            {fullPageMode && (
              <button onClick={handleBack} style={{
                ...hoverBtn, padding: '4px 6px', marginRight: 2,
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                title="Back to list"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            {/* Project — clickable, links to All Work in full-page mode, or type-specific backlog otherwise */}
            {projectKey && (
              <>
                <Link
                  to={fullPageMode
                    ? `/project-hub/${projectKey}/hierarchy/allwork`
                    : `/project-hub/${projectKey}/${itemType?.toLowerCase() === 'epic' ? 'epic-backlog' : itemType?.toLowerCase() === 'story' ? 'backlog' : 'list'}`
                  }
                  style={{ fontSize: 14, fontWeight: 500, color: '#42526E', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#0052CC'; e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#42526E'; e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {projectName || projectKey}
                </Link>
                <span style={{ color: '#C1C7D0', fontSize: 14 }}>/</span>
              </>
            )}
            {projectName && !projectKey && (
              <>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#42526E' }}>{projectName}</span>
                <span style={{ color: '#C1C7D0', fontSize: 14 }}>/</span>
              </>
            )}
            {parentKey && (
              <>
                <IssueIcon type={parentType || 'Epic'} size={16} />
                <span
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#42526E', cursor: onParentClick ? 'pointer' : 'default' }}
                  onClick={onParentClick}
                  onMouseEnter={e => { if (onParentClick) e.currentTarget.style.color = '#0052CC'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#42526E'; }}
                >{parentKey}</span>
                <span style={{ color: '#C1C7D0', fontSize: 14 }}>/</span>
              </>
            )}
            {breadcrumbExtra}
            <IssueIcon type={itemType} size={16} />
            {!fullPageMode && itemKey && projectKey ? (
              <Link
                to={`/project-hub/${projectKey}/issue/${itemKey}`}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#0052CC', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0052CC'; e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#0052CC'; e.currentTarget.style.textDecoration = 'none'; }}
                title="Open full page view"
              >
                {itemKey}
              </Link>
            ) : (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: fullPageMode ? '#172B4D' : '#0052CC' }}>
                {itemKey ?? '—'}
              </span>
            )}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={handleShare} style={hoverBtn}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Share2 size={14} /> <span style={{ fontSize: 12 }}>Share</span>
            </button>

            {moreMenuItems && moreMenuItems.length > 0 && (
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={hoverBtn}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >···</button>
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

            {/* Panel toggle — hidden in full-page mode */}
            {onTogglePanelMode && !fullPageMode && (
              <button onClick={onTogglePanelMode} title={panelMode ? 'Show as modal' : 'Show as side panel'} style={hoverBtn}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {panelMode ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                )}
              </button>
            )}

            {/* Panel navigation */}
            {panelMode && navigationItems && navigationItems.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button onClick={navPrev} disabled={!canNavPrev} style={{
                  ...hoverBtn, cursor: canNavPrev ? 'pointer' : 'default', color: canNavPrev ? '#5E6C84' : '#C1C7D0', padding: '6px 6px',
                }}
                  onMouseEnter={e => { if (canNavPrev) e.currentTarget.style.background = '#F4F5F7'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span style={{ fontSize: 11, color: '#5E6C84', fontFamily: "'JetBrains Mono', monospace", minWidth: 44, textAlign: 'center' }}>
                  {currentNavIndex + 1} / {navigationItems.length}
                </span>
                <button onClick={navNext} disabled={!canNavNext} style={{
                  ...hoverBtn, cursor: canNavNext ? 'pointer' : 'default', color: canNavNext ? '#5E6C84' : '#C1C7D0', padding: '6px 6px',
                }}
                  onMouseEnter={e => { if (canNavNext) e.currentTarget.style.background = '#F4F5F7'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}

            {/* Close — hidden in full-page mode (back button replaces it) */}
            {!fullPageMode && (
              <button onClick={onClose} style={{ ...hoverBtn, fontSize: 16 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#5E6C84'; }}
              ><X size={16} /></button>
            )}
          </div>
        </div>

        {/* ── B. BODY — two-column ───────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* LEFT PANEL */}
          <div style={{
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
          <div style={{
            width: rightPanelWidth, minWidth: 220, maxWidth: 480,
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
      </div>
    </div>
  );
}
