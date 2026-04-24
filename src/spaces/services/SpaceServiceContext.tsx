// ============================================================================
// src/spaces/services/SpaceServiceContext.tsx
// React DI seam — every wizard component pulls SpaceService from context,
// never imports an adapter directly. This keeps the UI testable (swap a
// MockSpaceService in MSW tests) and provider-portable.
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react';
import type { SpaceService } from '../types';

const SpaceServiceContext = createContext<SpaceService | null>(null);

export interface SpaceServiceProviderProps {
  service: SpaceService;
  children: ReactNode;
}

export function SpaceServiceProvider({ service, children }: SpaceServiceProviderProps) {
  return (
    <SpaceServiceContext.Provider value={service}>
      {children}
    </SpaceServiceContext.Provider>
  );
}

/**
 * Throws if used outside a provider — fail loud rather than silently
 * returning null and letting the wizard pretend to submit.
 */
export function useSpaceService(): SpaceService {
  const service = useContext(SpaceServiceContext);
  if (!service) {
    throw new Error(
      '[spaces] useSpaceService called outside <SpaceServiceProvider>. ' +
      'Wrap the wizard in <SpaceServiceProvider service={…}>.',
    );
  }
  return service;
}
