// @ts-nocheck
/**
 * UWVContext — global open/close API for the Universal Work View overlay.
 *
 * Mounted inside QueryClientProvider, above AuthProvider (see App.tsx).
 * Lazy-loads the heavy UniversalWorkView surface only when first opened.
 */

import React, { createContext, useContext, useState, useCallback, lazy, Suspense, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import Drawer from '@atlaskit/drawer';
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
      {/* Apr 25, 2026 — UWV is now an Atlaskit Drawer. Replaces the prior
          full-bleed div overlay. Native: blanket, focus trap, ESC-to-close,
          slide animation, elevation.shadow.overlay, return-focus-on-close.
          Width "extended" = calc(100vw - 128px) — executive canvas with a
          sliver of the dashboard visible behind the blanket. */}
      <Drawer
        isOpen={state.isOpen && !!state.params}
        onClose={closeUWV}
        width="extended"
        label={state.params?.title || 'Work view'}
      >
        {state.isOpen && state.params && (
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  width: '100%',
                }}
              >
                <Spinner size="large" />
              </div>
            }
          >
            <UniversalWorkView params={state.params} onClose={closeUWV} />
          </Suspense>
        )}
      </Drawer>
    </UWVContext.Provider>
  );
}

export function useUWV(): UWVContextValue {
  const ctx = useContext(UWVContext);
  if (!ctx) throw new Error('useUWV must be used within UWVProvider');
  return ctx;
}
