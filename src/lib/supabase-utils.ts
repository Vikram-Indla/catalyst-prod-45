/**
 * Supabase utility functions to handle tables not in auto-generated types
 * This provides type-safe wrappers for tables that exist in the database
 * but aren't yet reflected in the auto-generated types.ts file
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Get a typed query builder for tables not in the auto-generated types
 * Use this when you need to query tables that exist in the database
 * but cause TypeScript errors due to missing type definitions
 */
export function fromTable(tableName: string) {
  return (supabase.from as any)(tableName);
}

/**
 * Common untyped tables that exist in the database
 */
export const untypedTables = {
  permissionGrants: () => fromTable('permission_grants'),
  businessRequests: () => fromTable('business_requests'),
  businessLines: () => fromTable('business_lines'),
  businessRequestAuditLogs: () => fromTable('business_request_audit_logs'),
  businessRequestLinks: () => fromTable('business_request_links'),
  businessRequestDiscussions: () => fromTable('business_request_discussions'),
  capacityDepartments: () => fromTable('capacity_departments'),
  authAuditLog: () => fromTable('auth_audit_log'),
  assignments: () => fromTable('assignments'),
  resourceAllocations: () => fromTable('resource_allocations'),
  labels: () => fromTable('labels'),
  epicLabels: () => fromTable('epic_labels'),
  epicLabelAssignments: () => fromTable('epic_label_assignments'),
  workflows: () => fromTable('workflows'),
  workflowSteps: () => fromTable('workflow_steps'),
  workflowTransitions: () => fromTable('workflow_transitions'),
  attachments: () => fromTable('attachments'),
} as const;
