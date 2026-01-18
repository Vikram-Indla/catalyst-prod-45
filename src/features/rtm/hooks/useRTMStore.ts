/**
 * RTM Zustand Store
 */
import { create } from 'zustand';
import type {
  RTMMetrics,
  RequirementTreeNode,
  RequirementTableRow,
  RequirementDetailViewModel,
  RTMFilters,
  RTMSorting,
  ViewMode,
  TestLink,
} from '../types';

interface RTMState {
  // Data
  metrics: RTMMetrics | null;
  tree: RequirementTreeNode[];
  tableData: RequirementTableRow[];
  selectedRequirement: RequirementDetailViewModel | null;
  
  // UI State
  viewMode: ViewMode;
  expandedTreeNodes: Set<string>;
  selectedTreeNodeId: string | null;
  isDetailPanelOpen: boolean;
  
  // Filters & Sorting
  filters: RTMFilters;
  sorting: RTMSorting;
  
  // Loading States
  isLoading: boolean;
  
  // Actions
  setData: (metrics: RTMMetrics, tree: RequirementTreeNode[], tableData: RequirementTableRow[]) => void;
  setLoading: (loading: boolean) => void;
  toggleTreeNode: (id: string) => void;
  selectTreeNode: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectTableRow: (id: string) => void;
  setSorting: (column: RTMSorting['column']) => void;
  setFilter: <K extends keyof RTMFilters>(key: K, value: RTMFilters[K]) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  openDetailPanel: (id: string) => void;
  closeDetailPanel: () => void;
}

export const useRTMStore = create<RTMState>((set, get) => ({
  // Initial State
  metrics: null,
  tree: [],
  tableData: [],
  selectedRequirement: null,
  viewMode: 'matrix',
  expandedTreeNodes: new Set(),
  selectedTreeNodeId: null,
  isDetailPanelOpen: false,
  filters: {
    releaseId: null,
    type: null,
    coverageStatus: null,
    priority: null,
    searchQuery: '',
  },
  sorting: {
    column: 'key',
    direction: 'asc',
  },
  isLoading: false,

  // Actions - Data management (called from useRTMData hook)
  setData: (metrics, tree, tableData) => {
    set({
      metrics,
      tree,
      tableData,
      isLoading: false,
      expandedTreeNodes: new Set(tree.slice(0, 3).map(n => n.id)),
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  toggleTreeNode: (id: string) => {
    const { expandedTreeNodes, tree } = get();
    const newExpanded = new Set(expandedTreeNodes);
    
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    
    // Update tree with new expansion state
    const updateTreeExpansion = (nodes: RequirementTreeNode[]): RequirementTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        isExpanded: newExpanded.has(node.id),
        children: updateTreeExpansion(node.children),
      }));
    };
    
    set({
      expandedTreeNodes: newExpanded,
      tree: updateTreeExpansion(tree),
    });
  },

  selectTreeNode: (id: string) => {
    const { tree, tableData } = get();
    
    const updateTreeSelection = (nodes: RequirementTreeNode[]): RequirementTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        isSelected: node.id === id,
        children: updateTreeSelection(node.children),
      }));
    };
    
    // Find corresponding table row and open detail
    const row = tableData.find(r => r.id === id);
    
    set({
      selectedTreeNodeId: id,
      tree: updateTreeSelection(tree),
    });
    
    if (row) {
      get().openDetailPanel(id);
    }
  },

  expandAll: () => {
    const { tree } = get();
    const allIds = new Set<string>();
    
    const collectIds = (nodes: RequirementTreeNode[]) => {
      nodes.forEach(node => {
        if (node.hasChildren) {
          allIds.add(node.id);
        }
        collectIds(node.children);
      });
    };
    collectIds(tree);
    
    const updateTreeExpansion = (nodes: RequirementTreeNode[]): RequirementTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        isExpanded: node.hasChildren,
        children: updateTreeExpansion(node.children),
      }));
    };
    
    set({
      expandedTreeNodes: allIds,
      tree: updateTreeExpansion(tree),
    });
  },

  collapseAll: () => {
    const { tree } = get();
    
    const updateTreeExpansion = (nodes: RequirementTreeNode[]): RequirementTreeNode[] => {
      return nodes.map(node => ({
        ...node,
        isExpanded: false,
        children: updateTreeExpansion(node.children),
      }));
    };
    
    set({
      expandedTreeNodes: new Set(),
      tree: updateTreeExpansion(tree),
    });
  },

  selectTableRow: (id: string) => {
    get().openDetailPanel(id);
  },

  setSorting: (column: RTMSorting['column']) => {
    const { sorting, tableData } = get();
    const newDirection = sorting.column === column && sorting.direction === 'asc' ? 'desc' : 'asc';
    
    const sortedData = [...tableData].sort((a, b) => {
      let comparison = 0;
      switch (column) {
        case 'key':
          comparison = a.key.localeCompare(b.key);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'coverage':
          comparison = a.coveragePercentage - b.coveragePercentage;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return newDirection === 'asc' ? comparison : -comparison;
    });
    
    set({
      sorting: { column, direction: newDirection },
      tableData: sortedData,
    });
  },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        releaseId: null,
        type: null,
        coverageStatus: null,
        priority: null,
        searchQuery: '',
      },
    });
  },

  setSearchQuery: (query: string) => {
    set(state => ({
      filters: { ...state.filters, searchQuery: query },
    }));
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  openDetailPanel: (id: string) => {
    const { tableData } = get();
    const row = tableData.find(r => r.id === id);
    
    if (row) {
      const detail: RequirementDetailViewModel = {
        id: row.id,
        key: row.key,
        title: row.title,
        description: `This is the detailed description for ${row.title}. It outlines the specific requirements and acceptance criteria that must be met.`,
        type: row.type,
        priority: row.priority,
        coveragePercentage: row.coveragePercentage,
        coverageStatus: row.coverageStatus,
        coverageStats: row.coverageDetail,
        parentKey: row.type === 'requirement' ? 'STORY-301' : row.type === 'story' ? 'FEAT-201' : null,
        releaseName: 'Release 9.8',
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-15T14:30:00Z',
        linkedTests: row.linkedTests,
      };
      
      set({
        selectedRequirement: detail,
        isDetailPanelOpen: true,
        selectedTreeNodeId: id,
      });
    }
  },

  closeDetailPanel: () => {
    set({
      isDetailPanelOpen: false,
      selectedRequirement: null,
    });
  },
}));
