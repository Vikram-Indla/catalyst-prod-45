import { supabase } from '@/lib/supabase';

export type Module =
  | 'project-hub'
  | 'product-hub'
  | 'incidents'
  | 'releases'
  | 'reports'
  | 'admin'
  | 'resources';

/**
 * Violation — mirrors the actual design_violations table schema.
 * Field names MUST match DB columns exactly (rule_name, NOT rule).
 * The legacy 'rule' / 'module_id' fields do not exist in the DB
 * (CLAUDE.md 2026-05-19 lesson — schema mismatch caused silent
 * rendering failure).
 */
export interface Violation {
  id: number;
  surface_id: string;
  rule_name: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  created_at: string;
  updated_at: string;
  /** Repo-relative file path; NULL for legacy/manual entries. */
  file_path?: string | null;
  /** 1-based line number; NULL for legacy/manual entries. */
  line_number?: number | null;
  /** Exact offending line of code, for at-a-glance context. */
  code_snippet?: string | null;
  /** Human-readable fix recommendation from the scanner. */
  suggested_fix?: string | null;
  /** Lifecycle status: open (blocks compliance) | resolved | wont_fix. */
  status?: 'open' | 'resolved' | 'wont_fix';
  resolved_at?: string | null;
  resolved_by?: string | null;
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
 * Fetch open violations for a given module. Resolved/wont_fix rows are
 * excluded by default — pass `includeResolved: true` to see them.
 */
export async function getModuleViolations(
  module: Module,
  options: { includeResolved?: boolean } = {},
): Promise<Violation[]> {
  try {
    let query = supabase
      .from('design_violations')
      .select('*')
      .eq('surface_id', module);
    if (!options.includeResolved) {
      // Treat NULL status as 'open' (legacy rows pre-status column).
      query = query.or('status.eq.open,status.is.null');
    }
    const { data, error } = await query.order('created_at', {
      ascending: false,
    });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching module violations:', error);
    return [];
  }
}

/**
 * Fetch audit history for a given module.
 */
export async function getAuditHistory(
  module: Module,
  limit = 10,
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
 * Run an audit for a module/surface and persist violations.
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
      },
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
 * Mark a violation as resolved (developer fixed it) or wont_fix
 * (consciously dismissed). Status flips immediately in the UI; the
 * next audit run will re-open it if the underlying code wasn't
 * actually fixed.
 */
export async function markViolationResolved(
  id: number,
  status: 'resolved' | 'wont_fix' = 'resolved',
): Promise<void> {
  const { error } = await supabase
    .from('design_violations')
    .update({
      status,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Re-open a violation that was previously marked resolved/wont_fix.
 */
export async function reopenViolation(id: number): Promise<void> {
  const { error } = await supabase
    .from('design_violations')
    .update({
      status: 'open',
      resolved_at: null,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Get violations by severity level.
 */
export function filterViolationsBySeverity(
  violations: Violation[],
  severity: 'P0' | 'P1' | 'P2',
): Violation[] {
  return violations.filter((v) => v.severity === severity);
}

/**
 * Calculate compliance score (0-100).
 */
export function calculateComplianceScore(violations: Violation[]): number {
  const totalViolations = violations.length;
  if (totalViolations === 0) return 100;
  return Math.max(0, 100 - totalViolations * 10);
}
