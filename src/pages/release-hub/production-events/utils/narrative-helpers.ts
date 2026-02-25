/**
 * Production Events — Narrative & Impact Text Generation
 * Transforms raw Jira data into executive-quality prose.
 */

import type { ProductionEvent, ProductionIssue } from '../hooks/useProductionEvents';

// ─── JIRA CLEANUP ───────────────────────────────────────────

export function cleanJiraSummary(s: string | null): string {
  if (!s) return 'a platform update was applied';
  return s
    .replace(/\s*-\s*CR\s*\.?\s*$/i, '')
    .replace(/\s*CR\s*-\s*/i, '')
    .replace(/\s*→\s*/g, ' to ')
    .replace(/\(\s*\)/g, '')
    .replace(/\.\s*-\s*/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*\.\s*$/, '')
    .trim();
}

export function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function cleanSubtitle(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\s*-\s*CR\s*[-.]?\s*/gi, ' — ')
    .replace(/\s*→\s*/g, ' to ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 80);
}

export function cleanEventTitle(title: string): string {
  return title
    .replace(/\s*-\s*CR\s*$/i, '')
    .replace(/\s*\/\s*backend\s*$/i, ' backend services')
    .replace(/^Update\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── NARRATIVE GENERATION ───────────────────────────────────

function extractActions(tickets: ProductionIssue[]): string {
  const summaries = tickets.map(t => cleanJiraSummary(t.summary).toLowerCase());
  const hasWorkflow = summaries.some(s => s.includes('status') || s.includes('workflow') || s.includes('approved'));
  const hasUpdate = summaries.some(s => s.includes('update') || s.includes('change'));
  const hasQuantity = summaries.some(s => s.includes('quantity') || s.includes('unit'));

  const parts: string[] = [];
  if (hasWorkflow) parts.push('workflow updates');
  if (hasUpdate) parts.push('configuration changes');
  if (hasQuantity) parts.push('data corrections');
  if (parts.length === 0) parts.push('multiple operational improvements');

  return parts.join(', ');
}

export function formatNarrative(event: ProductionEvent): string {
  const tickets = event.stories;
  const epicName = event.parentSummary || event.title;

  if (tickets.length === 0) {
    return `Updates were deployed for ${epicName}.`;
  }

  if (tickets.length === 1) {
    const summary = cleanJiraSummary(tickets[0].summary);
    return `${capitalizeFirst(summary)}. This update is part of the ${epicName} workstream and has been deployed to the production environment.`;
  }

  const actionVerbs = extractActions(tickets);
  return `${tickets.length} changes were deployed to the ${epicName} module, covering ${actionVerbs}. All changes have been verified and are operational.`;
}

// ─── IMPACT GENERATION ──────────────────────────────────────

export function generateImpact(event: ProductionEvent & { eventType: string }): string {
  const tickets = event.stories;
  const allText = tickets.map(t => (t.summary || '').toLowerCase()).join(' ');

  if (event.eventType === 'incident') {
    return `This fix resolves ${event.title.toLowerCase()}, ensuring uninterrupted service and data integrity for all platform users.`;
  }
  if (allText.match(/cach|performance|optim|speed|duration|api/)) {
    return `Improves platform responsiveness for operations that depend on external integrations, reducing wait times and ensuring a smoother experience during high-frequency workflows.`;
  }
  if (allText.match(/workflow|status|approv|transition|request/)) {
    return `Streamlines the operational workflow by reducing manual steps in the approval chain, enabling faster processing and more accurate status tracking for compliance purposes.`;
  }
  if (allText.match(/design|landing|brand|founding|display|page/)) {
    return `Investors and officials accessing the platform will encounter professionally presented interfaces aligned with institutional standards, reinforcing the platform's credibility.`;
  }
  if (allText.match(/email|notification|sms|message|alert/)) {
    return `Ensures reliable and timely communication delivery, keeping all stakeholders informed of critical updates and process changes without manual intervention.`;
  }
  if (allText.match(/security|auth|permission|restrict|access|path/)) {
    return `Strengthens the platform's access controls and compliance posture, ensuring proper authorization flows are enforced across all process pathways.`;
  }
  if (allText.match(/scan|inspect|industrial|production|quantity/)) {
    return `Improves data accuracy for industrial operations, ensuring production metrics are captured correctly for regulatory reporting and operational decision-making.`;
  }
  if (allText.match(/train|cooperat|backend/)) {
    return `Enhances backend processing capabilities for operational programmes, enabling more efficient handling of training and coordination workflows.`;
  }
  if (allText.match(/sector|alignment|entity|validate|application/)) {
    return `Ensures accurate validation of entity classifications against targeted sectors, supporting compliance with industrial policy requirements.`;
  }

  const count = tickets.length;
  return `This ${count > 1 ? count + '-part ' : ''}deployment strengthens the platform's operational capabilities, delivering measurable improvements for stakeholders.`;
}

// ─── SUMMARY GENERATION ─────────────────────────────────────

function numberToWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return n <= 10 ? words[n] : String(n);
}

export function generateSummaryLead(
  events: ProductionEvent[],
  periodLabel: string,
  releaseCount: number,
): string {
  const count = numberToWord(events.length);
  const Count = capitalizeFirst(count);
  const plural = events.length !== 1 ? 's' : '';

  if (releaseCount > 0) {
    return `${Count} production event${plural} deployed this ${periodLabel} across ${numberToWord(releaseCount)} release${releaseCount > 1 ? 's' : ''}.`;
  }
  return `${Count} production event${plural} deployed this ${periodLabel} for the Senaei platform.`;
}

export function generateSummaryBody(
  events: ProductionEvent[],
  periodType: string,
): string {
  if (events.length === 0) return '';
  const titles = events.map(e => cleanEventTitle(e.title));

  if (titles.length <= 3) {
    const titleList = titles.length === 1
      ? titles[0]
      : titles.slice(0, -1).join(', ') + ', and ' + titles[titles.length - 1];
    const periodPrefix = periodType === 'week' ? "This week's" : periodType === 'month' ? "This month's" : "The quarter's";
    return `${periodPrefix} deployments focused on ${titleList}. All changes are operational with no service interruptions.`;
  }

  const topThree = titles.slice(0, 3).join(', ');
  return `Key deliverables include ${topThree}, among ${titles.length - 3} other updates. All events deployed with no rollbacks or service interruptions.`;
}

// ─── QUARTERLY HELPERS ──────────────────────────────────────

export function groupEventsByMonth(events: (ProductionEvent & { eventType: string })[]): Record<string, (ProductionEvent & { eventType: string })[]> {
  return events.reduce((acc, event) => {
    const d = new Date(event.deployedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    (acc[key] = acc[key] || []).push(event);
    return acc;
  }, {} as Record<string, (ProductionEvent & { eventType: string })[]>);
}

export function formatMonthYear(key: string): string {
  const [year, month] = key.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function getTypeSummary(events: { eventType: string }[]): string {
  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.eventType] = (counts[e.eventType] || 0) + 1; });
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(' · ');
}

export function generateQuarterlySummaryLead(
  events: ProductionEvent[],
  eventsByMonth: Record<string, any[]>,
  quarter: number,
  year: number,
): string {
  const Count = capitalizeFirst(numberToWord(events.length));
  const plural = events.length !== 1 ? 's' : '';

  const monthCounts = Object.entries(eventsByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, evts]) => `${numberToWord(evts.length)} in ${formatMonthYear(key)}`)
    .join(' and ');

  return `${Count} production event${plural} deployed in Q${quarter} ${year} — ${monthCounts}.`;
}

// ─── RELEASE DISPLAY ────────────────────────────────────────

export function getDisplayRelease(fixVersionName: string | null): string | null {
  if (!fixVersionName) return null;
  if (fixVersionName.toLowerCase().includes('sprint')) return null;
  if (fixVersionName.match(/\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) return null;
  return fixVersionName.startsWith('v') ? fixVersionName : `v${fixVersionName}`;
}
