import * as React from 'react';

// Named breakpoints for the global top nav (CatalystHeader).
//
// Jira-parity collapse tiers:
//  - isCompact (<1280): Ask Catalyst collapses to icon-only; search stays but
//    shrinks further. Create keeps its label.
//  - isNarrow  (<1024): Create collapses to "+" icon-only; search collapses to
//    a magnifying-glass toggle (click to expand over the top-nav).
//  - isMobile  (<768):  Full takeover — MobileNavigationMenu / MobileBottomNav
//    handle this. Top-nav keeps minimal chrome.
//
// SSR-safe: initial state is `undefined` until the first matchMedia run, so
// server renders never flicker between branches.
const BP_COMPACT = 1280;
const BP_NARROW = 1024;
const BP_MOBILE = 768;

export interface NavBreakpointState {
  isCompact: boolean;
  isNarrow: boolean;
  isMobile: boolean;
}

export function useNavBreakpoint(): NavBreakpointState {
  const [state, setState] = React.useState<NavBreakpointState>(() => {
    if (typeof window === 'undefined') {
      return { isCompact: false, isNarrow: false, isMobile: false };
    }
    const w = window.innerWidth;
    return {
      isCompact: w < BP_COMPACT,
      isNarrow: w < BP_NARROW,
      isMobile: w < BP_MOBILE,
    };
  });

  React.useEffect(() => {
    const mqlCompact = window.matchMedia(`(max-width: ${BP_COMPACT - 1}px)`);
    const mqlNarrow = window.matchMedia(`(max-width: ${BP_NARROW - 1}px)`);
    const mqlMobile = window.matchMedia(`(max-width: ${BP_MOBILE - 1}px)`);

    const sync = () => {
      setState({
        isCompact: mqlCompact.matches,
        isNarrow: mqlNarrow.matches,
        isMobile: mqlMobile.matches,
      });
    };

    sync();
    mqlCompact.addEventListener('change', sync);
    mqlNarrow.addEventListener('change', sync);
    mqlMobile.addEventListener('change', sync);

    return () => {
      mqlCompact.removeEventListener('change', sync);
      mqlNarrow.removeEventListener('change', sync);
      mqlMobile.removeEventListener('change', sync);
    };
  }, []);

  return state;
}
