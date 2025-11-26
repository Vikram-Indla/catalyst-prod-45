// backlog.types.ts
// Type definitions for Backlog Module

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type BacklogType = 'theme' | 'epic' | 'capability' | 'feature' | 'story' | 'defect';

export type EpicStatus = 'not_started' | 'in_progress' | 'accepted' | 'done' | 'blocked';

export type ProcessStep = 
  | 'Funnel'
  | 'Reviewing'
  | 'Analyzing'
  | 'Portfolio Backlog'
  | 'Implementing'
  | 'Persevering'
  | 'Done';

export type LabelColor = 
  | 'orange' 
  | 'teal' 
  | 'purple' 
  | 'blue' 
  | 'red' 
  | 'gray' 
  | 'green' 
  | 'pink';

export type EpicType = 'Business' | 'Enabler' | 'Compliance';

export type ViewMode = 'list' | 'kanban' | 'unassigned';

export type LabelDisplayMode = 'full' | 'abbreviated' | 'hidden';

// ============================================
// STATUS COLORS
// ============================================

export const STATUS_COLORS: Record<EpicStatus, string> = {
  not_started: '#C1C7D0',  // Gray
  in_progress: '#FF8B00',  // Orange
  accepted: '#0052CC',     // Blue
  done: '#0052CC',         // Blue
  blocked: '#DE350B',      // Red
};

export const LABEL_COLORS: Record<LabelColor, { bg: string; text: string }> = {
  orange: { bg: '#FF8B00', text: '#FFFFFF' },
  teal: { bg: '#00B8D9', text: '#FFFFFF' },
  purple: { bg: '#6554C0', text: '#FFFFFF' },
  blue: { bg: '#0052CC', text: '#FFFFFF' },
  red: { bg: '#DE350B', text: '#FFFFFF' },
  gray: { bg: '#6B778C', text: '#FFFFFF' },
  green: { bg: '#36B37E', text: '#FFFFFF' },
  pink: { bg: '#E774BB', text: '#FFFFFF' },
};

// ============================================
// CORE ENTITIES
// ============================================

export interface Label {
  id: string;
  text: string;
  color: LabelColor;
}

export interface Program {
  id: string;
  name: string;
}

export interface ProgramIncrement {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface Theme {
  id: string;
  name: string;
}

// ============================================
// EPIC
// ============================================

export interface Epic {
  id: string;
  numericId: number;
  title: string;
  status: EpicStatus;
  processStep: ProcessStep;
  points: number;
  mvp: boolean;
  labels: Label[];
  programId?: string;
  programIncrementId?: string;
  hasChildren: boolean;
  rank: number;
}

export interface EpicState {
  id: number;
  name: string;
  color: string;
}

export interface EpicDetail extends Epic {
  description: string;
  type: EpicType;
  
  // Relationships
  containedIn?: {
    id: string;
    name: string;
    type: string;
  };
  primaryProgram?: Program;
  additionalPrograms: Program[];
  owner?: User;
  state: EpicState;
  
  // Progress
  storyPointsTotal: number;
  storyPointsAccepted: number;
  featuresTotal: number;
  featuresAccepted: number;
  featuresInDelivery: number;
  featuresDelivered: number;
  
  // Metadata
  discussionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// BACKLOG SECTION
// ============================================

export interface BacklogSection {
  id: string;
  title: string;
  type: 'assigned' | 'unassigned';
  programIncrementId?: string;
  itemCount: number;
  progress?: number;  // 0-100 for PI progress bar
  isExpanded: boolean;
  items: Epic[];
}

// ============================================
// UI STATE
// ============================================

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetItem: Epic | null;
}

export interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  draggedFromSection: string | null;
  targetSection: string | null;
  targetIndex: number | null;
}

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  default: boolean;
  width?: number;
}

export interface LabelConfig {
  displayMode: LabelDisplayMode;
  showPITags: boolean;
  showCustomLabels: boolean;
  showThemeLabels: boolean;
}

export interface DetailPanelState {
  isOpen: boolean;
  epicId: string | null;
  activeTab: string;
  hasUnsavedChanges: boolean;
}

// ============================================
// BACKLOG STATE
// ============================================

export interface BacklogState {
  // Data
  portfolioName: string;
  sections: BacklogSection[];
  programs: Program[];
  programIncrements: ProgramIncrement[];
  users: User[];
  themes: Theme[];
  
  // View State
  currentView: ViewMode;
  backlogType: BacklogType;
  searchQuery: string;
  
  // Selection
  selectedEpicId: string | null;
  
  // UI State
  contextMenu: ContextMenuState;
  dragState: DragState;
  columnConfig: ColumnConfig[];
  labelConfig: LabelConfig;
  
  // Modals
  isPrioritizeModalOpen: boolean;
  prioritizeSectionId: string | null;
  isMovePositionModalOpen: boolean;
  movePositionTargetId: string | null;
  
  // Detail Panel
  detailPanel: DetailPanelState;
}

// ============================================
// CONTEXT MENU
// ============================================

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  dividerAfter?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface BacklogPageProps {
  portfolioName: string;
  sections: BacklogSection[];
  programs: Program[];
  programIncrements: ProgramIncrement[];
  onAddEpic: (title: string, programId: string, sectionId: string) => void;
  onEpicClick: (epicId: string) => void;
  onEpicReorder: (epicId: string, fromSection: string, toSection: string, newIndex: number) => void;
}

export interface BacklogSectionProps {
  section: BacklogSection;
  programs: Program[];
  columnConfig: ColumnConfig[];
  labelConfig: LabelConfig;
  selectedEpicId: string | null;
  onToggleExpand: () => void;
  onAddEpic: (title: string, programId: string) => void;
  onEpicClick: (epicId: string) => void;
  onEpicContextMenu: (e: React.MouseEvent, epic: Epic) => void;
  onDragStart: (e: React.DragEvent, epic: Epic) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
}

export interface EpicRowProps {
  epic: Epic;
  rank: number;
  columnConfig: ColumnConfig[];
  labelConfig: LabelConfig;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}

export interface DetailPanelProps {
  epic: EpicDetail;
  isOpen: boolean;
  activeTab: string;
  programs: Program[];
  users: User[];
  themes: Theme[];
  onClose: () => void;
  onTabChange: (tabId: string) => void;
  onSave: (updates: Partial<EpicDetail>) => void;
}

export interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export interface ColumnsDropdownProps {
  columns: ColumnConfig[];
  onChange: (columnId: string, visible: boolean) => void;
  onReset: () => void;
}

export interface LabelsDropdownProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
}

export interface PrioritizeModalProps {
  isOpen: boolean;
  sectionTitle: string;
  items: Epic[];
  onClose: () => void;
  onSave: (orderedIds: string[]) => void;
}

export interface MovePositionModalProps {
  isOpen: boolean;
  epic: Epic;
  totalItems: number;
  onClose: () => void;
  onMove: (newPosition: number) => void;
}

// ============================================
// VIEWING OPTIONS
// ============================================

export interface ViewingOption {
  id: BacklogType;
  label: string;
  enabled: boolean;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'epic', label: 'Epic', visible: true, default: true },
  { id: 'points', label: 'Points', visible: true, default: true, width: 70 },
  { id: 'mvp', label: 'MVP', visible: true, default: true, width: 50 },
  { id: 'processStep', label: 'Process Step', visible: true, default: true, width: 100 },
  { id: 'program', label: 'Program', visible: false, default: false, width: 120 },
  { id: 'schedule', label: 'Schedule', visible: false, default: false, width: 100 },
  { id: 'parent', label: 'Parent', visible: false, default: false, width: 150 },
  { id: 'tags', label: 'Tags', visible: false, default: false, width: 100 },
];

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  displayMode: 'abbreviated',
  showPITags: true,
  showCustomLabels: true,
  showThemeLabels: false,
};

export const EPIC_STATES: EpicState[] = [
  { id: 1, name: 'Funnel', color: '#6B778C' },
  { id: 2, name: 'In Progress', color: '#FF8B00' },
  { id: 3, name: 'Done', color: '#36B37E' },
];

export const VIEWING_OPTIONS: ViewingOption[] = [
  { id: 'theme', label: 'Theme Backlog', enabled: true },
  { id: 'epic', label: 'Epic Backlog', enabled: true },
  { id: 'capability', label: 'Capability Backlog', enabled: true },
  { id: 'feature', label: 'Feature Backlog', enabled: true },
  { id: 'story', label: 'Story Backlog', enabled: false },
  { id: 'defect', label: 'Defect Backlog', enabled: false },
];

export const PANEL_TABS: { id: string; label: string; icon: string }[] = [
  { id: 'details', label: 'Details', icon: '📄' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'intake', label: 'Intake', icon: '📥' },
  { id: 'benefits', label: 'Benefits', icon: '📈' },
  { id: 'value', label: 'Value', icon: '💎' },
  { id: 'milestones', label: 'Milestones', icon: '🎯' },
  { id: 'spend', label: 'Spend', icon: '💰' },
  { id: 'forecast', label: 'Forecast', icon: '📊' },
  { id: 'links', label: 'Links', icon: '🔗' },
];

export const CONTEXT_MENU_ITEMS: ContextMenuItem[] = [
  { id: 'open-tab', label: 'Open in new tab' },
  { id: 'duplicate', label: 'Duplicate', dividerAfter: true },
  { id: 'move-top', label: 'Move To Top' },
  { id: 'move-bottom', label: 'Move To Bottom' },
  { id: 'move-position', label: 'Move To Position', dividerAfter: true },
  { 
    id: 'move-pi', 
    label: 'Move Program Increment',
    submenu: [],  // Populated dynamically
    dividerAfter: true,
  },
  { id: 'recycle-bin', label: 'Move to Recycle Bin', destructive: true },
  { id: 'parking-lot', label: 'Move to Parking Lot' },
];
