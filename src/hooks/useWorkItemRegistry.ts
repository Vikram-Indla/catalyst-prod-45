/**
 * WORK ITEM ICON REGISTRY — SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This hook provides the ONLY sanctioned way to get work item icons and colors
 * across the entire Catalyst application.
 * 
 * USAGE:
 * - Import { useWorkItemRegistry } or { getWorkItemVisual } 
 * - Use getWorkItemVisual(type) to get { Icon, color, bgColor, label }
 * - All components MUST use this registry - no hardcoded Lucide icons!
 * 
 * The registry syncs with:
 * 1. workItemConfig.ts - static definitions
 * 2. WorkItemIcon component - SVG icon rendering
 * 3. Admin settings - for icon style preferences
 * 
 * SAFEGUARD: Any new work item type MUST be added to workItemConfig.ts first.
 * The Create button dropdown derives its icons from the same source.
 */

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import { workItemConfig, WorkItemType, getWorkItemIcon, getWorkItemColor, getWorkItemBgColor } from '@/config/workItemConfig';
import type { LucideIcon } from 'lucide-react';

// Icon colors for work items (matching WorkItemIcon.tsx)
const ICON_COLORS: Record<string, string> = {
  // Enterprise
  theme: '#0d9488',      // Teal
  objective: '#2563eb',  // Blue
  
  // Product
  'business-request': '#2563eb', // Blue
  
  // Program
  epic: '#904EE2',       // Purple
  
  // Project
  feature: '#F59E0B',    // Amber
  story: '#36B37E',      // Green
  task: '#0065FF',       // Blue
  defect: '#FF5630',     // Red
  incident: '#EF4444',   // Red-500
  
  // Other
  dependency: '#3B82F6', // Blue
  risk: '#F97316',       // Orange
  
  // Key Results (for OKR tree)
  key_result: '#2563eb', // Blue (same as objective)
};

// Background colors for icon containers
const ICON_BG_COLORS: Record<string, string> = {
  theme: 'rgba(13, 148, 136, 0.15)',
  objective: 'rgba(37, 99, 235, 0.15)',
  'business-request': 'rgba(37, 99, 235, 0.15)',
  epic: 'rgba(144, 78, 226, 0.15)',
  feature: 'rgba(245, 158, 11, 0.15)',
  story: 'rgba(54, 179, 126, 0.15)',
  task: 'rgba(0, 101, 255, 0.15)',
  defect: 'rgba(255, 86, 48, 0.15)',
  incident: 'rgba(239, 68, 68, 0.15)',
  dependency: 'rgba(59, 130, 246, 0.15)',
  risk: 'rgba(249, 115, 22, 0.15)',
  key_result: 'rgba(37, 99, 235, 0.15)',
};

export interface WorkItemVisual {
  /** The type key */
  type: string;
  /** Display label */
  label: string;
  /** Icon color (hex) */
  color: string;
  /** Background color (rgba) */
  bgColor: string;
  /** Lucide icon component (for fallback/legacy) */
  LucideIcon: LucideIcon;
  /** Tailwind color class */
  colorClass: string;
  /** Tailwind bg class */
  bgClass: string;
  /** Category for grouping */
  category: 'enterprise' | 'product' | 'program' | 'project' | 'other';
}

/**
 * Get visual configuration for a work item type.
 * This is the SINGLE SOURCE OF TRUTH for work item icons.
 * 
 * @param type - Work item type key
 * @returns Visual configuration object
 */
export function getWorkItemVisual(type: string): WorkItemVisual {
  const config = workItemConfig[type as WorkItemType];
  
  if (!config) {
    // Fallback for unknown types (like key_result)
    return {
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-|_/g, ' '),
      color: ICON_COLORS[type] || '#6b7280',
      bgColor: ICON_BG_COLORS[type] || 'rgba(107, 114, 128, 0.15)',
      LucideIcon: getWorkItemIcon(type as WorkItemType),
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted',
      category: 'other',
    };
  }
  
  return {
    type,
    label: config.label,
    color: ICON_COLORS[type] || '#6b7280',
    bgColor: ICON_BG_COLORS[type] || 'rgba(107, 114, 128, 0.15)',
    LucideIcon: config.icon,
    colorClass: config.color,
    bgClass: config.bgColor,
    category: config.category,
  };
}

/**
 * Get all work item visuals organized by category.
 */
export function getAllWorkItemVisuals(): Record<string, WorkItemVisual[]> {
  const categories: Record<string, WorkItemVisual[]> = {
    enterprise: [],
    product: [],
    program: [],
    project: [],
    other: [],
  };
  
  Object.keys(workItemConfig).forEach((type) => {
    const visual = getWorkItemVisual(type);
    categories[visual.category].push(visual);
  });
  
  return categories;
}

/**
 * Hook for accessing work item registry with real-time updates.
 * Invalidates when admin settings change.
 */
export function useWorkItemRegistry() {
  const queryClient = useQueryClient();
  
  const visuals = useMemo(() => {
    const result: Record<string, WorkItemVisual> = {};
    Object.keys(workItemConfig).forEach((type) => {
      result[type] = getWorkItemVisual(type);
    });
    // Add key_result for OKR tree
    result['key_result'] = getWorkItemVisual('key_result');
    return result;
  }, []);
  
  const getVisual = (type: string): WorkItemVisual => {
    return visuals[type] || getWorkItemVisual(type);
  };
  
  const invalidateRegistry = () => {
    queryClient.invalidateQueries({ queryKey: ['work-item-icon-preferences'] });
  };
  
  return {
    visuals,
    getVisual,
    invalidateRegistry,
    WorkItemIcon, // Re-export for convenience
  };
}

/**
 * Type guard to check if a type is a valid work item type.
 */
export function isValidWorkItemType(type: string): type is WorkItemType {
  return type in workItemConfig || type === 'key_result';
}

export type { WorkItemType };
