/**
 * Design System Audit Service
 *
 * Coordinates design compliance audits across Catalyst modules.
 * Stores violations, tokens, and audit trails in Supabase.
 */

import { supabase } from '@/lib/supabase';

export type Module = 'project-hub' | 'product-hub' | 'incidents' | 'releases' | 'reports' | 'admin' | 'resources';

export interface AuditConfig {
  module: Module;
  surface?: string; // e.g., "backlog-table", "detail-view", "dashboard"
}

export interface AuditResult {
  moduleId: string;
  surface?: string;
  violationCount: number;
  tokenCount: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  error?: string;
  startedAt: string;
  completedAt?: string;
}

/**
 * Available modules and their surfaces
 */
export const AUDIT_MODULES = {
  'project-hub': {
    label: 'Project Hub',
    surfaces: [
      { id: 'backlog-table', label: 'Backlog Table' },
      { id: 'all-work-table', label: 'All Work Table' },
      { id: 'detail-view', label: 'Detail View' },
      { id: 'projects-list', label: 'Projects List' },
    ],
  },
  'product-hub': {
    label: 'Product Hub',
    surfaces: [
      { id: 'products-list', label: 'Products List' },
      { id: 'detail-view', label: 'Detail View' },
    ],
  },
  'incidents': {
    label: 'Incidents',
    surfaces: [
      { id: 'incidents-list', label: 'Incidents List' },
      { id: 'detail-view', label: 'Detail View' },
    ],
  },
  'releases': {
    label: 'Releases',
    surfaces: [
      { id: 'releases-list', label: 'Releases List' },
      { id: 'detail-view', label: 'Detail View' },
    ],
  },
  'reports': {
    label: 'Reports',
    surfaces: [
      { id: 'dashboard', label: 'Dashboard' },
    ],
  },
  'admin': {
    label: 'Admin',
    surfaces: [
      { id: 'design-governance', label: 'Design Governance' },
      { id: 'feature-flags', label: 'Feature Flags' },
      { id: 'workflows', label: 'Workflows' },
    ],
  },
  'resources': {
    label: 'Resources',
    surfaces: [
      { id: 'resource-list', label: 'Resource List' },
      { id: 'capacity-view', label: 'Capacity View' },
    ],
  },
} as const;

/**
 * Trigger an audit on a specific module/surface
 * All database writes happen server-side in the edge function (with service role key)
 * The client only calls the edge function and handles the result
 */
export async function runAudit(config: AuditConfig): Promise<AuditResult> {
  const auditId = `${config.module}-${config.surface || 'all'}-${Date.now()}`;
  const startedAt = new Date().toISOString();

  try {
    // Call edge function to handle entire audit workflow
    // (audit trail creation, violation detection, storage, and completion all server-side)
    const { data, error: fnError } = await supabase.functions.invoke('design-audit', {
      body: {
        module: config.module,
        surface: config.surface,
        auditId,
        startedAt,
      },
    });

    if (fnError) {
      throw fnError;
    }

    const auditResult = data;

    return {
      moduleId: auditId,
      surface: config.surface,
      violationCount: auditResult.violations?.length || 0,
      tokenCount: auditResult.tokens?.length || 0,
      status: 'complete',
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Audit error:', error);
    throw error;
  }
}

/**
 * Get audit history for a module
 */
export async function getAuditHistory(module: Module, limit = 10) {
  const { data, error } = await supabase
    .from('module_audit_trails')
    .select('*')
    .ilike('surface_id', `${module}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get all violations for a module
 */
export async function getModuleViolations(module: Module) {
  const { data, error } = await supabase
    .from('design_violations')
    .select('*')
    .ilike('surface_id', `${module}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
