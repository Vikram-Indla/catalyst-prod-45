/**
 * Feature Flags — TypeScript interfaces (Stage A)
 * Controls module visibility and incremental rollout across Catalyst platform.
 */

export type ModuleCategory = 'Strategy' | 'Product' | 'Delivery' | 'Quality' | 'Operations';

export type ModuleStatus = 'live' | 'draft' | 'beta';

export type EnvironmentScope = 'production' | 'staging' | 'development';

export interface ModuleDependency {
  module_key: string;
  dependency_type: 'requires' | 'recommended';
  description: string;
}

export interface FeatureFlag {
  id: string;
  module_key: string;
  module_name: string;
  description: string;
  category: ModuleCategory;
  status: ModuleStatus;
  enabled: boolean;
  environment: EnvironmentScope;
  route: string;
  icon_name: string;
  icon_color: string;
  dependencies: ModuleDependency[];
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
  created_at: string;
  sort_order: number;
}

export interface FeatureFlagTogglePayload {
  id: string;
  enabled: boolean;
  environment: EnvironmentScope;
}

export interface FeatureFlagAuditEntry {
  id: string;
  flag_id: string;
  action: 'enabled' | 'disabled' | 'created' | 'bulk_enabled' | 'bulk_disabled';
  performed_by: string;
  performed_by_name: string;
  performed_at: string;
  environment: EnvironmentScope;
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagStats {
  total: number;
  enabled: number;
  disabled: number;
  by_category: Record<ModuleCategory, { total: number; enabled: number }>;
}
