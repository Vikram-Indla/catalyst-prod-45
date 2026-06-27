/**
 * Product Milestone Types
 *
 * Milestones are product-level time containers that group Business Requests.
 * Key differences from releases:
 * - Milestones = product roadmap measuring stick (business level)
 * - Releases = operational deployment container (ops level)
 */

export interface ProductMilestone {
  id: string;
  key: string; // e.g., "PDM-2026-Q3-INV"
  title: string; // e.g., "Q3 Innovation Sprint"
  productId: string;
  quarter: string; // 'Q1' | 'Q2' | 'Q3' | 'Q4'
  startDate?: string; // ISO 8601
  targetDate: string; // ISO 8601
  status: 'planned' | 'in_progress' | 'at_risk' | 'completed' | 'delivered' | 'archived';
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  archivedAt?: string;
}

export interface ProductMilestoneWithProgress extends ProductMilestone {
  linkedBRCount: number;
  linkedBRs: Array<{
    id: string;
    key: string;
    title: string;
  }>;
  linkedFeatures: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  progressPercent: number; // Derived from feature completion
  healthStatus: 'on_track' | 'at_risk' | 'off_track';
}

export interface BusinessRequestMilestoneLink {
  id: string;
  businessRequestId: string;
  milestoneId: string;
  sequenceInMilestone?: number; // Phase 1, 2, 3
  isPrimary: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface MilestoneProgress {
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  notStartedFeatures: number;
  progressPercent: number;
}

export interface MilestoneFilters {
  status?: string[];
  quarter?: string[];
  targetDateFrom?: string;
  targetDateTo?: string;
}

export interface CreateMilestoneInput {
  productId: string;
  key: string;
  title: string;
  quarter: string;
  startDate?: string;
  targetDate: string;
  status?: string;
  description?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  quarter?: string;
  startDate?: string;
  targetDate?: string;
  status?: string;
  description?: string;
}
