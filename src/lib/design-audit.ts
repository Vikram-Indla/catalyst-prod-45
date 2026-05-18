import { supabase } from '@/lib/supabase';

export type Module = 'project-hub' | 'product-hub' | 'incidents' | 'releases' | 'reports' | 'admin' | 'resources';

export interface Violation {
  id: string;
  rule: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  surface_id: string;
  module_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuditTrail {
  id: string;
  action: string;
  module_id: string;
  surface_id?: string;
  created_at: string;
  details?: Record<string, any>;
}

export interface AuditConfig {
  module: Module;
  surface?: string;
}

export interface AuditResult {
  moduleId: string;
  surface?: string;
  violationCount: number;
  tokenCount: number;
  status: 'complete' | 'failed';
  startedAt: string;
  completedAt: string;
}

/**
 * Fetch all violations for a given module
 */
export async function getModuleViolations(module: Module): Promise<Violation[]> {
  try {
    const { data, error } = await supabase
      .from('design_violations')
      .select('*')
      .eq('surface_id', module)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching module violations:', error);
    return [];
  }
}

/**
 * Fetch audit history for a given module
 */
export async function getAuditHistory(
  module: Module,
  limit = 10
): Promise<AuditTrail[]> {
  try {
    const { data, error } = await supabase
      .from('module_audit_trails')
      .select('*')
      .eq('surface_id', module)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return [];
  }
}

/**
 * Run an audit for a module/surface and persist violations
 */
export async function runAudit(config: AuditConfig): Promise<AuditResult> {
  const auditId = `${config.module}-${config.surface || 'all'}-${Date.now()}`;
  const startedAt = new Date().toISOString();

  try {
    const { data, error: fnError } = await supabase.functions.invoke(
      'design-audit',
      {
        body: {
          module: config.module,
          surface: config.surface,
          auditId,
          startedAt,
        },
      }
    );

    if (fnError) throw fnError;

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
 * Get violations by severity level
 */
export function filterViolationsBySeverity(
  violations: Violation[],
  severity: 'P0' | 'P1' | 'P2'
): Violation[] {
  return violations.filter((v) => v.severity === severity);
}

/**
 * Calculate compliance score (0-100)
 */
export function calculateComplianceScore(violations: Violation[]): number {
  const totalViolations = violations.length;
  if (totalViolations === 0) return 100;
  return Math.max(0, 100 - totalViolations * 10);
}
