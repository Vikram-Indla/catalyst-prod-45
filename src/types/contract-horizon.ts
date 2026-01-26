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
    gradient: 'linear-gradient(145deg, #3b82f6 0%, #2563eb 100%)',
    shadow: 'rgba(37, 99, 235, 0.3)',
    text: '#2563eb'
  },
  Product: {
    gradient: 'linear-gradient(145deg, #8b5cf6 0%, #7c3aed 100%)',
    shadow: 'rgba(124, 58, 237, 0.3)',
    text: '#7c3aed'
  },
  Operations: {
    gradient: 'linear-gradient(145deg, #f97316 0%, #ea580c 100%)',
    shadow: 'rgba(234, 88, 12, 0.3)',
    text: '#ea580c'
  },
  'Technical Support': {
    gradient: 'linear-gradient(145deg, #14b8a6 0%, #0d9488 100%)',
    shadow: 'rgba(13, 148, 136, 0.3)',
    text: '#0d9488'
  },
  Support: {
    gradient: 'linear-gradient(145deg, #14b8a6 0%, #0d9488 100%)',
    shadow: 'rgba(13, 148, 136, 0.3)',
    text: '#0d9488'
  }
};

export const STATUS_COLORS = {
  critical: {
    bg: '#fef2f2',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    border: '#fecaca',
    borderDark: 'rgba(239, 68, 68, 0.3)',
    text: '#dc2626',
    textDark: '#fca5a5',
    gradient: 'linear-gradient(90deg, #f87171, #dc2626)'
  },
  warning: {
    bg: '#fffbeb',
    bgDark: 'rgba(217, 119, 6, 0.15)',
    border: '#fde68a',
    borderDark: 'rgba(217, 119, 6, 0.3)',
    text: '#d97706',
    textDark: '#fcd34d',
    gradient: 'linear-gradient(90deg, #fbbf24, #d97706)'
  },
  safe: {
    bg: '#f0fdfa',
    bgDark: 'rgba(13, 148, 136, 0.15)',
    border: '#99f6e4',
    borderDark: 'rgba(13, 148, 136, 0.3)',
    text: '#0d9488',
    textDark: '#5eead4',
    gradient: 'linear-gradient(90deg, #2dd4bf, #0d9488)'
  }
};
