/**
 * Incident Insights Generator
 * Produces factual, urgent operational briefings
 */

import { useMemo } from 'react';
import type { AnalyticsSnapshot, BreakdownData, IncidentWithSLA } from '../types';

export interface IncidentInsights {
  executiveSummary: string;
  keyFacts: string[];
  requiredActions: string[];
  generatedAt: Date;
}

export function useIncidentInsights(
  snapshot: AnalyticsSnapshot,
  breakdowns: BreakdownData,
  majorIncidents: IncidentWithSLA[],
  timeRangeLabel: string
): IncidentInsights {
  return useMemo(() => {
    const facts: string[] = [];
    const actions: string[] = [];

    // Build Key Facts
    // SLA posture
    if (snapshot.sla_breached > 0) {
      facts.push(`${snapshot.sla_breached} incident${snapshot.sla_breached > 1 ? 's have' : ' has'} BREACHED SLA and require${snapshot.sla_breached === 1 ? 's' : ''} immediate resolution.`);
    }
    if (snapshot.sla_at_risk > 0) {
      facts.push(`${snapshot.sla_at_risk} incident${snapshot.sla_at_risk > 1 ? 's are' : ' is'} AT RISK of SLA breach within the next 20% of remaining time.`);
    }
    if (snapshot.sla_breached === 0 && snapshot.sla_at_risk === 0) {
      facts.push('All incidents are currently ON TRACK for SLA compliance.');
    }

    // Major incidents
    const activeMajor = majorIncidents.filter(inc => inc.is_major_incident);
    if (activeMajor.length > 0) {
      const unassigned = activeMajor.filter(inc => !inc.assignee_name);
      facts.push(`${activeMajor.length} major incident${activeMajor.length > 1 ? 's are' : ' is'} active.`);
      if (unassigned.length > 0) {
        facts.push(`${unassigned.length} major incident${unassigned.length > 1 ? 's remain' : ' remains'} UNASSIGNED.`);
      }
    }

    // Severity concentration
    const sev1Count = breakdowns.severity['SEV1'] || 0;
    const sev2Count = breakdowns.severity['SEV2'] || 0;
    if (sev1Count > 0 || sev2Count > 0) {
      facts.push(`High severity concentration: ${sev1Count} SEV1 and ${sev2Count} SEV2 incidents in the active queue.`);
    }

    // Level distribution
    const l1Count = breakdowns.level['L1'] || 0;
    const l2Count = breakdowns.level['L2'] || 0;
    const l3Count = breakdowns.level['L3'] || 0;
    facts.push(`Support level distribution: L1=${l1Count}, L2=${l2Count}, L3=${l3Count}.`);

    // Flow imbalance
    const openCount = breakdowns.status['open'] || 0;
    const triageCount = breakdowns.status['triage'] || 0;
    const resolvedCount = breakdowns.status['resolved'] || 0;
    const closedCount = breakdowns.status['closed'] || 0;
    const inflow = openCount + triageCount;
    const outflow = resolvedCount + closedCount;
    if (inflow > outflow * 1.5) {
      facts.push(`Flow imbalance detected: ${inflow} incoming vs ${outflow} resolved/closed. Queue is growing.`);
    }

    // Committee
    if (snapshot.committee > 0) {
      facts.push(`${snapshot.committee} incident${snapshot.committee > 1 ? 's are' : ' is'} pending committee decision.`);
    }

    // Build Required Actions
    if (snapshot.sla_breached > 0) {
      actions.push(`Immediately escalate and resolve ${snapshot.sla_breached} SLA-breached incident${snapshot.sla_breached > 1 ? 's' : ''}.`);
    }
    if (snapshot.sla_at_risk > 0) {
      actions.push(`Pull ${snapshot.sla_at_risk} at-risk incident${snapshot.sla_at_risk > 1 ? 's' : ''} into active resolution before SLA breach.`);
    }
    const unassignedMajor = activeMajor.filter(inc => !inc.assignee_name);
    if (unassignedMajor.length > 0) {
      actions.push(`Assign owners to ${unassignedMajor.length} unassigned major incident${unassignedMajor.length > 1 ? 's' : ''} immediately.`);
    }
    if (snapshot.committee > 0) {
      actions.push(`Clear ${snapshot.committee} committee-pending item${snapshot.committee > 1 ? 's' : ''} without delay.`);
    }
    if (actions.length === 0) {
      actions.push('Continue monitoring. No immediate escalations required.');
    }

    // Build Executive Summary
    let summary = '';
    const totalOpen = snapshot.open;
    
    // Opening facts
    summary += `There are ${totalOpen} open incident${totalOpen !== 1 ? 's' : ''} in the active queue. `;
    
    // Risks
    const risks: string[] = [];
    if (snapshot.sla_breached > 0) {
      risks.push(`${snapshot.sla_breached} SLA breach${snapshot.sla_breached > 1 ? 'es' : ''}`);
    }
    if (snapshot.sla_at_risk > 0) {
      risks.push(`${snapshot.sla_at_risk} at-risk`);
    }
    if (snapshot.major_active > 0) {
      risks.push(`${snapshot.major_active} major active`);
    }
    
    if (risks.length > 0) {
      summary += `Immediate attention required: ${risks.join(', ')}. `;
    } else {
      summary += `All SLAs are on track. `;
    }

    // Escalation pressure
    if (snapshot.sla_breached > 0 || snapshot.major_active > 0) {
      summary += `Escalation pressure is HIGH. `;
    } else if (snapshot.sla_at_risk > 0) {
      summary += `Escalation pressure is MODERATE. `;
    } else {
      summary += `Operations are stable. `;
    }

    // Committee blockage
    if (snapshot.committee > 0) {
      summary += `${snapshot.committee} item${snapshot.committee > 1 ? 's' : ''} blocked pending committee decision.`;
    }

    return {
      executiveSummary: summary.trim(),
      keyFacts: facts,
      requiredActions: actions,
      generatedAt: new Date(),
    };
  }, [snapshot, breakdowns, majorIncidents, timeRangeLabel]);
}
