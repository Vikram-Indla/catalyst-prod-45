import { create } from 'zustand';

export interface PendingDetailItem {
  id: string;
  projectId?: string;
  projectKey?: string;
  /** Work item type hint — allows CatalystDetailRouter to skip a DB lookup */
  itemType?: string;
  /**
   * 2026-06-17: hub-level entity routing. CatalystDetailRouter short-circuits
   * on entityKind='task' to mount TaskCatalystView (tasks live in their own
   * `tasks` table, not ph_issues). Other values fall through to the standard
   * itemType-based routing.
   */
  entityKind?: 'task' | 'ph_issue';
  /**
   * Open as the right-side panel (the same affordance backlog rows use)
   * instead of the default centred modal. Defaults to false.
   */
  panelMode?: boolean;
}

/**
 * Ephemeral focus hint consumed by detail-view sections that want to land
 * on a specific tab + scroll-target after the view mounts. Set by the
 * caller right before `openDetail`, consumed (and cleared) by the
 * relevant section's mount effect. Currently used by For You's "View
 * thread" link → drops the user straight on the Comments tab.
 */
export type DetailFocusSection = 'comments';

interface GlobalSearchStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Item pending to be opened in CatalystDetailRouter */
  pendingItem: PendingDetailItem | null;
  openDetail: (item: PendingDetailItem) => void;
  clearDetail: () => void;
  /** Optional focus hint for the next detail view that mounts. */
  focusSection: DetailFocusSection | null;
  setFocusSection: (section: DetailFocusSection | null) => void;
  clearFocusSection: () => void;
}

export const useGlobalSearchStore = create<GlobalSearchStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  pendingItem: null,
  openDetail: (item) => set({ pendingItem: item, isOpen: false }),
  clearDetail: () => set({ pendingItem: null }),
  focusSection: null,
  setFocusSection: (section) => set({ focusSection: section }),
  clearFocusSection: () => set({ focusSection: null }),
}));
