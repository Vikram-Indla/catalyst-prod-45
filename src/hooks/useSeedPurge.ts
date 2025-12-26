/**
 * Seed Data Purge Hook
 * 
 * Provides functionality to identify and delete seeded/demo data from the database.
 * Uses RPC calls to avoid TypeScript issues with dynamic table names.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Seeded data patterns - UUIDs that follow predictable seed patterns
const SEEDED_UUID_PATTERNS = [
  /^([0-9])\1{7}-/,
  /^a1b2c3d4-/,
  /^b2c3d4e5-/,
  /^c3d4e5f6-/,
  /^00000000-0000-0000-0000-/,
  /^44444444-0000-0000-0000-/,
];

// Tables to purge in order (child tables first)
const PURGE_ORDER = [
  'committee_votes', 'committee_members', 'incident_committees', 'incident_comments',
  'incident_attachments', 'incident_history', 'incident_labels', 'incident_watchers',
  'defect_comments', 'defect_attachments', 'acceptance_criteria', 'feature_contributors',
  'business_request_links', 'business_request_discussions', 'capacity_allocations',
  'dependencies', 'comments', 'attachments', 'activity_logs', 'subtasks', 'stories',
  'defects', 'incidents', 'features', 'epics', 'business_requests', 'iterations',
  'releases', 'team_members', 'teams', 'projects', 'programs',
];

const SKIP_TABLES = new Set([
  'profiles', 'auth_settings', 'seed_purge_audit_log', 'feature_flags',
  'demand_process_steps', 'epic_statuses', 'feature_statuses', 'departments',
]);

export interface PurgeResult {
  table: string;
  count: number;
  status: 'pending' | 'deleted' | 'skipped' | 'error';
  error?: string;
}

export interface PurgeSummary {
  isDryRun: boolean;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  totalDeleted: number;
  results: PurgeResult[];
  blocked: boolean;
  blockReason?: string;
}

export function useSeedPurge() {
  const { session } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PurgeResult[]>([]);
  const [summary, setSummary] = useState<PurgeSummary | null>(null);

  const checkEnvironmentGuardrails = useCallback((): { allowed: boolean; reason?: string } => {
    const environment = import.meta.env.VITE_ENVIRONMENT;
    const allowPurge = import.meta.env.VITE_ALLOW_SEED_PURGE;

    if (environment === 'production') {
      return { allowed: false, reason: 'Seed purge is BLOCKED in production environment.' };
    }
    if (allowPurge !== 'true') {
      return { allowed: false, reason: 'VITE_ALLOW_SEED_PURGE is not set to "true".' };
    }
    return { allowed: true };
  }, []);

  const isSeededId = useCallback((id: string): boolean => {
    if (!id) return false;
    return SEEDED_UUID_PATTERNS.some(pattern => pattern.test(id));
  }, []);

  const runPurge = useCallback(async (
    isDryRun: boolean,
    confirmationText: string
  ): Promise<PurgeSummary> => {
    const startTime = Date.now();
    const results: PurgeResult[] = [];

    const guardrailCheck = checkEnvironmentGuardrails();
    if (!guardrailCheck.allowed) {
      const sum: PurgeSummary = { isDryRun, startedAt: new Date(), completedAt: new Date(), executionTimeMs: 0, totalDeleted: 0, results: [], blocked: true, blockReason: guardrailCheck.reason };
      setSummary(sum);
      return sum;
    }

    if (!isDryRun && confirmationText !== 'PURGE SEEDED DATA') {
      const sum: PurgeSummary = { isDryRun, startedAt: new Date(), completedAt: new Date(), executionTimeMs: 0, totalDeleted: 0, results: [], blocked: true, blockReason: 'Invalid confirmation text.' };
      setSummary(sum);
      return sum;
    }

    setIsRunning(true);
    setProgress([]);

    try {
      for (const table of PURGE_ORDER) {
        if (SKIP_TABLES.has(table)) {
          results.push({ table, count: 0, status: 'skipped' });
          setProgress(prev => [...prev, { table, count: 0, status: 'skipped' }]);
          continue;
        }

        try {
          // Use raw SQL via RPC to handle dynamic tables
          const { data, error } = await supabase.rpc('get_table_ids', { table_name: table });
          
          if (error) {
            results.push({ table, count: 0, status: 'error', error: error.message });
            setProgress(prev => [...prev, { table, count: 0, status: 'error', error: error.message }]);
            continue;
          }

          const ids = (data as { id: string }[] | null) || [];
          const seededIds = ids.filter(row => isSeededId(row.id)).map(row => row.id);

          if (isDryRun) {
            results.push({ table, count: seededIds.length, status: 'pending' });
            setProgress(prev => [...prev, { table, count: seededIds.length, status: 'pending' }]);
          } else if (seededIds.length > 0) {
            const { error: delError } = await supabase.rpc('delete_by_ids', { table_name: table, ids: seededIds });
            results.push({ table, count: delError ? 0 : seededIds.length, status: delError ? 'error' : 'deleted', error: delError?.message });
            setProgress(prev => [...prev, { table, count: delError ? 0 : seededIds.length, status: delError ? 'error' : 'deleted' }]);
          } else {
            results.push({ table, count: 0, status: 'deleted' });
            setProgress(prev => [...prev, { table, count: 0, status: 'deleted' }]);
          }
        } catch (err) {
          results.push({ table, count: 0, status: 'error', error: String(err) });
          setProgress(prev => [...prev, { table, count: 0, status: 'error', error: String(err) }]);
        }
      }

      const endTime = Date.now();
      const totalDeleted = results.reduce((sum, r) => sum + r.count, 0);

      const sum: PurgeSummary = { isDryRun, startedAt: new Date(startTime), completedAt: new Date(endTime), executionTimeMs: endTime - startTime, totalDeleted, results, blocked: false };
      setSummary(sum);
      return sum;
    } finally {
      setIsRunning(false);
    }
  }, [session, checkEnvironmentGuardrails, isSeededId]);

  return { isRunning, progress, summary, runPurge, checkEnvironmentGuardrails };
}
