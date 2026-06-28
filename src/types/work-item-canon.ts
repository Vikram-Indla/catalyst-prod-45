/**
 * CATALYST WORK-ITEM CANONICAL CONTRACT — single source of truth.
 *
 * Every work-item enum (type, status, priority, severity, resolution) lives
 * here or is re-exported from here. DO NOT redefine these unions anywhere
 * else — per-module copies are how drift regrew (WorkItemType ×8, Priority
 * ×19, Severity ×4). Import from this file instead.
 *
 * Casing law: canonical values are Jira-parity Title-case, top to bottom
 * (DB text, API, UI) — no transform layer. `normalize*` helpers fold legacy
 * forms onto canon at the edges.
 */
import { CATALYST_PRIORITIES, type CatalystPriority } from '@/lib/catalyst-priority';

// ─── Priority (re-export the existing canonical scale) ───────────────────────
export {
  CATALYST_PRIORITIES,
  CATALYST_PRIORITY_OPTIONS,
  PRIORITY_COLORS,
  PRIORITY_SORT_ORDER,
  normalizePriority,
} from '@/lib/catalyst-priority';
export type { CatalystPriority } from '@/lib/catalyst-priority';
/** Canonical alias — work-item priority IS the Catalyst priority. */
export type WorkItemPriority = CatalystPriority;

// ─── Work item type (Jira-parity display names) ──────────────────────────────
/** The work-item types a user can create. Matches CreateStoryModal WORK_TYPES. */
export const WORK_ITEM_TYPES = [
  'Story',
  'Epic',
  'Feature',
  'Business Request',
  'Business Gap',
  'QA Bug',
  'Production Incident',
  'Change Request',
  'Task',
] as const;
export type WorkItemTypeName = (typeof WORK_ITEM_TYPES)[number];

/**
 * Internal routing kind — lowercase, used by CatalystDetailRouter and view
 * selection. One canonical mapping from the Jira display name.
 */
export const WORK_ITEM_KINDS = [
  'story',
  'epic',
  'feature',
  'business_request',
  'business_gap',
  'defect',
  'incident',
  'change_request',
  'task',
  'subtask',
  'test_case',
  'test_cycle',
] as const;
export type WorkItemKind = (typeof WORK_ITEM_KINDS)[number];

/** Jira display name → internal routing kind. */
export const TYPE_NAME_TO_KIND: Record<WorkItemTypeName, WorkItemKind> = {
  Story: 'story',
  Epic: 'epic',
  Feature: 'feature',
  'Business Request': 'business_request',
  'Business Gap': 'business_gap',
  'QA Bug': 'defect',
  'Production Incident': 'incident',
  'Change Request': 'change_request',
  Task: 'task',
};

// ─── Status category ─────────────────────────────────────────────────────────
/** The three workflow buckets every status maps to. */
export const STATUS_CATEGORIES = ['todo', 'in_progress', 'done'] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

// ─── Severity (canonical 5-level, Jira-parity) ───────────────────────────────
/**
 * Canonical severity — 5 levels, Title-case, matching Jira + the detail-view
 * lozenge. Replaces the lossy 4-value create scale (critical/high/medium/low)
 * and its CRITICAL/MAJOR/MINOR/TRIVIAL remap.
 */
export const WORK_ITEM_SEVERITIES = [
  'Blocker',
  'Critical',
  'Major',
  'Minor',
  'Trivial',
] as const;
export type WorkItemSeverity = (typeof WORK_ITEM_SEVERITIES)[number];

/** Fold any legacy severity string onto canon, or null. */
export function normalizeSeverity(raw: string | null | undefined): WorkItemSeverity | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const legacy: Record<string, WorkItemSeverity> = {
    blocker: 'Blocker',
    critical: 'Critical',
    high: 'Major', // legacy 4-value create scale
    major: 'Major',
    medium: 'Minor',
    minor: 'Minor',
    low: 'Trivial',
    trivial: 'Trivial',
  };
  return legacy[lower] ?? null;
}

// ─── Resolution ──────────────────────────────────────────────────────────────
/** Canonical resolution values. */
export const WORK_ITEM_RESOLUTIONS = [
  'Fixed',
  "Won't Fix",
  'Duplicate',
  'Cannot Reproduce',
  'By Design',
  'Deferred',
] as const;
export type WorkItemResolution = (typeof WORK_ITEM_RESOLUTIONS)[number];
