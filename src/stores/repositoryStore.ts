/**
 * Test Repository Zustand Store
 * Manages UI state for the Test Repository page
 * Data fetching is handled separately by useRepositoryData hook
 */

import { create } from 'zustand';
import type { TreeNode, TestSuite, RepositoryTestCase } from '@/types/test-repository';

// Modal target info
interface ModalTarget {
  id: string;
  name: string;
  type: 'folder' | 'suite' | 'test';
  parentId?: string | null;
  childCount?: number;
}

interface RepositoryStore {
  // Tree State (populated from Supabase via setTree)
  tree: TreeNode[];
  setTree: (tree: TreeNode[]) => void;
  expandedFolders: Set<string>;
  selectedId: string | null;
  selectedType: 'folder' | 'suite' | null;

  // Test List State
  currentSuite: TestSuite | null;
  tests: RepositoryTestCase[];
  selectedTestIds: Set<string>;
  setCurrentSuite: (suite: TestSuite | null) => void;
  setTests: (tests: RepositoryTestCase[]) => void;

  // UI State
  isDrawerOpen: boolean;
  activeTestId: string | null;
  contextMenuTarget: { id: string; type: string; x: number; y: number } | null;
  renamingId: string | null;
  searchQuery: string;

  // Modal State
  newFolderModalOpen: boolean;
  newSuiteModalOpen: boolean;
  newTestModalOpen: boolean;
  moveModalOpen: boolean;
  deleteModalOpen: boolean;
  modalTarget: ModalTarget | null;

  // Actions
  toggleFolder: (folderId: string) => void;
  selectItem: (id: string, type: 'folder' | 'suite') => void;
  expandAll: () => void;
  collapseAll: () => void;
  setSearchQuery: (query: string) => void;

  // Drawer
  openDrawer: (testId: string) => void;
  closeDrawer: () => void;

  // Test Selection
  toggleTestSelection: (testId: string) => void;
  selectAllTests: () => void;
  clearTestSelection: () => void;

  // Context Menu
  openContextMenu: (id: string, type: string, x: number, y: number) => void;
  closeContextMenu: () => void;

  // Rename
  startRename: (id: string) => void;
  finishRename: (newName: string) => void;
  cancelRename: () => void;

  // Modal Actions
  openNewFolderModal: (parentId?: string | null, parentName?: string) => void;
  openNewSuiteModal: (parentId?: string | null, parentName?: string) => void;
  openNewTestModal: () => void;
  openMoveModal: (id: string, name: string, type: 'folder' | 'suite' | 'test', parentId?: string | null) => void;
  openDeleteModal: (id: string, name: string, type: 'folder' | 'suite' | 'test', childCount?: number) => void;
  closeModals: () => void;
}

// Collect all folder IDs for expandAll
function getAllFolderIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const traverse = (items: TreeNode[]) => {
    items.forEach(node => {
      if (node.type === 'folder') {
        ids.push(node.id);
        if (node.children) traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return ids;
}

export const useRepositoryStore = create<RepositoryStore>((set, get) => ({
  // Initial State - empty, will be populated from Supabase
  tree: [],
  expandedFolders: new Set(),
  selectedId: null,
  selectedType: null,
  currentSuite: null,
  tests: [],
  selectedTestIds: new Set(),
  isDrawerOpen: false,
  activeTestId: null,
  contextMenuTarget: null,
  renamingId: null,
  searchQuery: '',

  // Modal State
  newFolderModalOpen: false,
  newSuiteModalOpen: false,
  newTestModalOpen: false,
  moveModalOpen: false,
  deleteModalOpen: false,
  modalTarget: null,

  // Data setters (called from useRepositoryData hook)
  setTree: (tree) => set({ tree }),
  setCurrentSuite: (suite) => set({ currentSuite: suite }),
  setTests: (tests) => set({ tests }),

  // Actions
  toggleFolder: (folderId) => {
    set(state => {
      const next = new Set(state.expandedFolders);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return { expandedFolders: next };
    });
  },

  selectItem: (id, type) => {
    set({ selectedId: id, selectedType: type, selectedTestIds: new Set() });
    // Note: Suite/test data loading is now handled externally via hooks
    if (type === 'folder') {
      set({ currentSuite: null, tests: [] });
    }
  },

  expandAll: () => {
    const allIds = getAllFolderIds(get().tree);
    set({ expandedFolders: new Set(allIds) });
  },

  collapseAll: () => {
    set({ expandedFolders: new Set() });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Drawer
  openDrawer: (testId) => {
    set({ isDrawerOpen: true, activeTestId: testId });
  },

  closeDrawer: () => {
    set({ isDrawerOpen: false, activeTestId: null });
  },

  // Test Selection
  toggleTestSelection: (testId) => {
    set(state => {
      const next = new Set(state.selectedTestIds);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return { selectedTestIds: next };
    });
  },

  selectAllTests: () => {
    set(state => ({
      selectedTestIds: new Set(state.tests.map(t => t.id)),
    }));
  },

  clearTestSelection: () => {
    set({ selectedTestIds: new Set() });
  },

  // Context Menu
  openContextMenu: (id, type, x, y) => {
    set({ contextMenuTarget: { id, type, x, y } });
  },

  closeContextMenu: () => {
    set({ contextMenuTarget: null });
  },

  // Rename
  startRename: (id) => {
    set({ renamingId: id });
  },

  finishRename: (newName) => {
    const { renamingId, tree } = get();
    if (!renamingId || !newName.trim()) {
      set({ renamingId: null });
      return;
    }

    // Update tree (in real app, this would call API)
    const updateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === renamingId) {
          return { ...node, name: newName.trim() };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    set({ tree: updateNode(tree), renamingId: null });
  },

  cancelRename: () => {
    set({ renamingId: null });
  },

  // Modal Actions
  openNewFolderModal: (parentId, parentName) => {
    set({
      newFolderModalOpen: true,
      modalTarget: parentId 
        ? { id: parentId, name: parentName || '', type: 'folder', parentId }
        : null,
    });
  },

  openNewSuiteModal: (parentId, parentName) => {
    set({
      newSuiteModalOpen: true,
      modalTarget: parentId
        ? { id: parentId, name: parentName || '', type: 'folder', parentId }
        : null,
    });
  },

  openNewTestModal: () => {
    const { currentSuite } = get();
    if (currentSuite) {
      set({
        newTestModalOpen: true,
        modalTarget: {
          id: currentSuite.id,
          name: currentSuite.name,
          type: 'suite',
        },
      });
    }
  },

  openMoveModal: (id, name, type, parentId) => {
    set({
      moveModalOpen: true,
      modalTarget: { id, name, type, parentId },
    });
  },

  openDeleteModal: (id, name, type, childCount) => {
    set({
      deleteModalOpen: true,
      modalTarget: { id, name, type, childCount },
    });
  },

  closeModals: () => {
    set({
      newFolderModalOpen: false,
      newSuiteModalOpen: false,
      newTestModalOpen: false,
      moveModalOpen: false,
      deleteModalOpen: false,
      modalTarget: null,
    });
  },
}));
