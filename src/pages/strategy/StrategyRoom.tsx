/**
 * StrategyRoom — Executive dashboard for Strategy Hub
 * Renders inside the existing CatalystShell (AppShell).
 * Uses CommandCenterHeader (locked shared component) + scoped strategy-tokens.css.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import '@/styles/strategy-tokens.css';
import '@/styles/exec-palette.css';
import { useStrategyPreferences } from '@/hooks/useStrategyPreferences';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { StrategyRoomActions } from '@/components/strategy/StrategyRoomActions';
import { VisionBanner } from '@/components/strategy/VisionBanner';
import { StrategyDashboardGrid } from '@/components/strategy/StrategyDashboardGrid';
import { StrategyRoleProvider } from '@/contexts/strategy/RoleContext';

export default function StrategyRoom() {
  const { density, setDensity } = useStrategyPreferences();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['strategy'] });
    await queryClient.invalidateQueries({ queryKey: ['risks'] });
    setIsRefreshing(false);
  };

  return (
    <StrategyRoleProvider>
      {/* Skip to content link */}
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
        style={{ background: '#2563EB', color: '#FFFFFF' }}
      >
        Skip to dashboard content
      </a>

      <div
        className="strategy-room h-full flex flex-col"
        data-density={density}
        style={{ background: 'var(--catalyst-bg-app)', minHeight: '100%' }}
      >
        <CommandCenterHeader
          title="Strategy Room"
          subtitle="Executive dashboard — Ministry of Industry, Saudi Arabia"
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={<StrategyRoomActions density={density} setDensity={setDensity} />}
        />

        <main
          role="main"
          id="dashboard-main"
          style={{ padding: 'var(--catalyst-density-padding-card, 20px)' }}
          className="flex-1 overflow-auto"
        >
          <VisionBanner />
          <StrategyDashboardGrid />
        </main>
      </div>
    </StrategyRoleProvider>
  );
}
