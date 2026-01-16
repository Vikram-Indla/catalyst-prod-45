/**
 * Priority Score Algorithm
 * 
 * Priority Score (0-100) = 
 *   (Due Urgency × 0.30) +
 *   (Risk Impact × 0.25) +
 *   (Gate Dependency × 0.20) +
 *   (Defect Correlation × 0.15) +
 *   (Incident Correlation × 0.10)
 */

interface PriorityScoreInputs {
  dueDate: string | null;
  riskImpact: 'critical' | 'high' | 'medium' | 'low';
  blocksGate: boolean;
  linkedDefectsCount: number;
  hasIncident: boolean;
}

const WEIGHTS = {
  dueUrgency: 0.30,
  riskImpact: 0.25,
  gateDependency: 0.20,
  defectCorrelation: 0.15,
  incidentCorrelation: 0.10,
};

const DUE_URGENCY_SCORES = {
  overdue: 100,
  today: 80,
  tomorrow: 60,
  this_week: 40,
  later: 20,
};

const RISK_IMPACT_SCORES = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 20,
};

function calculateDueUrgency(dueDate: string | null): number {
  if (!dueDate) return DUE_URGENCY_SCORES.later;

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  if (due < today) return DUE_URGENCY_SCORES.overdue;
  if (due.getTime() === today.getTime()) return DUE_URGENCY_SCORES.today;
  if (due.getTime() === tomorrow.getTime()) return DUE_URGENCY_SCORES.tomorrow;
  if (due <= thisWeekEnd) return DUE_URGENCY_SCORES.this_week;
  return DUE_URGENCY_SCORES.later;
}

function calculateRiskImpact(risk: 'critical' | 'high' | 'medium' | 'low'): number {
  return RISK_IMPACT_SCORES[risk];
}

function calculateGateDependency(blocksGate: boolean): number {
  return blocksGate ? 100 : 0;
}

function calculateDefectCorrelation(defectsCount: number): number {
  return Math.min(defectsCount * 25, 100);
}

function calculateIncidentCorrelation(hasIncident: boolean): number {
  return hasIncident ? 100 : 0;
}

export function calculatePriorityScore(inputs: PriorityScoreInputs): number {
  const dueUrgencyScore = calculateDueUrgency(inputs.dueDate);
  const riskScore = calculateRiskImpact(inputs.riskImpact);
  const gateScore = calculateGateDependency(inputs.blocksGate);
  const defectScore = calculateDefectCorrelation(inputs.linkedDefectsCount);
  const incidentScore = calculateIncidentCorrelation(inputs.hasIncident);

  const totalScore = 
    (dueUrgencyScore * WEIGHTS.dueUrgency) +
    (riskScore * WEIGHTS.riskImpact) +
    (gateScore * WEIGHTS.gateDependency) +
    (defectScore * WEIGHTS.defectCorrelation) +
    (incidentScore * WEIGHTS.incidentCorrelation);

  return Math.round(totalScore);
}

export function getUrgencyFromDueDate(dueDate: string | null): 'overdue' | 'due_today' | 'due_soon' | 'on_track' {
  if (!dueDate) return 'on_track';

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'due_today';
  if (due <= thisWeekEnd) return 'due_soon';
  return 'on_track';
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'No due date';

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
