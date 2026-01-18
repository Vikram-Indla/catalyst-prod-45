/**
 * Utility functions for Add Test Cases to Cycle Dialog
 */

import { TMTestCase, TMFolder } from '@/types/test-management';
import type { FolderNode } from './types';

/**
 * Build a hierarchical folder tree with test cases
 */
export function buildFolderTree(
  folders: TMFolder[],
  testCases: TMTestCase[],
  existingIds: Set<string>
): { tree: FolderNode[]; unfiledCases: TMTestCase[] } {
  // Group test cases by folder
  const casesByFolder = new Map<string | null, TMTestCase[]>();
  testCases.forEach(tc => {
    const folderId = tc.folder_id || null;
    if (!casesByFolder.has(folderId)) {
      casesByFolder.set(folderId, []);
    }
    casesByFolder.get(folderId)!.push(tc);
  });

  // Create folder nodes
  const folderMap = new Map<string, FolderNode>();
  folders.forEach(folder => {
    const folderCases = casesByFolder.get(folder.id) || [];
    const selectableCount = folderCases.filter(tc => !existingIds.has(tc.id)).length;
    
    folderMap.set(folder.id, {
      folder,
      testCases: folderCases,
      children: [],
      totalCount: folderCases.length,
      selectableCount,
    });
  });

  // Build tree structure
  const roots: FolderNode[] = [];
  folders.forEach(folder => {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Calculate total counts including children
  function calculateTotalCount(node: FolderNode): number {
    let total = node.testCases.length;
    let selectable = node.testCases.filter(tc => !existingIds.has(tc.id)).length;
    
    node.children.forEach(child => {
      const childTotal = calculateTotalCount(child);
      total += childTotal;
      selectable += child.selectableCount;
    });
    
    node.totalCount = total;
    node.selectableCount = selectable;
    return total;
  }

  roots.forEach(calculateTotalCount);

  // Get unfiled cases
  const unfiledCases = casesByFolder.get(null) || [];

  return { tree: roots, unfiledCases };
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get priority color class
 */
export function getPriorityColor(priorityName: string | undefined): string {
  const name = priorityName?.toLowerCase() || 'medium';
  if (name.includes('critical')) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  if (name.includes('high')) {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (name.includes('low')) {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

/**
 * Get priority badge variant
 */
export function getPriorityBadgeClass(priorityName: string | undefined): string {
  const name = priorityName?.toLowerCase() || 'medium';
  if (name.includes('critical')) {
    return 'bg-red-100 text-red-700';
  }
  if (name.includes('high')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (name.includes('low')) {
    return 'bg-slate-100 text-slate-600';
  }
  return 'bg-blue-100 text-blue-700';
}

/**
 * Group test cases by folder for display
 */
export function groupByFolder(
  testCases: TMTestCase[]
): Record<string, TMTestCase[]> {
  const grouped: Record<string, TMTestCase[]> = {};
  
  testCases.forEach(tc => {
    const folderName = tc.folder?.name || 'Unfiled';
    if (!grouped[folderName]) {
      grouped[folderName] = [];
    }
    grouped[folderName].push(tc);
  });

  return grouped;
}

/**
 * Group test cases by priority for display
 */
export function groupByPriority(
  testCases: TMTestCase[]
): Record<string, TMTestCase[]> {
  const grouped: Record<string, TMTestCase[]> = {
    'Critical': [],
    'High': [],
    'Medium': [],
    'Low': [],
  };
  
  testCases.forEach(tc => {
    const priorityName = tc.priority?.name || 'Medium';
    const normalizedName = priorityName.charAt(0).toUpperCase() + priorityName.slice(1).toLowerCase();
    
    if (normalizedName.includes('Critical')) {
      grouped['Critical'].push(tc);
    } else if (normalizedName.includes('High')) {
      grouped['High'].push(tc);
    } else if (normalizedName.includes('Low')) {
      grouped['Low'].push(tc);
    } else {
      grouped['Medium'].push(tc);
    }
  });

  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) {
      delete grouped[key];
    }
  });

  return grouped;
}
