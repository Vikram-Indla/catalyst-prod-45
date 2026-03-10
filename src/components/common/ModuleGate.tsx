import React from 'react';
import { useModuleEnabled } from '@/contexts/FeatureFlagContext';
import { FeatureComingSoon } from '@/components/common/FeatureComingSoon';

interface ModuleGateProps {
  moduleKey: string;
  children: React.ReactNode;
  fallbackTitle?: string;
}

/**
 * Runtime module gate — wraps a route/component and shows
 * FeatureComingSoon when the module's feature flag is disabled.
 */
export function ModuleGate({ moduleKey, children, fallbackTitle }: ModuleGateProps) {
  const enabled = useModuleEnabled(moduleKey);

  if (!enabled) {
    return <FeatureComingSoon title={fallbackTitle || 'Module'} />;
  }

  return <>{children}</>;
}
