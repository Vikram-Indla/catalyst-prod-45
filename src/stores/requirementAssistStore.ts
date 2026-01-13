// ============================================================
// REQUIREMENT ASSIST STORE
// Zustand state management for the entire module
// ============================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

export type GenerationStatus = 
  | 'draft' 
  | 'analyzing' 
  | 'generating' 
  | 'validating' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type WorkItemType = 'epic' | 'feature' | 'story' | 'task' | 'test_case' | 'prd';

export interface Generation {
  id: string;
  displayId: string;
  title: string | null;
  inputText: string;
  inputWordCount: number;
  analysis: Analysis;
  programId: string | null;
  projectId: string | null;
  status: GenerationStatus;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  epicCount: number;
  featureCount: number;
  storyCount: number;
  totalCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface Analysis {
  title?: string;
  actors: string[];
  functions: string[];
  nfrs: string[];
  integrations: string[];
  complexity: 'low' | 'medium' | 'high';
  warnings: string[];
  suggestions: string[];
}

export interface WorkItem {
  id: string;
  generationId: string;
  parentId: string | null;
  itemType: WorkItemType;
  level: number;
  sortOrder: number;
  displayId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string[];
  confidenceScore: number;
  confidenceReason: string | null;
  isSelected: boolean;
  isEdited: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  children?: WorkItem[];
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  color: string;
}

export interface Project {
  id: string;
  programId: string;
  name: string;
  description: string | null;
  code: string | null;
}

export interface OutputConfig {
  prd: boolean;
  epics: boolean;
  features: boolean;
  stories: boolean;
  tasks: boolean;
  testCases: boolean;
}

// ============================================================
// STORE STATE INTERFACE
// ============================================================

interface RequirementAssistState {
  // ==================
  // INPUT STATE
  // ==================
  inputText: string;
  inputSource: 'manual' | 'upload' | 'template' | 'paste';
  
  // ==================
  // GENERATION STATE
  // ==================
  generation: Generation | null;
  isGenerating: boolean;
  generationError: string | null;
  
  // ==================
  // WORK ITEMS STATE
  // ==================
  workItems: WorkItem[];
  workItemsTree: WorkItem[];
  
  // ==================
  // UI STATE
  // ==================
  selectedItemId: string | null;
  isDetailOpen: boolean;
  expandedIds: Set<string>;
  filterType: 'all' | 'epic' | 'feature' | 'story';
  searchQuery: string;
  
  // ==================
  // CONFIGURATION
  // ==================
  programId: string | null;
  projectId: string | null;
  programs: Program[];
  projects: Project[];
  outputConfig: OutputConfig;
  
  // ==================
  // LIVE ANALYSIS
  // ==================
  analysis: Analysis;
  isAnalyzing: boolean;
  
  // ==================
  // ACTIONS - INPUT
  // ==================
  setInputText: (text: string) => void;
  setInputSource: (source: 'manual' | 'upload' | 'template' | 'paste') => void;
  clearInput: () => void;
  
  // ==================
  // ACTIONS - GENERATION
  // ==================
  setGeneration: (generation: Generation | null) => void;
  updateGeneration: (updates: Partial<Generation>) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  
  // ==================
  // ACTIONS - WORK ITEMS
  // ==================
  setWorkItems: (items: WorkItem[]) => void;
  addWorkItem: (item: WorkItem) => void;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => void;
  removeWorkItem: (id: string) => void;
  toggleItemSelection: (id: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  
  // ==================
  // ACTIONS - UI
  // ==================
  selectItem: (id: string | null) => void;
  openDetail: () => void;
  closeDetail: () => void;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setFilterType: (type: 'all' | 'epic' | 'feature' | 'story') => void;
  setSearchQuery: (query: string) => void;
  
  // ==================
  // ACTIONS - CONFIGURATION
  // ==================
  setProgramId: (id: string | null) => void;
  setProjectId: (id: string | null) => void;
  setPrograms: (programs: Program[]) => void;
  setProjects: (projects: Project[]) => void;
  setOutputConfig: (config: Partial<OutputConfig>) => void;
  
  // ==================
  // ACTIONS - ANALYSIS
  // ==================
  setAnalysis: (analysis: Analysis) => void;
  updateAnalysis: (updates: Partial<Analysis>) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  
  // ==================
  // ACTIONS - RESET
  // ==================
  reset: () => void;
  resetGeneration: () => void;
}

// ============================================================
// INITIAL STATE VALUES
// ============================================================

const initialAnalysis: Analysis = {
  title: undefined,
  actors: [],
  functions: [],
  nfrs: [],
  integrations: [],
  complexity: 'low',
  warnings: [],
  suggestions: [],
};

const initialOutputConfig: OutputConfig = {
  prd: false,  // PRD is NOT a publishable item - used internally for AI processing only
  epics: true,
  features: true,
  stories: true,
  tasks: false,
  testCases: false,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Build tree structure from flat work items array
 */
function buildWorkItemsTree(items: WorkItem[]): WorkItem[] {
  // Filter out PRD items - they are NOT publishable and should not appear in tree
  const publishableItems = items.filter(item => item.itemType !== 'prd');
  
  const itemMap = new Map<string, WorkItem>();
  const roots: WorkItem[] = [];

  // First pass: create map and reset children
  publishableItems.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree
  publishableItems.forEach((item) => {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      const parent = itemMap.get(item.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sortOrder
  const sortChildren = (nodes: WorkItem[]): WorkItem[] => {
    return nodes
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((node) => ({
        ...node,
        children: node.children ? sortChildren(node.children) : [],
      }));
  };

  return sortChildren(roots);
}

// ============================================================
// CREATE STORE
// ============================================================

export const useRequirementAssistStore = create<RequirementAssistState>()(
  devtools(
    persist(
      (set, get) => ({
        // ==================
        // INITIAL STATE
        // ==================
        inputText: '',
        inputSource: 'manual',
        generation: null,
        isGenerating: false,
        generationError: null,
        workItems: [],
        workItemsTree: [],
        selectedItemId: null,
        isDetailOpen: false,
        expandedIds: new Set<string>(),
        filterType: 'all',
        searchQuery: '',
        programId: null,
        projectId: null,
        programs: [],
        projects: [],
        outputConfig: initialOutputConfig,
        analysis: initialAnalysis,
        isAnalyzing: false,

        // ==================
        // INPUT ACTIONS
        // ==================
        setInputText: (text) => set({ inputText: text }),
        
        setInputSource: (source) => set({ inputSource: source }),
        
        clearInput: () => set({ 
          inputText: '', 
          inputSource: 'manual',
          analysis: initialAnalysis 
        }),

        // ==================
        // GENERATION ACTIONS
        // ==================
        setGeneration: (generation) => set({ generation }),
        
        updateGeneration: (updates) => set((state) => ({
          generation: state.generation 
            ? { ...state.generation, ...updates } 
            : null,
        })),
        
        setGenerating: (isGenerating) => set({ isGenerating }),
        
        setGenerationError: (error) => set({ generationError: error }),

        // ==================
        // WORK ITEMS ACTIONS
        // ==================
        setWorkItems: (items) => set({ 
          workItems: items,
          workItemsTree: buildWorkItemsTree(items),
        }),
        
        addWorkItem: (item) => set((state) => {
          const newItems = [...state.workItems, item];
          return {
            workItems: newItems,
            workItemsTree: buildWorkItemsTree(newItems),
          };
        }),
        
        updateWorkItem: (id, updates) => set((state) => {
          const newItems = state.workItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          );
          return {
            workItems: newItems,
            workItemsTree: buildWorkItemsTree(newItems),
          };
        }),
        
        removeWorkItem: (id) => set((state) => {
          const newItems = state.workItems.filter((item) => item.id !== id);
          return {
            workItems: newItems,
            workItemsTree: buildWorkItemsTree(newItems),
            selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
            isDetailOpen: state.selectedItemId === id ? false : state.isDetailOpen,
          };
        }),
        
        toggleItemSelection: (id) => set((state) => {
          const newItems = state.workItems.map((item) =>
            item.id === id ? { ...item, isSelected: !item.isSelected } : item
          );
          return {
            workItems: newItems,
            workItemsTree: buildWorkItemsTree(newItems),
          };
        }),
        
        selectAllItems: () => set((state) => {
          const newItems = state.workItems.map((item) => ({ ...item, isSelected: true }));
          return {
            workItems: newItems,
            workItemsTree: buildWorkItemsTree(newItems),
          };
        }),
        
        deselectAllItems: () => set((state) => {
          const newItems = state.workItems.map((item) => ({ ...item, isSelected: false }));
          return {
            workItems: newItems,
            workItemsTree: buildWorkItemsTree(newItems),
          };
        }),

        // ==================
        // UI ACTIONS
        // ==================
        selectItem: (id) => set({ 
          selectedItemId: id, 
          isDetailOpen: id !== null 
        }),
        
        openDetail: () => set({ isDetailOpen: true }),
        
        closeDetail: () => set({ isDetailOpen: false }),
        
        toggleExpanded: (id) => set((state) => {
          const newExpanded = new Set(state.expandedIds);
          if (newExpanded.has(id)) {
            newExpanded.delete(id);
          } else {
            newExpanded.add(id);
          }
          return { expandedIds: newExpanded };
        }),
        
        expandAll: () => set((state) => {
          const allIds = state.workItems
            .filter((item) => item.itemType === 'epic' || item.itemType === 'feature')
            .map((item) => item.id);
          return { expandedIds: new Set(allIds) };
        }),
        
        collapseAll: () => set({ expandedIds: new Set() }),
        
        setFilterType: (type) => set({ filterType: type }),
        
        setSearchQuery: (query) => set({ searchQuery: query }),

        // ==================
        // CONFIGURATION ACTIONS
        // ==================
        setProgramId: (id) => set({ programId: id, projectId: null }),
        
        setProjectId: (id) => set({ projectId: id }),
        
        setPrograms: (programs) => set({ programs }),
        
        setProjects: (projects) => set({ projects }),
        
        setOutputConfig: (config) => set((state) => ({
          outputConfig: { ...state.outputConfig, ...config },
        })),

        // ==================
        // ANALYSIS ACTIONS
        // ==================
        setAnalysis: (analysis) => set({ analysis }),
        
        updateAnalysis: (updates) => set((state) => ({
          analysis: { ...state.analysis, ...updates },
        })),
        
        setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

        // ==================
        // RESET ACTIONS
        // ==================
        reset: () => set({
          inputText: '',
          inputSource: 'manual',
          generation: null,
          isGenerating: false,
          generationError: null,
          workItems: [],
          workItemsTree: [],
          selectedItemId: null,
          isDetailOpen: false,
          expandedIds: new Set(),
          filterType: 'all',
          searchQuery: '',
          analysis: initialAnalysis,
          isAnalyzing: false,
        }),
        
        resetGeneration: () => set({
          generation: null,
          isGenerating: false,
          generationError: null,
          workItems: [],
          workItemsTree: [],
          selectedItemId: null,
          isDetailOpen: false,
          expandedIds: new Set(),
        }),
      }),
      {
        name: 'requirement-assist-storage',
        partialize: (state) => ({
          // Only persist configuration, not transient state
          programId: state.programId,
          projectId: state.projectId,
          outputConfig: state.outputConfig,
        }),
        // Handle Set serialization properly
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str);
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    ),
    { name: 'RequirementAssistStore' }
  )
);

// ============================================================
// SELECTORS (for optimized re-renders)
// ============================================================

export const selectInputText = (state: RequirementAssistState) => state.inputText;
export const selectGeneration = (state: RequirementAssistState) => state.generation;
export const selectIsGenerating = (state: RequirementAssistState) => state.isGenerating;
export const selectWorkItems = (state: RequirementAssistState) => state.workItems;
export const selectWorkItemsTree = (state: RequirementAssistState) => state.workItemsTree;
export const selectSelectedItemId = (state: RequirementAssistState) => state.selectedItemId;
export const selectIsDetailOpen = (state: RequirementAssistState) => state.isDetailOpen;
export const selectAnalysis = (state: RequirementAssistState) => state.analysis;

export const selectSelectedItem = (state: RequirementAssistState): WorkItem | null => {
  if (!state.selectedItemId) return null;
  return state.workItems.find((item) => item.id === state.selectedItemId) || null;
};

export const selectFilteredWorkItems = (state: RequirementAssistState): WorkItem[] => {
  let items = state.workItems;

  // Apply type filter
  if (state.filterType !== 'all') {
    items = items.filter((item) => item.itemType === state.filterType);
  }

  // Apply search filter
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.displayId.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }

  return items;
};

export const selectItemCounts = (state: RequirementAssistState) => {
  // FIX #3: Exclude PRDs from counts
  const publishableItems = state.workItems.filter(i => i.itemType !== 'prd');
  return {
    total: publishableItems.length,
    epics: publishableItems.filter((i) => i.itemType === 'epic').length,
    features: publishableItems.filter((i) => i.itemType === 'feature').length,
    stories: publishableItems.filter((i) => i.itemType === 'story').length,
    selected: publishableItems.filter((i) => i.isSelected && !i.isPublished).length,
  };
};

export const selectWordCount = (state: RequirementAssistState): number => {
  const text = state.inputText.trim();
  return text ? text.split(/\s+/).length : 0;
};

export const selectCanGenerate = (state: RequirementAssistState): boolean => {
  const wordCount = selectWordCount(state);
  return wordCount >= 10 && !state.isGenerating;
};

// ============================================================
// EXPORT SHORTHAND
// ============================================================

// Shorthand for component usage
export const useStore = useRequirementAssistStore;
