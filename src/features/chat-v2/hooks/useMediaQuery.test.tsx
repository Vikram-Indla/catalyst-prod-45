import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

/**
 * Drives the mobile <1024px layout branch in ChatV2Shell. A live narrow
 * viewport can't be forced in the headless test browser, so this proves the
 * mechanism the layout depends on: initial match, live change re-sync, and
 * listener cleanup.
 */
type Listener = (e: { matches: boolean }) => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initialMatches,
    media: '',
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    // legacy
    addListener: (cb: Listener) => listeners.add(cb),
    removeListener: (cb: Listener) => listeners.delete(cb),
  };
  const matchMedia = vi.fn((q: string) => {
    mql.media = q;
    return mql as unknown as MediaQueryList;
  });
  (window as unknown as { matchMedia: typeof matchMedia }).matchMedia = matchMedia;
  const emit = (matches: boolean) => {
    mql.matches = matches;
    listeners.forEach((cb) => cb({ matches }));
  };
  return { mql, listeners, emit, matchMedia };
}

describe('useMediaQuery', () => {
  const original = window.matchMedia;
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    (window as unknown as { matchMedia: typeof original }).matchMedia = original;
  });

  it('reports the initial match state', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(result.current).toBe(true);
  });

  it('reports false when the query does not match', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(result.current).toBe(false);
  });

  it('re-syncs when the media query changes (viewport crosses the breakpoint)', () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(result.current).toBe(false);
    act(() => mm.emit(true)); // window shrank below 1024px
    expect(result.current).toBe(true);
    act(() => mm.emit(false)); // widened again
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const mm = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(mm.listeners.size).toBe(1);
    unmount();
    expect(mm.listeners.size).toBe(0);
  });

  it('is SSR-safe when matchMedia is unavailable', () => {
    (window as unknown as { matchMedia: undefined }).matchMedia = undefined;
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(result.current).toBe(false);
  });
});
