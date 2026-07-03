import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeDatePulseViolations } from '@/lib/date-pulse/DatePulseEngine';
import { computeHealthStatus } from '@/lib/date-pulse/HealthStatusEngine';
import type {
  BusinessRequest,
  WorkItem,
  BusinessRequestHealth,
  HealthSeverity,
} from '@/types/date-pulse';

function statusToSeverity(status: string): HealthSeverity {
  switch (status) {
    case 'Delivered': return 'success';
    case 'On Track': return 'success';
    case 'Committed': return 'info';
    case 'Delayed': return 'warning';
    case 'At Risk': return 'danger';
    case 'Blocked': return 'danger';
    default: return 'neutral';
  }
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Computes delivery health for a Business Request.
 * Runs the DatePulse + HealthStatus engines client-side. 30s TTL cache.
 */
export function useBusinessRequestHealth(brId: string | undefined | null) {
  const { data, isLoading, error } = useQuery<BusinessRequestHealth | null>({
    queryKey: ['businessRequestHealth', brId],
    queryFn: async () => {
      if (!brId) return null;
      const start = Date.now();

      // 1. Fetch BR — brId may be a UUID (from direct call) or a request_key
      //    like "MDT-221" (when called from the product backlog adapter, which
      //    maps row.id = request_key). Auto-detect by UUID regex.
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brId);
      const q = (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, end_date, process_step, created_at, updated_at, request_type, urgency, product_id, release_id');
      const { data: br, error: brErr } = await (isUUID ? q.eq('id', brId) : q.eq('request_key', brId)).single();

      if (brErr || !br) return null;

      // 2. Fetch linked work via business_request_id FK on ph_issues.
      //    Fall back to matching by request_key if the FK is missing.
      const { data: linkedRows } = await (supabase as any)
        .from('ph_issues')
        .select('id, issue_key, issue_type, project_key, summary, status, status_category, due_date, created_at, updated_at, parent_key, assignee_account_id, severity')
        .eq('business_request_id', br.id)
        .limit(100);

      const linkedWork: WorkItem[] = (linkedRows ?? []).map((r: any) => ({
        id: r.id,
        issue_key: r.issue_key,
        issue_type: r.issue_type ?? null,
        project_key: r.project_key ?? '',
        // Zero-assumption: null status is "unscorable" — HealthStatusEngine
        // excludes it from in-progress/done/blocked bucketing rather than
        // counting it as 'todo' (not-started), which would skew health
        // verdicts toward Uncommitted/At Risk (CLAUDE.md).
        status: r.status ?? null,
        due_date: r.due_date ?? null,
        severity: r.severity ?? null,
        parent_key: r.parent_key ?? null,
        sprint_id: null,
        business_request_id: br.id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      // 3. Build BR model for engines (must match BusinessRequest interface)
      const effectiveEndDate = br.end_date ?? null;
      const brModel: BusinessRequest = {
        id: br.id,
        request_key: br.request_key ?? br.id,
        status: br.process_step ?? 'active',
        end_date: effectiveEndDate,
        release_id: br.release_id ?? null,
        created_at: br.created_at,
        updated_at: br.updated_at,
      };

      // 4. Run engines
      const violations = computeDatePulseViolations(brModel, linkedWork, null);
      const healthStatus = computeHealthStatus(brModel, linkedWork, violations);

      // 5. Compute derived metrics
      // Zero-assumption: items with a null status are unscorable and fall
      // out of every bucket below (mirrors HealthStatusEngine — see there
      // for why a fabricated 'todo' would skew the verdict).
      const workWithDates = linkedWork.filter(w => w.due_date !== null);
      const inProgress = linkedWork.filter(
        w => w.status && w.status !== 'backlog' && w.status !== 'todo' && w.status !== 'done',
      );
      const done = linkedWork.filter(w => w.status === 'done');
      const blockers = linkedWork.filter(
        w => w.status === 'blocked',
      );

      const daysToDeadline = daysUntil(effectiveEndDate);
      const sortedDueDates = workWithDates
        .map(w => w.due_date!)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const criticalViolations = violations.filter(v => v.severity === 'critical');

      return {
        health_status: healthStatus,
        health_severity: statusToSeverity(healthStatus),
        health_summary: `${violations.length} violation${violations.length !== 1 ? 's' : ''} · ${linkedWork.length} linked items`,
        health_descriptor: healthStatus === 'Uncommitted'
          ? 'No target date or linked work set.'
          : healthStatus === 'On Track'
          ? 'All dates aligned. On schedule.'
          : `${violations.length} violation${violations.length !== 1 ? 's' : ''} detected.`,
        linked_work_count: linkedWork.length,
        linked_work_with_dates_count: workWithDates.length,
        in_progress_count: inProgress.length,
        done_count: done.length,
        open_blockers_count: blockers.length,
        br_target_date: effectiveEndDate,
        br_end_date: effectiveEndDate,
        release_target_date: null,
        earliest_story_due: sortedDueDates[0] ?? null,
        latest_story_due: sortedDueDates[sortedDueDates.length - 1] ?? null,
        days_to_deadline: daysToDeadline,
        is_overdue: daysToDeadline < 0,
        is_urgent: daysToDeadline >= 0 && daysToDeadline < 7,
        date_pulse_violations: violations,
        violation_count: violations.length,
        critical_violation_count: criticalViolations.length,
        evaluated_at: new Date().toISOString(),
        evaluation_duration_ms: Date.now() - start,
      } satisfies BusinessRequestHealth;
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    enabled: !!brId,
  });

  return { health: data ?? null, isLoading, error };
}
