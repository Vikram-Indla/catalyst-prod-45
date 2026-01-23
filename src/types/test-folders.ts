// ============================================================
// TEST FOLDERS TYPES
// ============================================================

/**
 * Folder with count from get_folder_tree database function
 */
export interface TestFolderWithCount {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  depth: number;
  count: number;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Tree node for UI rendering (with children and expansion state)
 */
export interface FolderTreeNode extends TestFolderWithCount {
  children: FolderTreeNode[];
  isExpanded: boolean;
}

/**
 * Input for creating a new folder
 */
export interface CreateFolderInput {
  name: string;
  description?: string;
  parentId?: string | null;
  projectId: string;
}

/**
 * Input for updating a folder
 */
export interface UpdateFolderInput {
  name?: string;
  description?: string;
}

/**
 * Build hierarchical tree from flat folder list
 * @param folders - Flat list of folders from get_folder_tree
 * @param expandedIds - Set of folder IDs that should be expanded
 * @returns Array of root-level tree nodes with nested children
 */
export function buildFolderTree(
  folders: TestFolderWithCount[],
  expandedIds: Set<string>
): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  // First pass: create all nodes
  folders.forEach(folder => {
    map.set(folder.id, {
      ...folder,
      children: [],
      isExpanded: expandedIds.has(folder.id),
    });
  });

  // Second pass: build parent-child relationships
  folders.forEach(folder => {
    const node = map.get(folder.id)!;
    if (folder.parentId && map.has(folder.parentId)) {
      map.get(folder.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sortOrder at each level
  const sortChildren = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * Get all descendant folder IDs (for filtering test cases)
 * @param folderId - Parent folder ID
 * @param folders - Flat list of all folders
 * @returns Array of descendant folder IDs (not including the parent)
 */
export function getDescendantFolderIds(
  folderId: string,
  folders: TestFolderWithCount[]
): string[] {
  const children = folders.filter(f => f.parentId === folderId);
  let ids = children.map(c => c.id);
  children.forEach(child => {
    ids = ids.concat(getDescendantFolderIds(child.id, folders));
  });
  return ids;
}

/**
 * Get folder path string for display (e.g., "Authentication / Login")
 * @param folderId - Folder ID to get path for
 * @param folders - Flat list of all folders
 * @returns Path string or "Unassigned" if no folder
 */
export function getFolderPath(
  folderId: string | null,
  folders: TestFolderWithCount[]
): string {
  if (!folderId) return 'Unassigned';
  
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return 'Unknown';
  
  let path = folder.name;
  let current = folder;
  
  while (current.parentId) {
    const parent = folders.find(f => f.id === current.parentId);
    if (parent) {
      path = parent.name + ' / ' + path;
      current = parent;
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * Calculate total count including all descendants
 */
export function getTotalFolderCount(
  folderId: string,
  folders: TestFolderWithCount[]
): number {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return 0;
  
  let total = folder.count;
  const descendants = getDescendantFolderIds(folderId, folders);
  descendants.forEach(descId => {
    const descFolder = folders.find(f => f.id === descId);
    if (descFolder) {
      total += descFolder.count;
    }
  });
  
  return total;
}
