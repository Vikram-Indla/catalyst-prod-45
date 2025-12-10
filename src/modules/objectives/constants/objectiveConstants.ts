// Objectives Module - Constants per Technical Specification
// OKR Module ONLY supports Portfolio and Program tiers
// Team and Solution tiers are explicitly NOT supported per governance

import { ObjectiveStatus, ObjectiveHealth, ObjectiveCategory, ObjectiveType, ObjectiveTier } from '../types/objective.types';

export const OBJECTIVE_TIERS: { value: ObjectiveTier; label: string }[] = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'program', label: 'Program' },
  // Team and Solution tiers are NOT supported in OKR module
];

export const OBJECTIVE_STATUSES: { value: ObjectiveStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'hsl(var(--muted-foreground))' },
  { value: 'in_progress', label: 'In Progress', color: 'hsl(var(--primary))' },
  { value: 'on_track', label: 'On Track', color: 'hsl(var(--success))' },
  { value: 'at_risk', label: 'At Risk', color: 'hsl(var(--warning))' },
  { value: 'off_track', label: 'Off Track', color: 'hsl(var(--destructive))' },
  { value: 'paused', label: 'Paused', color: 'hsl(var(--muted-foreground))' },
  { value: 'completed', label: 'Completed', color: 'hsl(var(--success))' },
  { value: 'canceled', label: 'Canceled', color: 'hsl(var(--muted-foreground))' },
  { value: 'missed', label: 'Missed', color: 'hsl(var(--destructive))' },
];

export const OBJECTIVE_HEALTH: { value: ObjectiveHealth; label: string; color: string }[] = [
  { value: 'good', label: 'Good', color: 'hsl(var(--success))' },
  { value: 'fair', label: 'Fair', color: 'hsl(var(--warning))' },
  { value: 'poor', label: 'Poor', color: 'hsl(var(--destructive))' },
  { value: 'at_risk', label: 'At Risk', color: 'hsl(var(--warning))' },
];

export const OBJECTIVE_CATEGORIES: { value: ObjectiveCategory; label: string; description: string }[] = [
  { value: 'critical_path', label: 'Critical Path', description: 'Must complete, controls end date' },
  { value: 'stretch_goal', label: 'Stretch Goal', description: 'Ambitious goal beyond committed' },
];

export const OBJECTIVE_TYPES: { value: ObjectiveType; label: string; description: string }[] = [
  { value: 'feature_finisher', label: 'Feature Finisher', description: 'Bring feature to market' },
  { value: 'non_code', label: 'Non-Code', description: 'Business objectives, no coding' },
  { value: 'incremental_delivery', label: 'Incremental Delivery', description: 'Delivers portion of value' },
  { value: 'event', label: 'Event', description: 'Specific date or milestone' },
];

export const METRIC_TYPES = [
  { value: 'count', label: 'Count', description: 'Numeric count (e.g., 150 customers)' },
  { value: 'currency', label: 'Currency', description: 'Dollar/SAR values (e.g., $50,000)' },
  { value: 'percentage', label: 'Percentage', description: 'Percent complete (0-100)' },
  { value: 'decimal_score', label: 'Decimal Score', description: 'Score 0.0-1.0 (e.g., 0.75)' },
  { value: 'nps', label: 'NPS', description: 'Net Promoter Score (-100 to 100)' },
];

export const WORK_ITEM_TYPES = [
  { value: 'epic', label: 'Epic' },
  { value: 'feature', label: 'Feature' },
  { value: 'story', label: 'Story' },
  { value: 'task', label: 'Task' },
  { value: 'defect', label: 'Defect' },
];

export const ALIGNMENT_TYPES = [
  { value: 'direct', label: 'Direct', description: 'Directly contributes to objective' },
  { value: 'inherited', label: 'Inherited', description: 'Inherits from parent' },
];
