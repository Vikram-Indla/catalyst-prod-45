/**
 * StrategyRoom — Route controller (Chunk 3)
 * ZERO MOCK DATA. Composes Dashboard + Brief.
 * Data will be fetched from Supabase and passed as props.
 */

import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StrategyRoleProvider } from '@/contexts/strategy/RoleContext';
import StrategyRoomDashboard from '@/components/strategy/room/StrategyRoomDashboard';
import { AIExecutiveBrief } from '@/components/strategy/room/AIExecutiveBrief';
import { useStrategyRoomData } from '@/hooks/strategy/useStrategyRoomData';
import { Breadcrumbs } from '@/components/strategy/Breadcrumbs';
import { RoomContentShell } from '@/components/layout/RoomContentShell';

/* Overlay style removed — Brief now renders inline in content area */

/* Helper: read current theme for overlay print bg */
const getOverlayBg = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return 'var(--cp-bg-elevated, #FFFFFF)';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBriefRoute = location.pathname === '/strategyhub/executive-brief';
  const shouldAutoPrint = searchParams.get('print') === '1';

  /* ─── Live data from database ─── */
  const { themes, budget, workforce, contracts, brief, execution, alignment, fiscal, updatedAgo } = useStrategyRoomData();
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

  const handleOpenBrief = useCallback(() => {
    navigate('/strategyhub/executive-brief');
  }, [navigate]);

  const handleDownloadBrief = useCallback(() => {
    navigate('/strategyhub/executive-brief?print=1');
  }, [navigate]);

  const handleCloseBrief = useCallback(() => {
    navigate('/strategyhub');
  }, [navigate]);

  useEffect(() => {
    if (isBriefRoute && shouldAutoPrint) {
      const timer = setTimeout(() => {
        printBriefInNewWindow();
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('print');
        setSearchParams(nextSearchParams, { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isBriefRoute, printBriefInNewWindow, searchParams, setSearchParams, shouldAutoPrint]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBriefRoute) handleCloseBrief();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleCloseBrief, isBriefRoute]);

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

      {isBriefRoute ? (
        /* Brief renders INLINE in the content area — nav + sidebar stay visible */
        <RoomContentShell maxWidthValue="1600px" className="bg-background dark:bg-transparent">
          <Breadcrumbs items={[
            { label: 'StrategyHub', path: '/strategyhub' },
            { label: 'Strategy Room', path: '/strategyhub' },
            { label: 'Executive Brief' },
          ]} />
          <AIExecutiveBrief open={isBriefRoute} onClose={handleCloseBrief} onDownload={printBriefInNewWindow} />
        </RoomContentShell>
      ) : (
        <div id="dashboard-main" className="brief-controller-dashboard">
          <StrategyRoomDashboard
            onOpenBrief={handleOpenBrief}
            onDownloadBrief={handleDownloadBrief}
            themes={themes}
            budget={budget}
            workforce={workforce}
            contracts={contracts}
            execution={execution}
            alignment={alignment}
            brief={brief}
            fiscal={fiscal}
            updatedAgo={updatedAgo}
          />
        </div>
      )}
    </StrategyRoleProvider>
  );
}
