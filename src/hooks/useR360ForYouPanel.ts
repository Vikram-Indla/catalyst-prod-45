/**
 * useR360ForYouPanel — pure allocation logic for the R360 "For You" panel's
 * project-time breakdown.
 *
 * computeProjectAllocations is exported standalone (no Supabase, no Auth)
 * so the deterministic weighting algorithm can be unit tested in isolation.
 * See src/hooks/__tests__/useR360ForYouPanel.test.ts for the full contract.
 */

export type ProjectAllocationRole = 'lead' | 'member' | 'reviewer';

export interface ProjectAllocationInput {
  projectId: string;
  name: string;
  key: string;
  color: string;
  role: ProjectAllocationRole;
}

export interface ProjectAllocationEntry {
  projectId: string;
  name: string;
  key?: string;
  color?: string;
  role?: ProjectAllocationRole;
  allocationPct: number;
  isBuffer: boolean;
}

// Relative time-allocation weight per role. Strictly decreasing so
// lead > member > reviewer for any mix of roles.
const ROLE_WEIGHT: Record<ProjectAllocationRole, number> = {
  lead: 3,
  member: 2,
  reviewer: 1,
};

// A fixed 20% "Buffer" slice is always reserved (context switching, ad-hoc
// work, meetings) — the remaining 80% is the pool split across projects.
const BUFFER_PCT = 20;
const PROJECT_POOL_PCT = 100 - BUFFER_PCT;

function makeBufferEntry(): ProjectAllocationEntry {
  return {
    projectId: '__buffer__',
    name: 'Buffer',
    allocationPct: BUFFER_PCT,
    isBuffer: true,
  };
}

/**
 * Splits the 80% project pool across `projects` proportionally to each
 * project's role weight, then hands the fixed 20% remainder to a synthetic
 * Buffer entry. Percentages are integer and always sum to exactly 100 —
 * largest-remainder rounding distributes any leftover points so no
 * fractional drift accumulates.
 */
export function computeProjectAllocations(
  projects: ProjectAllocationInput[],
): ProjectAllocationEntry[] {
  const buffer = makeBufferEntry();
  if (projects.length === 0) return [buffer];

  const totalWeight = projects.reduce((sum, p) => sum + ROLE_WEIGHT[p.role], 0);
  const raw = projects.map((p) => (PROJECT_POOL_PCT * ROLE_WEIGHT[p.role]) / totalWeight);
  const floored = raw.map((v) => Math.floor(v));
  let remainder = PROJECT_POOL_PCT - floored.reduce((sum, v) => sum + v, 0);

  const byFractionDesc = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const pcts = [...floored];
  for (let k = 0; k < byFractionDesc.length && remainder > 0; k++, remainder--) {
    pcts[byFractionDesc[k].i] += 1;
  }

  const entries: ProjectAllocationEntry[] = projects.map((p, i) => ({
    ...p,
    allocationPct: pcts[i],
    isBuffer: false,
  }));

  return [...entries, buffer];
}
