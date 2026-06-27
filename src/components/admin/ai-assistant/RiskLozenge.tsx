import React from 'react';
import { Lozenge } from '@/components/ads';
import type { Risk } from './aiAdminConsole.types';

// ZERO-DRIFT: risk/result badges are the canonical ADS Lozenge, not custom pills.
// 3-colour guardrail respected: success (green) / moved (yellow) / removed (red).
const RISK_APPEARANCE: Record<Risk, 'success' | 'moved' | 'removed'> = {
  Low: 'success',
  Medium: 'moved',
  High: 'removed',
};

export function RiskLozenge({ risk, suffix }: { risk: Risk; suffix?: string }) {
  return <Lozenge appearance={RISK_APPEARANCE[risk]}>{suffix ? `${risk} ${suffix}` : risk}</Lozenge>;
}

type Result = 'Done' | 'Pending' | 'Stopped';
const RESULT_APPEARANCE: Record<Result, 'success' | 'moved' | 'removed'> = {
  Done: 'success', Pending: 'moved', Stopped: 'removed',
};
export function ResultLozenge({ result }: { result: Result }) {
  return <Lozenge appearance={RESULT_APPEARANCE[result]}>{result}</Lozenge>;
}

/** Bulk tag — Atlaskit "inprogress" (blue) subtle. */
export function BulkTag() {
  return <Lozenge appearance="inprogress">Bulk</Lozenge>;
}
