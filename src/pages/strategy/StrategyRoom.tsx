/**
 * StrategyRoom — Executive dashboard for Strategy Hub
 * Renders inside the existing CatalystShell (AppShell).
 * Uses scoped strategy-tokens.css for Catalyst V11 design tokens.
 */

import '@/styles/strategy-tokens.css';
import { useStrategyPreferences } from '@/hooks/useStrategyPreferences';
import { Breadcrumbs } from '@/components/strategy/Breadcrumbs';
import { VisionBanner } from '@/components/strategy/VisionBanner';
import { StrategyRoomHeader } from '@/components/strategy/StrategyRoomHeader';
import { StrategyDashboardGrid } from '@/components/strategy/StrategyDashboardGrid';

const breadcrumbItems = [
  { label: 'Catalyst', path: '/' },
  { label: 'StrategyHub', path: '/strategyhub' },
  { label: 'Strategy Room' },
];

export default function StrategyRoom() {
  const { density, setDensity } = useStrategyPreferences();

  return (
    <>
      {/* Skip to content link */}
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
        style={{
          background: 'var(--catalyst-primary, #2563EB)',
          color: '#FFFFFF',
        }}
      >
        Skip to dashboard content
      </a>

      <div
        className="strategy-room h-full"
        data-density={density}
        style={{
          background: 'var(--catalyst-bg-app)',
          padding: 'var(--catalyst-density-padding-card)',
          minHeight: '100%',
        }}
      >
        <main role="main" id="dashboard-main">
          <Breadcrumbs items={breadcrumbItems} />
          <VisionBanner />
          <StrategyRoomHeader density={density} onDensityChange={setDensity} />
          <StrategyDashboardGrid />
        </main>
      </div>
    </>
  );
}
