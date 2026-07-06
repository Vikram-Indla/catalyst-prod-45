/**
 * releaseBannerStore — shared collapse state for the For-You change banner and
 * its docked top-nav SLA timer chip. Collapsing the banner moves the live
 * countdown into the global top nav (persistent, visible on every page);
 * expanding restores the full banner on For You. Persisted to localStorage.
 */
import { create } from 'zustand';

const KEY = 'rb:collapsed';
const initial = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();

interface ReleaseBannerState {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export const useReleaseBannerStore = create<ReleaseBannerState>((set) => ({
  collapsed: initial,
  setCollapsed: (v) => {
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ }
    set({ collapsed: v });
  },
}));
