/**
 * ResourceProfile - Canonical shape for all resource/user data
 * Used across /admin/users and Capacity Planner
 * Source tables: profiles, resource_inventory, user_product_roles, product_roles
 */

export interface ResourceProfile {
  // Primary identifiers
  user_id: string;
  profile_id: string | null;
  resource_inventory_id: string | null;

  // Core profile fields (from profiles table)
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DISABLED' | null;
  requested_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  signup_attempts_count: number | null;
  created_at: string | null;
  updated_at: string | null;

  // Resource inventory IDs (source of truth)
  vendor_id: string | null;
  department_id: string | null;
  assignment_id: string | null;
  location_id: string | null;
  country_id: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  job_role: string | null;
  default_capacity_percent: number | null;
  resource_is_active: boolean | null;

  // Resolved lookup names
  vendor_name: string | null;
  department_name: string | null;
  assignment_name: string | null;
  location_name: string | null;
  country_name: string | null;
  country_code: string | null;

  // Fallback resolved values
  resolved_vendor: string | null;
  resolved_country: string | null;
  resolved_location: string | null;
  country_flag_svg_url: string | null;

  // Roles (from user_product_roles + product_roles)
  roles: ResourceRole[];
  business_lines: string[];
}

export interface ResourceRole {
  id: string;
  role_id: string;
  role_name: string;
  role_code: string;
  business_lines: string[];
}

/**
 * Query keys for consistent cache invalidation
 * NOTE: resource_allocations and resource_utilization are bi-directionally synced
 */
export const RESOURCE_QUERY_KEYS = {
  // Admin users
  usersList: ['users-list'] as const,
  userInventory: (userId: string) => ['user-inventory', userId] as const,
  
  // Capacity planner
  capacityResources: ['capacity-planner-resources'] as const,
  capacityProjects: ['capacity-planner-projects'] as const,
  capacityAssignments: ['capacity-planner-assignments'] as const,
  capacityScenarios: ['capacity-planner-scenarios'] as const,
  resourceAllocations: ['resource-allocations'] as const,
  capacitySummary: ['capacity-summary'] as const,
  
  // Resource utilization (bi-synced with allocations)
  resourceUtilization: (year?: number) => year ? ['resource-utilization', year] as const : ['resource-utilization'] as const,
  
  // Reference data
  productRoles: ['product-roles'] as const,
  resourceVendors: ['resource-vendors'] as const,
  resourceLocations: ['resource-locations'] as const,
  resourceCountries: ['resource-countries'] as const,
  resourceAssignments: ['resource-assignments'] as const,
  capacityDepartments: ['capacity-departments'] as const,
} as const;

/**
 * All query keys that should be invalidated when resource data changes
 */
export const ALL_RESOURCE_QUERY_KEYS = [
  RESOURCE_QUERY_KEYS.usersList,
  RESOURCE_QUERY_KEYS.capacityResources,
  RESOURCE_QUERY_KEYS.capacityAssignments,
  RESOURCE_QUERY_KEYS.resourceAllocations,
] as const;
