/**
 * Enterprise Data Table Components
 * Centralized exports for all table-related components
 */

export { EnterpriseDataTable } from './EnterpriseDataTable';
export type { 
  EnterpriseColumn, 
  EnterpriseDataTableProps, 
  SortDirection 
} from './EnterpriseDataTable';

// Re-export legacy components for backward compatibility
export { CatalystEnterpriseTable, type CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
