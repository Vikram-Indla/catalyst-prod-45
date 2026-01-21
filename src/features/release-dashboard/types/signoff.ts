/**
 * Stakeholder Sign-off Types
 * Module 5B-3: Sign-off workflow management
 */

// Sign-off decision options
export type SignoffDecision = 'pending' | 'approve' | 'reject' | 'abstain';

// Individual signoff record
export interface ReleaseSignoff {
  id: string;
  stakeholderId: string;
  stakeholderName: string;
  stakeholderEmail: string;
  stakeholderRole: string;
  decision: SignoffDecision;
  comments?: string;
  requestedAt: string;
  decidedAt?: string;
  isRequired: boolean;
}

// Sign-off summary statistics
export interface SignoffSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  abstained: number;
  requiredTotal: number;
  requiredApproved: number;
  allRequiredApproved: boolean;
  hasRejections: boolean;
}

// Complete sign-off status for a release
export interface ReleaseSignoffStatus {
  releaseId: string;
  signoffs: ReleaseSignoff[];
  summary: SignoffSummary;
}

// Sign-off template for reuse
export interface SignoffTemplate {
  id: string;
  name: string;
  description?: string;
  roles: SignoffTemplateRole[];
  isDefault: boolean;
  createdAt: string;
  createdBy?: string;
}

// Role definition within a template
export interface SignoffTemplateRole {
  role: string;
  isRequired: boolean;
  sortOrder: number;
}

// Request for new sign-off
export interface SignoffRequest {
  releaseId: string;
  stakeholderId: string;
  stakeholderRole: string;
  isRequired?: boolean;
  requestedBy?: string;
}

// Decision submission
export interface SignoffDecisionInput {
  signoffId: string;
  stakeholderId: string;
  decision: SignoffDecision;
  comments?: string;
}

// Visual configuration for decisions
export const SIGNOFF_DECISION_CONFIG: Record<SignoffDecision, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    icon: 'Clock',
  },
  approve: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle2',
  },
  reject: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: 'XCircle',
  },
  abstain: {
    label: 'Abstained',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: 'MinusCircle',
  },
};

// Common stakeholder roles
export const COMMON_STAKEHOLDER_ROLES = [
  { value: 'product_owner', label: 'Product Owner' },
  { value: 'qa_lead', label: 'QA Lead' },
  { value: 'dev_lead', label: 'Development Lead' },
  { value: 'release_manager', label: 'Release Manager' },
  { value: 'security_lead', label: 'Security Lead' },
  { value: 'ops_lead', label: 'Operations Lead' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'stakeholder', label: 'Stakeholder' },
];
