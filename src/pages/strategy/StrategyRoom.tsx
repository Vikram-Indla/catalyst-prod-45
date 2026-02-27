/**
 * StrategyRoom — Route controller (Chunk 3)
 * Composes Chunk 1 (Dashboard) + Chunk 2 (Brief)
 * Handles Open / Close / Download Brief
 */

import { useState, useCallback, useEffect } from 'react';
import { StrategyRoleProvider } from '@/contexts/strategy/RoleContext';
import StrategyRoomDashboard from '@/components/strategy/room/StrategyRoomDashboard';
import { AIExecutiveBrief } from '@/components/strategy/room/AIExecutiveBrief';

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(9, 9, 11, 0.6)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  overflowY: 'auto',
  animation: 'sri-fadein .25s ease',
};

const OVERLAY_TOKENS = `
@keyframes sri-fadein {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media print {
  .brief-controller-dashboard { display: none !important; }
  .brief-controller-overlay,
  .brief-controller-overlay *,
  .sri-root-container,
  .sri-root-container * {
    position: static !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  .brief-controller-overlay {
    background: white !important;
    backdrop-filter: none !important;
    inset: auto !important;
    z-index: auto !important;
  }
  body { overflow: visible !important; }
}
`;

export default function StrategyRoom() {
  const [briefOpen, setBriefOpen] = useState(false);
  const [printAfterOpen, setPrintAfterOpen] = useState(false);

  const handleOpenBrief = useCallback(() => setBriefOpen(true), []);
  const handleCloseBrief = useCallback(() => setBriefOpen(false), []);

  const handleDownloadBrief = useCallback(() => {
    setBriefOpen(true);
    setPrintAfterOpen(true);
  }, []);

  /* Trigger print after overlay renders */
  useEffect(() => {
    if (briefOpen && printAfterOpen) {
      const timer = setTimeout(() => {
        window.print();
        setPrintAfterOpen(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [briefOpen, printAfterOpen]);

  /* Escape key closes brief */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && briefOpen) handleCloseBrief();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [briefOpen, handleCloseBrief]);

  /* Lock body scroll when overlay is open */
  useEffect(() => {
    if (briefOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [briefOpen]);

  return (
    <StrategyRoleProvider>
      <style>{OVERLAY_TOKENS}</style>

      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
        style={{ background: '#2563EB', color: '#FFFFFF' }}
      >
        Skip to dashboard content
      </a>

      {/* Dashboard (Chunk 1) */}
      <div id="dashboard-main" className="brief-controller-dashboard">
        <StrategyRoomDashboard
          onOpenBrief={handleOpenBrief}
          onDownloadBrief={handleDownloadBrief}
        />
      </div>

      {/* Brief Overlay (Chunk 2) */}
      {briefOpen && (
        <div
          className="brief-controller-overlay"
          style={OVERLAY_STYLE}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseBrief();
          }}
        >
          <AIExecutiveBrief
            open={briefOpen}
            onClose={handleCloseBrief}
          />
        </div>
      )}
    </StrategyRoleProvider>
  );
}
