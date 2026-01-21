/**
 * Module 3B-4: Resource Allocation Types
 */

// Environment Status
export type EnvironmentStatus = 'available' | 'maintenance' | 'restricted' | 'offline';

// Environment
export interface Environment {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  status: EnvironmentStatus;
  capacity: number;
  allocated: number;
  available: number;
  utilization_percentage: number;
  active_runs: number;
  metadata: Record<string, unknown>;
}

// Worker Pool
export interface WorkerPool {
  id: string;
  name: string;
  description: string | null;
  total_workers: number;
  available_workers: number;
  assigned_workers: number;
  utilization_percentage: number;
  priority: number;
  is_default: boolean;
}

// Resource Summary
export interface ResourceSummary {
  environments: {
    total: number;
    available: number;
    total_capacity: number;
    total_allocated: number;
    utilization_percentage: number;
  };
  worker_pools: {
    total_pools: number;
    total_workers: number;
    available_workers: number;
    assigned_workers: number;
  };
  active_runs: number;
}

// Active Allocation
export interface ActiveAllocation {
  id: string;
  run: {
    id: string;
    run_number: number;
    name: string;
    status: string;
    progress: number;
  };
  environment: {
    id: string;
    name: string;
    status: EnvironmentStatus;
  };
  workers_allocated: number;
  allocated_at: string;
  pool: {
    id: string;
    name: string;
  } | null;
}

// Allocation Request
export interface AllocationRequest {
  runId: string;
  environmentId: string;
  workerCount: number;
  workerPoolId?: string;
}

// Allocation Result
export interface AllocationResult {
  success?: boolean;
  allocation_id?: string;
  workers_allocated?: number;
  environment_allocated?: number;
  environment_capacity?: number;
  error?: string;
  available?: number;
}

// Deallocation Request
export interface DeallocationRequest {
  runId: string;
  workerCount?: number;
}

// Reassign Request
export interface ReassignRequest {
  fromPoolId: string;
  toPoolId: string;
  workerCount: number;
}

// Status Config (for UI)
export interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
}

// Status Configs Map
export const STATUS_CONFIGS: Record<EnvironmentStatus, StatusConfig> = {
  available: { label: 'Available', bgColor: 'bg-success', textColor: 'text-success-foreground', dotColor: 'bg-success' },
  maintenance: { label: 'Maintenance', bgColor: 'bg-warning', textColor: 'text-warning-foreground', dotColor: 'bg-warning' },
  restricted: { label: 'Restricted', bgColor: 'bg-destructive', textColor: 'text-destructive-foreground', dotColor: 'bg-destructive' },
  offline: { label: 'Offline', bgColor: 'bg-muted', textColor: 'text-muted-foreground', dotColor: 'bg-muted-foreground' },
};

// Capacity Threshold
export const getCapacityColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-destructive';
  if (percentage >= 70) return 'bg-warning';
  return 'bg-success';
};

export const getCapacityTextColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-destructive';
  if (percentage >= 70) return 'text-warning';
  return 'text-success';
};
