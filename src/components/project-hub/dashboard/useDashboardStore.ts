/**
 * Dashboard V3 shared state — Zustand store
 */
import { create } from 'zustand';

type DrawerType = 'lifecycle' | 'workload' | 'intelligence' | null;

interface DashboardState {
  selectedReleaseIds: string[];
  setSelectedReleaseIds: (ids: string[]) => void;
  activeDrawer: DrawerType;
  drawerPayload: { workItemId?: string; userId?: string; userName?: string };
  openLifecycle: (workItemId: string) => void;
  openWorkload: (userId: string, userName: string) => void;
  openIntelligence: () => void;
  closeDrawer: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedReleaseIds: [],
  setSelectedReleaseIds: (ids) => set({ selectedReleaseIds: ids }),
  activeDrawer: null,
  drawerPayload: {},
  openLifecycle: (workItemId) => set({ activeDrawer: 'lifecycle', drawerPayload: { workItemId } }),
  openWorkload: (userId, userName) => set({ activeDrawer: 'workload', drawerPayload: { userId, userName } }),
  openIntelligence: () => set({ activeDrawer: 'intelligence', drawerPayload: {} }),
  closeDrawer: () => set({ activeDrawer: null, drawerPayload: {} }),
}));
