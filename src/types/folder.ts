/**
 * Folder Management Types for Catalyst Tests
 * Defines interfaces for hierarchical folder organization
 */

export type EntityType = 'test_cases' | 'test_sets' | 'test_cycles';

export interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  program_id: string;
  entity_type: EntityType;
  sort_order: number;
  is_system: boolean;
  count: number; // includes sub-folder counts
  children: FolderNode[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderPanelState {
  test_cases_collapsed: boolean;
  test_sets_collapsed: boolean;
  test_cycles_collapsed: boolean;
  expanded_folders: string[]; // folder IDs that are expanded
}

export interface CreateFolderRequest {
  name: string;
  parent_id: string | null;
  entity_type: EntityType;
  program_id: string;
}

export interface UpdateFolderRequest {
  name?: string;
  parent_id?: string | null;
}

export interface MoveFolderRequest {
  folder_id: string;
  new_parent_id: string | null;
}

export interface ReorderFoldersRequest {
  folder_orders: { id: string; sort_order: number }[];
}

export interface FolderCountResponse {
  count: number;
  children_count: number;
}

export interface FolderTreeProps {
  folders: FolderNode[];
  entityType: EntityType;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderCreate: (parentId: string | null) => void;
  onFolderRename: (folder: FolderNode) => void;
  onFolderMove: (folder: FolderNode) => void;
  onFolderDelete: (folder: FolderNode) => void;
  expandedFolders: string[];
  onToggleFolder: (folderId: string) => void;
}

export interface FolderNodeProps {
  folder: FolderNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (folderId: string | null) => void;
  onToggle: (folderId: string) => void;
  onContextMenu: (e: React.MouseEvent, folder: FolderNode) => void;
  onDragStart: (e: React.DragEvent, folder: FolderNode) => void;
  onDragOver: (e: React.DragEvent, folder: FolderNode) => void;
  onDrop: (e: React.DragEvent, folder: FolderNode) => void;
}

export interface FolderContextMenuProps {
  folder: FolderNode;
  position: { x: number; y: number };
  onClose: () => void;
  onCreateSubfolder: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCreateSetFromFolder: () => void;
  onCreateCycleFromFolder: () => void;
  onAddToSet: () => void;
  onAddToCycle: () => void;
}
