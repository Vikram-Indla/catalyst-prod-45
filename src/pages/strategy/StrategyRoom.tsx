/**
 * StrategyRoom — Executive dashboard for Strategy Hub
 * Renders Chunk 1 (StrategyRoomDashboard) + Chunk 2 (AIExecutiveBrief)
 */

import { useState, useCallback } from 'react';
import { StrategyRoleProvider } from '@/contexts/strategy/RoleContext';
import StrategyRoomDashboard from '@/components/strategy/room/StrategyRoomDashboard';
import { AIExecutiveBrief } from '@/components/strategy/room/AIExecutiveBrief';

export default function StrategyRoom() {
  const [briefOpen, setBriefOpen] = useState(false);

  const handleOpenBrief = useCallback(() => setBriefOpen(true), []);
  const handleDownloadBrief = useCallback(() => {
    // TODO: implement brief download
    setBriefOpen(true);
  }, []);

  return (
    <StrategyRoleProvider>
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
        style={{ background: '#2563EB', color: '#FFFFFF' }}
      >
        Skip to dashboard content
      </a>

      <div id="dashboard-main">
        <StrategyRoomDashboard
          onOpenBrief={handleOpenBrief}
          onDownloadBrief={handleDownloadBrief}
        />
      </div>

      <AIExecutiveBrief open={briefOpen} onClose={() => setBriefOpen(false)} />
    </StrategyRoleProvider>
  );
}
