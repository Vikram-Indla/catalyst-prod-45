// @ts-nocheck
/**
 * UWVContext — global open/close API for the Universal Work View overlay.
 *
 * Mounted inside QueryClientProvider, above AuthProvider (see App.tsx).
 * Lazy-loads the heavy UniversalWorkView surface only when first opened.
 */

import React, { createContext, useContext, useState, useCallback, lazy, Suspense, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import type { UWVParams, UWVState } from './uwv.types';

const UniversalWorkView = lazy(() =>
  import('./UniversalWorkView').then((m) => ({ default: m.UniversalWorkView })),
);

interface UWVContextValue {
  openUWV: (params: UWVParams) => void;
  closeUWV: () => void;
}

const UWVContext = createContext<UWVContextValue | null>(null);

export function UWVProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UWVState>({ isOpen: false, params: null });

  const openUWV = useCallback((params: UWVParams) => {
    setState({ isOpen: true, params });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('workview', 'open');
      if (params.scope) url.searchParams.set('wvscope', params.scope);
      if (params.quarter) url.searchParams.set('wvquarter', params.quarter);
      if (params.title) url.searchParams.set('wvtitle', encodeURIComponent(params.title));
      window.history.pushState({}, '', url.toString());
    } catch {
      /* ignore url errors */
    }
  }, []);

  const closeUWV = useCallback(() => {
    setState({ isOpen: false, params: null });
    try {
      const url = new URL(window.location.href);
      ['workview', 'wvscope', 'wvquarter', 'wvtitle'].forEach((p) => url.searchParams.delete(p));
      window.history.pushState({}, '', url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  // Close UWV on browser back/forward navigation.
  useEffect(() => {
    const onPop = () => {
      try {
        const url = new URL(window.location.href);
        if (!url.searchParams.get('workview')) {
          setState({ isOpen: false, params: null });
        }
      } catch {
        /* noop */
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <UWVContext.Provider value={{ openUWV, closeUWV }}>
      {children}
      {state.isOpen && state.params && (
        <Suspense
          fallback={
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 510,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFFFFF',
              }}
            >
              <Spinner size="large" />
            </div>
          }
        >
          <UniversalWorkView params={state.params} onClose={closeUWV} />
        </Suspense>
      )}
    </UWVContext.Provider>
  );
}

export function useUWV(): UWVContextValue {
  const ctx = useContext(UWVContext);
  if (!ctx) throw new Error('useUWV must be used within UWVProvider');
  return ctx;
}
