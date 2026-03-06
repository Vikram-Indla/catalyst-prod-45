/**
 * BehaviouralTab — 6 observations + warning box
 */

import { AlertTriangle } from 'lucide-react';
import type { R360ProfileResource } from '@/types/r360';

interface BehaviouralTabProps {
  resource: R360ProfileResource;
}

export function BehaviouralTab({ resource }: BehaviouralTabProps) {
  const observations = [
    `${resource.fullName} tends to pick up bug tickets in bulk — 4 bugs were assigned within the same day, suggesting reactive assignment patterns.`,
    <>Demonstrates long carry-over behaviour: <span className="r3p-tl-key">BAU-4804</span> has been in progress for 14 days, indicating potential blockers or scope creep.</>,
    `Low closure rate this week (11.1%) despite touching 7 items — context-switching may be reducing throughput.`,
    `Pickup speed (44h) is higher than team average (38h), suggesting delayed initial engagement with new assignments.`,
    `All 3 concurrent in-progress items are bugs, which may indicate firefighting mode rather than planned delivery.`,
    `No items in review this week — the work pipeline may have a bottleneck before the QA handoff stage.`,
  ];

  return (
    <div className="r3p-section" style={{ borderBottom: 'none' }}>
      <div className="r3p-sec-title">Behavioural Patterns</div>
      <ul className="r3p-obs-list">
        {observations.map((obs, i) => (
          <li key={i} className="r3p-obs-item">
            <span className="r3p-obs-dot" />
            <span className="r3p-obs-text">{obs}</span>
          </li>
        ))}
      </ul>

      <div className="r3p-warn-box">
        <AlertTriangle size={14} style={{ color: 'var(--r3-warning)', flexShrink: 0, marginTop: 2 }} />
        <span className="r3p-warn-text">
          Pattern alert: Concurrent in-progress items combined with low closure velocity suggests
          {resource.fullName} may benefit from WIP limits and focused sprint commitments. Consider
          pairing or redistributing bug triage responsibilities.
        </span>
      </div>
    </div>
  );
}
