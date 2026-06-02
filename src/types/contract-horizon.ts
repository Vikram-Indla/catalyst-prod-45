/**
 * Contract Horizon Types
 * Type definitions for the contract timeline visualization
 */

export type ContractStatus = 'critical' | 'warning' | 'safe';

export type DepartmentType = 'Delivery' | 'Product' | 'Operations' | 'Technical Support' | 'Support';

export interface ContractResource {
  id: string;
  name: string;
  role: string;
  department: DepartmentType | string;
  vendor: string;
  country?: string;
  location?: 'On-site' | 'Off-shore' | string;
  contractStart: string; // ISO date
  contractEnd: string;   // ISO date
  assignments?: string[];
  profileId?: string;
}

export interface ContractResourceWithStatus extends ContractResource {
  daysRemaining: number;
  status: ContractStatus;
  progress: number;
  endMonth: number; // 0-11
}

export interface DepartmentStats {
  department: DepartmentType | string;
  total: number;
  critical: number;
  warning: number;
  safe: number;
  byMonth: Record<number, ContractResourceWithStatus[]>;
}

export type ContractFilter = 'all' | 'delivery' | 'product' | 'operations' | 'technical_support' | 'governance';

export const DEPARTMENT_COLORS: Record<string, { gradient: string; shadow: string; text: string }> = {
  Delivery: {
    gradient: 'linear-gradient(145deg, #3b82f6 0%, var(--cp-workstream-catalyst-primary, #2563eb) 100%)',
    shadow: 'rgba(37, 99, 235, 0.3)',
    text: 'var(--cp-workstream-catalyst-primary, #2563eb)'
  },
  Product: {
    gradient: 'linear-gradient(145deg, var(--ds-text-discovery, #8b5cf6) 0%, var(--ds-text-discovery, #7c3aed) 100%)',
    shadow: 'rgba(124, 58, 237, 0.3)',
    text: 'var(--ds-text-discovery, #7c3aed)'
  },
  Operations: {
    gradient: 'linear-gradient(145deg, var(--ds-text-warning, #f97316) 0%, var(--ds-text-warning, #ea580c) 100%)',
    shadow: 'rgba(234, 88, 12, 0.3)',
    text: 'var(--ds-text-warning, #ea580c)'
  },
  'Technical Support': {
    gradient: 'linear-gradient(145deg, var(--ds-text-success, #14b8a6) 0%, var(--ds-text-success, #0d9488) 100%)',
    shadow: 'rgba(13, 148, 136, 0.3)',
    text: 'var(--ds-text-success, #0d9488)'
  },
  Support: {
    gradient: 'linear-gradient(145deg, var(--ds-text-success, #14b8a6) 0%, var(--ds-text-success, #0d9488) 100%)',
    shadow: 'rgba(13, 148, 136, 0.3)',
    text: 'var(--ds-text-success, #0d9488)'
  }
};

export const STATUS_COLORS = {
  critical: {
    bg: 'var(--ds-surface, #fef2f2)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    border: 'var(--ds-border, #fecaca)',
    borderDark: 'rgba(239, 68, 68, 0.3)',
    text: 'var(--ds-text-danger, #dc2626)',
    textDark: 'var(--ds-text-danger, #fca5a5)',
    gradient: 'linear-gradient(90deg, var(--ds-text-danger, #f87171), var(--ds-text-danger, #dc2626))'
  },
  warning: {
    bg: 'var(--ds-surface, #fffbeb)',
    bgDark: 'rgba(217, 119, 6, 0.15)',
    border: 'var(--ds-border, #fde68a)',
    borderDark: 'rgba(217, 119, 6, 0.3)',
    text: 'var(--ds-text-warning, #d97706)',
    textDark: 'var(--ds-text-warning, #fcd34d)',
    gradient: 'linear-gradient(90deg, var(--ds-text-warning, #fbbf24), var(--ds-text-warning, #d97706))'
  },
  safe: {
    bg: 'var(--ds-surface, #f0fdfa)',
    bgDark: 'rgba(13, 148, 136, 0.15)',
    border: 'var(--ds-border, #99f6e4)',
    borderDark: 'rgba(13, 148, 136, 0.3)',
    text: 'var(--ds-text-success, #0d9488)',
    textDark: 'var(--ds-text-success, #5eead4)',
    gradient: 'linear-gradient(90deg, var(--ds-text-success, #2dd4bf), var(--ds-text-success, #0d9488))'
  }
};
