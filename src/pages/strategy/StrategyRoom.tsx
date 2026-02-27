/**
 * StrategyRoom — Route controller (Chunk 3)
 * ZERO MOCK DATA. Composes Dashboard + Brief.
 * Data will be fetched from Supabase and passed as props.
 */

import { useState, useCallback, useEffect } from 'react';
import { StrategyRoleProvider } from '@/contexts/strategy/RoleContext';
import StrategyRoomDashboard from '@/components/strategy/room/StrategyRoomDashboard';
import { AIExecutiveBrief } from '@/components/strategy/room/AIExecutiveBrief';
import { useStrategyRoomData } from '@/hooks/strategy/useStrategyRoomData';

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
  html, body, #root {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  .brief-controller-dashboard { display: none !important; }
  .brief-controller-overlay {
    position: static !important;
    inset: auto !important;
    z-index: auto !important;
    background: white !important;
    backdrop-filter: none !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    display: block !important;
  }
  .brief-controller-overlay * {
    overflow: visible !important;
    max-height: none !important;
  }
  .sri-root-container {
    position: static !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
}
`;

export default function StrategyRoom() {
  const [briefOpen, setBriefOpen] = useState(false);
  const [printAfterOpen, setPrintAfterOpen] = useState(false);

  /* ─── Live data from database ─── */
  const { themes, budget, workforce, contracts, brief, fiscal, updatedAgo } = useStrategyRoomData();
  const printBriefInNewWindow = useCallback(() => {
    const briefRoot = document.querySelector('.sri-root-container') as HTMLElement | null;
    if (!briefRoot) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const printableRoot = briefRoot.cloneNode(true) as HTMLElement;
    printableRoot.querySelectorAll('.sri-actions').forEach((el) => el.remove());

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Executive Brief</title>
    ${styles}
    <style>
      @page { size: auto; margin: 14mm; }
      html, body { margin: 0; padding: 0; background: #fff; overflow: visible !important; height: auto !important; }
      .sri-root-container, .sri-root-container * { position: static !important; overflow: visible !important; height: auto !important; max-height: none !important; }
      .sri-root-container { inset: auto !important; z-index: auto !important; background: #fff !important; }
      [data-sri] .sri-actions { display: none !important; }
    </style>
  </head>
  <body>${printableRoot.outerHTML}</body>
</html>`);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 350);
  }, []);

  const handleOpenBrief = useCallback(() => setBriefOpen(true), []);
  const handleCloseBrief = useCallback(() => setBriefOpen(false), []);

  const handleDownloadBrief = useCallback(() => {
    setBriefOpen(true);
    setPrintAfterOpen(true);
  }, []);

  useEffect(() => {
    if (briefOpen && printAfterOpen) {
      const timer = setTimeout(() => {
        printBriefInNewWindow();
        setPrintAfterOpen(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [briefOpen, printAfterOpen, printBriefInNewWindow]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && briefOpen) handleCloseBrief();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [briefOpen, handleCloseBrief]);

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

      <div id="dashboard-main" className="brief-controller-dashboard">
        <StrategyRoomDashboard
          onOpenBrief={handleOpenBrief}
          onDownloadBrief={handleDownloadBrief}
          themes={themes}
          budget={budget}
          workforce={workforce}
          contracts={contracts}
          execution={null}
          alignment={null}
          brief={brief}
          fiscal={fiscal}
          updatedAgo={updatedAgo}
        />
      </div>

      {/* Brief Overlay */}
      {briefOpen && (
        <div
          className="brief-controller-overlay"
          style={OVERLAY_STYLE}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseBrief();
          }}
        >
          <AIExecutiveBrief open={briefOpen} onClose={handleCloseBrief} onDownload={printBriefInNewWindow} />
        </div>
      )}
    </StrategyRoleProvider>
  );
}
