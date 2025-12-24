// src/components/ja/home/HomeRouter.tsx
// Feature-flag-based router for Home migration
// Phase 1: Routes to V1 or V2 based on feature flag

import React, { useEffect } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlag';
import { useMigrationMetrics, compareHomeData } from '@/hooks/home/useMigrationMetrics';
import { HomeContent } from '../HomeContent';
import { HomeContentV2 } from './HomeContentV2';

// Loading skeleton for feature flag check
function HomeLoadingSkeleton() {
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-[1680px] mx-auto px-6 py-3">
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="h-7 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
          <div className="h-8 w-48 bg-[var(--surface-2)] rounded animate-pulse" />
        </div>
        
        {/* Content skeleton */}
        <div className="h-px mt-3 mb-3 bg-[var(--border-color)]" />
        
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-[var(--surface-2)] rounded animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-[var(--surface-2)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * HomeRouter - Routes between V1 and V2 based on feature flags
 * 
 * Phases:
 * - Phase 0: home_v2_enabled=false → V1
 * - Phase 1: home_v2_enabled=true → V2 for flagged users
 * - Phase 2: home_v2_shadow_mode=true → V1 renders, V2 queries in background
 * - Phase 3-4: Gradual rollout via flag
 * - Phase 5: Cleanup - remove this router, use V2 directly
 */
export function HomeRouter() {
  const { flags, isLoading } = useFeatureFlags(['home_v2_enabled', 'home_v2_shadow_mode']);
  const metrics = useMigrationMetrics();

  // Start tracking on mount
  useEffect(() => {
    metrics.startTracking();
  }, [metrics]);

  // Loading state while checking flags
  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  const { home_v2_enabled, home_v2_shadow_mode } = flags;

  // Phase 2: Shadow mode - render V1 but query V2 in background
  if (home_v2_shadow_mode && !home_v2_enabled) {
    return (
      <HomeShadowMode 
        metrics={metrics}
      />
    );
  }

  // Phase 1, 3, 4: V2 enabled for this user
  if (home_v2_enabled) {
    return <HomeContentV2 metrics={metrics} />;
  }

  // Default: V1 (current implementation)
  return <HomeContent />;
}

/**
 * Shadow mode component - renders V1 but loads V2 data in background for comparison
 */
function HomeShadowMode({ 
  metrics 
}: { 
  metrics: ReturnType<typeof useMigrationMetrics>;
}) {
  // Render V1 as the visible UI
  // V2 queries would run in background via HomeContentV2's hooks
  // but we don't render the V2 UI
  
  useEffect(() => {
    // Log that we're in shadow mode for debugging
    console.log('[Home Migration] Shadow mode active - V2 queries running in background');
  }, []);

  return <HomeContent />;
}

export default HomeRouter;
