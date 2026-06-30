/**
 * aiWorkloadRiskSnapshot — synchronous localStorage store for the last Caty
 * workload-risk result, so the analysis survives an unmount / tab switch
 * instead of reverting to the "Workload risk" button.
 *
 * Mirrors aiAgeingTriageSnapshot. Server is source of truth; this is the
 * client-side "hold the data if there is any" layer.
 */

export interface MemberSignalSnapshot {
  name: string;
  avatarUrl?: string | null;
  openItems: number;
  roleAvg: number;
  closureTrend: 'up' | 'down' | 'flat';
  closureRate: number;
  staleCount: number;
  status: 'overloaded' | 'healthy' | 'has-capacity';
  detail: string;
}

export interface WorkloadRiskSnapshot {
  summary: string;
  members: MemberSignalSnapshot[];
}

const KEY = 'for-you:workload-risk:snapshot';

export function readWorkloadRiskSnapshot(): WorkloadRiskSnapshot | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;
    return parsed as WorkloadRiskSnapshot;
  } catch {
    return undefined;
  }
}

export function writeWorkloadRiskSnapshot(data: WorkloadRiskSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota / privacy-mode — snapshot is best-effort, never throw */
  }
}
