/**
 * Test Repository Zustand Store
 */

import { create } from 'zustand';
import type { TreeNode, TestSuite, RepositoryTestCase } from '@/types/test-repository';
import { mockTreeData, mockSuites, mockTestCases } from '@/data/mockTestRepositoryData';

interface RepositoryStore {
  // Tree State
  tree: TreeNode[];
  expandedFolders: Set<string>;
  selectedId: string | null;
  selectedType: 'folder' | 'suite' | null;

  // Test List State
  currentSuite: TestSuite | null;
  tests: RepositoryTestCase[];
  selectedTestIds: Set<string>;

  // UI State
  isDrawerOpen: boolean;
  activeTestId: string | null;
  contextMenuTarget: { id: string; type: string; x: number; y: number } | null;
  renamingId: string | null;
  searchQuery: string;

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
  // Initial State
  tree: mockTreeData,
  expandedFolders: new Set(['folder-auth']), // Auth folder expanded by default
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

    if (type === 'suite') {
      const suite = mockSuites.find(s => s.id === id) || null;
      const tests = mockTestCases.filter(t => t.suiteId === id);
      set({ currentSuite: suite, tests });
    } else {
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
}));
