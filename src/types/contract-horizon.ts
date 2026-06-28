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
    gradient: 'linear-gradient(145deg, var(--ds-background-information-bold) 0%, var(--cp-workstream-catalyst-primary) 100%)',
    shadow: 'var(--ds-background-information, rgba(37, 99, 235, 0.3))',
    text: 'var(--cp-workstream-catalyst-primary)'
  },
  Product: {
    gradient: 'linear-gradient(145deg, var(--ds-text-discovery) 0%, var(--ds-text-discovery) 100%)',
    shadow: 'var(--ds-background-discovery-bold, rgba(124, 58, 237, 0.3))',
    text: 'var(--ds-text-discovery)'
  },
  Operations: {
    gradient: 'linear-gradient(145deg, var(--ds-text-warning) 0%, var(--ds-text-warning) 100%)',
    shadow: 'var(--ds-background-warning-bold, rgba(234, 88, 12, 0.3))',
    text: 'var(--ds-text-warning)'
  },
  'Technical Support': {
    gradient: 'linear-gradient(145deg, var(--ds-text-success) 0%, var(--ds-text-success) 100%)',
    shadow: 'var(--ds-background-success, rgba(13, 148, 136, 0.3))',
    text: 'var(--ds-text-success)'
  },
  Support: {
    gradient: 'linear-gradient(145deg, var(--ds-text-success) 0%, var(--ds-text-success) 100%)',
    shadow: 'var(--ds-background-success, rgba(13, 148, 136, 0.3))',
    text: 'var(--ds-text-success)'
  }
};

export const STATUS_COLORS = {
  critical: {
    bg: 'var(--ds-surface)',
    bgDark: 'var(--ds-background-danger, rgba(239, 68, 68, 0.15))',
    border: 'var(--ds-border)',
    borderDark: 'var(--ds-background-danger, rgba(239, 68, 68, 0.3))',
    text: 'var(--ds-text-danger)',
    textDark: 'var(--ds-text-danger)',
    gradient: 'linear-gradient(90deg, var(--ds-text-danger), var(--ds-text-danger))'
  },
  warning: {
    bg: 'var(--ds-surface)',
    bgDark: 'var(--ds-background-warning, rgba(217, 119, 6, 0.15))',
    border: 'var(--ds-border)',
    borderDark: 'var(--ds-background-warning, rgba(217, 119, 6, 0.3))',
    text: 'var(--ds-text-warning)',
    textDark: 'var(--ds-text-warning)',
    gradient: 'linear-gradient(90deg, var(--ds-text-warning), var(--ds-text-warning))'
  },
  safe: {
    bg: 'var(--ds-surface)',
    bgDark: 'var(--ds-background-success, rgba(13, 148, 136, 0.15))',
    border: 'var(--ds-border)',
    borderDark: 'var(--ds-background-success, rgba(13, 148, 136, 0.3))',
    text: 'var(--ds-text-success)',
    textDark: 'var(--ds-text-success)',
    gradient: 'linear-gradient(90deg, var(--ds-text-success), var(--ds-text-success))'
  }
};
