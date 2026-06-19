import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ── Inlined engine types ──────────────────────────────────────────────────────

type HealthStatus =
  | 'Uncommitted'
  | 'Committed'
  | 'On Track'
  | 'Delayed'
  | 'At Risk'
  | 'Blocked'
  | 'Delivered';

interface BusinessRequest {
  id: string;
  request_key: string;
  status: string;
  end_date: string | null;
  release_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkItem {
  id: string;
  issue_key: string;
  issue_type: string;
  project_key: string;
  status: string;
  due_date: string | null;
  severity: string | null;
  parent_key: string | null;
  business_request_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DatePulseViolation {
  ruleId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  affectedItemKey: string | null;
  affectedItemType: string | null;
  affectedItemId: string | null;
}

// ── Inlined DatePulseEngine (subset needed for health) ────────────────────────

function createViolation(
  ruleId: string,
  category: string,
  sev: string,
  title: string,
  description: string,
  affectedItemKey: string | null,
  affectedItemType: string | null,
  affectedItemId: string | null,
): DatePulseViolation {
  return { ruleId, category, severity: sev, title, description, affectedItemKey, affectedItemType, affectedItemId };
}

function computeDatePulseViolations(
  br: BusinessRequest,
  linkedWork: WorkItem[],
): DatePulseViolation[] {
  const violations: DatePulseViolation[] = [];

  // A1: BR Target Date Missing
  if (!br.end_date && !br.release_id) {
    violations.push(createViolation('A1', 'missing', 'advisory', 'BR Target Date Missing', 'Business expectation date is missing.', null, null, null));
  }

  // A2: Linked Work Missing Dates
  for (const item of linkedWork) {
    if (!item.due_date) {
      violations.push(createViolation('A2', 'missing', 'warning', 'Linked Work Missing Dates', `${item.issue_key} has no due date.`, item.issue_key, item.issue_type, item.id));
    }
  }

  // B-series: Date Conflicts
  const brTargetDate = br.end_date;
  for (const item of linkedWork) {
    if (!item.due_date) continue;
    if (brTargetDate && item.due_date > brTargetDate && item.issue_type !== 'Epic') {
      violations.push(createViolation('B1', 'conflict', 'critical', 'Story Due After BR Target', `${item.issue_key} due after BR target.`, item.issue_key, item.issue_type, item.id));
    }
  }

  // D1: No In-Progress Work while committed (engagement check done in health engine)
  // D2: Overdue items
  const today = new Date().toISOString().split('T')[0];
  for (const item of linkedWork) {
    if (item.due_date && item.due_date < today && item.status !== 'done') {
      violations.push(createViolation('D2', 'status', 'critical', 'Overdue Work Item', `${item.issue_key} is overdue.`, item.issue_key, item.issue_type, item.id));
    }
  }

  return violations;
}

// ── Inlined HealthStatusEngine ────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const deadline = new Date(dateStr);
  const today = new Date();
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function checkCommitted(br: BusinessRequest, linkedWork: WorkItem[], workWithDates: WorkItem[], inProgressWork: WorkItem[]): boolean {
  if (linkedWork.length === 0) return false;
  if (workWithDates.length === 0) return false;
  const targetDate = br.end_date;
  for (const work of workWithDates) {
    if (targetDate && work.due_date && work.due_date > targetDate) return false;
  }
  if (inProgressWork.length === 0) return false;
  return true;
}

function computeHealthStatus(br: BusinessRequest, linkedWork: WorkItem[], violations: DatePulseViolation[]): HealthStatus {
  const workWithDates = linkedWork.filter(w => w.due_date !== null && w.due_date !== undefined);
  const inProgressWork = linkedWork.filter(w => w.status && w.status !== 'backlog' && w.status !== 'todo' && w.status !== 'done');
  const criticalBlockers = linkedWork.filter(w => (w.severity === 'P1' || w.severity === 'P0' || w.severity === 'SEV1') && w.status === 'blocked');

  if (criticalBlockers.length > 0) return 'Blocked';

  if (linkedWork.length > 0 && linkedWork.every(w => w.status === 'done') && br.status === 'done') return 'Delivered';

  if (linkedWork.length === 0 || workWithDates.length === 0) return 'Uncommitted';

  const targetDate = br.end_date;
  if (targetDate) {
    const daysToDeadline = daysUntil(targetDate);
    const noDeliveryPath = linkedWork.length === 0 || inProgressWork.length === 0;
    if (noDeliveryPath && daysToDeadline < 14 && daysToDeadline >= 0) return 'At Risk';
  }

  const isCommitted = checkCommitted(br, linkedWork, workWithDates, inProgressWork);
  if (!isCommitted) return 'Uncommitted';

  if (violations.length > 0) return 'Delayed';

  return 'On Track';
}

// ── Main handler ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 200;

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, serviceKey);

    // Fetch all BRs
    const { data: brs, error: brErr } = await client
      .from('business_requests')
      .select('id, request_key, end_date, process_step, release_id, created_at, updated_at');

    if (brErr) throw brErr;
    if (!brs?.length) return new Response(JSON.stringify({ ok: true, updated: 0 }), { status: 200 });

    const brIds = brs.map((b: any) => b.id);

    // Fetch all linked ph_issues in one query
    const { data: linkedRows, error: issueErr } = await client
      .from('ph_issues')
      .select('id, issue_key, issue_type, project_key, status, due_date, created_at, updated_at, parent_key, severity, business_request_id')
      .in('business_request_id', brIds)
      .limit(5000);

    if (issueErr) throw issueErr;

    // Group by BR id
    const linkedByBR = new Map<string, WorkItem[]>();
    for (const r of (linkedRows ?? [])) {
      if (!r.business_request_id) continue;
      const arr = linkedByBR.get(r.business_request_id) ?? [];
      arr.push({
        id: r.id,
        issue_key: r.issue_key,
        issue_type: r.issue_type ?? 'Story',
        project_key: r.project_key ?? '',
        status: r.status ?? 'todo',
        due_date: r.due_date ?? null,
        severity: r.severity ?? null,
        parent_key: r.parent_key ?? null,
        business_request_id: r.business_request_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
      linkedByBR.set(r.business_request_id, arr);
    }

    // Compute health for each BR
    const updates: { id: string; health_status: string }[] = [];
    for (const br of brs) {
      const brModel: BusinessRequest = {
        id: br.id,
        request_key: br.request_key ?? br.id,
        status: br.process_step ?? 'active',
        end_date: br.end_date ?? null,
        release_id: br.release_id ?? null,
        created_at: br.created_at,
        updated_at: br.updated_at,
      };
      const linked = linkedByBR.get(br.id) ?? [];
      const violations = computeDatePulseViolations(brModel, linked);
      const healthStatus = computeHealthStatus(brModel, linked, violations);
      updates.push({ id: br.id, health_status: healthStatus });
    }

    // Batch upsert back
    let totalUpdated = 0;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const { error: upErr } = await client
        .from('business_requests')
        .upsert(batch, { onConflict: 'id' });
      if (upErr) throw upErr;
      totalUpdated += batch.length;
    }

    console.log(`[date-pulse-health-refresh] Updated ${totalUpdated} BRs`);
    return new Response(JSON.stringify({ ok: true, updated: totalUpdated }), { status: 200 });
  } catch (err) {
    console.error('[date-pulse-health-refresh] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
