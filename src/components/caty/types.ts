/**
 * Caty V4 — Type Definitions
 * All types for the Capacity AI Assistant
 */

export interface DepartmentStats {
  id: string;
  name: string;
  shortName: string;
  count: number;
  critical: number;
  warning: number;
  color: string;
  utilization: number;
  trend?: 'up' | 'down' | 'stable';
  warningBreakdown?: { type: string; count: number }[];
  resources?: ResourceInfo[];
}

export interface ResourceInfo {
  id: string;
  name: string;
  initials: string;
  role?: string;
  warningType?: 'contract' | 'utilization';
  contractEnd?: string;
  utilization?: number;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'positive' | 'negative' | null;
}

export interface CapacityStats {
  total: number;
  critical: number;
  warning: number;
  criticalTrend: number;
  warningTrend: number;
  departments: DepartmentStats[];
  lastUpdated: Date;
}

export type CapacityClass = 'safe' | 'warning' | 'danger';
export type WarningBadgeClass = 'safe' | 'warning-light' | 'warning-medium' | 'warning-critical';

// Helper functions for capacity calculations
export function getCapacityClass(percent: number): CapacityClass {
  if (percent >= 86) return 'danger';
  if (percent >= 71) return 'warning';
  return 'safe';
}

export function getWarningBadgeClass(count: number): WarningBadgeClass {
  if (count >= 4) return 'warning-critical';
  if (count >= 3) return 'warning-medium';
  if (count >= 1) return 'warning-light';
  return 'safe';
}

export function getDeptClass(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('product')) return 'product';
  if (lower.includes('delivery')) return 'delivery';
  if (lower.includes('operations')) return 'operations';
  if (lower.includes('support')) return 'support';
  return 'governance';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatContractDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
