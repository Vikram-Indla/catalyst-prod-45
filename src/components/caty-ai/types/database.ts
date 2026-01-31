/**
 * CATY AI V7 — Database Types
 * Uses actual Catalyst database schema
 */

export interface Department {
  id: string;
  name: string;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface ResourceCountry {
  id: string;
  code: string | null;
  name: string;
}

export interface ResourceLocation {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ResourceInventory {
  id: string;
  name: string;
  role_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  country_id?: string | null;
  location_id?: string | null;
  contract_end_date?: string | null;
  contract_start_date?: string | null;
  is_active?: boolean | null;
}

export interface ResourceAllocation {
  id: string;
  resource_id: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ResourceWithUtilization extends ResourceInventory {
  current_utilization: number;
  utilization_status: 'critical' | 'warning' | 'normal' | 'available';
  location: 'On-Site' | 'Off-Shore';
  country_name: string;
  country_code: string;
}

export interface ContractExpiring {
  resource: ResourceWithUtilization;
  end_date: string;
  days_until_expiry: number;
  status: 'critical' | 'warning' | 'normal';
}

export interface OffshoreTeam {
  country_id: string;
  country_name: string;
  country_code: string;
  flag: string;
  resource_count: number;
  avg_utilization: number;
}
