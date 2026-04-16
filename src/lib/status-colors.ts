/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CATALYST STATUS COLORS — Centralized 3-Color Guardrail
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GUARDRAIL: 3 colours only. Zero exceptions. Zero overrides.
 *   GREY  → bg:#42526E  text:#FFFFFF  → To Do / Backlog / On Hold
 *   BLUE  → bg:#0C66E4  text:#FFFFFF  → In Progress / In Review / Active
 *   GREEN → bg:#1B7F37  text:#FFFFFF  → Done / Approved / Completed
 *
 * Usage: import { deriveStatusCategory, STATUS_LOZENGE } from '@/lib/status-colors';
 */

export type StatusCategory = 'todo' | 'in_progress' | 'done';

export const STATUS_LOZENGE = {
  todo:        { bg: '#42526E', text: '#FFFFFF' },
  in_progress: { bg: '#0C66E4', text: '#FFFFFF' },
  done:        { bg: '#1B7F37', text: '#FFFFFF' },
} as const;

// ── Normalized status patterns ───────────────────────────────────────────────

const DONE_PATTERNS = /^(done|completed|closed|resolved|released|shipped|approved|verified|fixed|in.?production|production.?ready|beta.?ready|passed)$/i;
const IN_PROGRESS_PATTERNS = /^(in.?progress|in.?development|in.?review|in.?qa|in.?uat|in.?beta|in.?testing|active|doing|review|testing|on.?hold|blocked|in.?entity|end.?to.?end|triaged|in_progress|reopened|open|new)$/i;

/**
 * Derive the 3-category status from any status string.
 * Matches the StatusLozenge guardrail from CLAUDE.md Section 5.
 */
export function deriveStatusCategory(status: string | null | undefined): StatusCategory {
  if (!status) return 'todo';
  const s = status.trim();
  if (DONE_PATTERNS.test(s)) return 'done';
  if (IN_PROGRESS_PATTERNS.test(s)) return 'in_progress';
  return 'todo';
}

/**
 * Get lozenge colors (bg + text hex) for any status string.
 * Returns the canonical 3-color guardrail values.
 */
export function getStatusLozengeColors(status: string | null | undefined): { bg: string; text: string } {
  return STATUS_LOZENGE[deriveStatusCategory(status)];
}

// ── Priority colors (consistent across all modules) ──────────────────────────

export const PRIORITY_COLORS = {
  critical: { hex: '#DC2626', bg: '#FEF2F2', text: '#991B1B' },
  high:     { hex: '#F97316', bg: '#FFF7ED', text: '#9A3412' },
  medium:   { hex: '#EAB308', bg: '#FEFCE8', text: '#854D0E' },
  low:      { hex: '#22C55E', bg: '#F0FDF4', text: '#166534' },
} as const;

export type PriorityLevel = keyof typeof PRIORITY_COLORS;

/**
 * Get priority colors for any priority string.
 */
export function getPriorityColors(priority: string | null | undefined): { hex: string; bg: string; text: string } {
  const p = (priority || '').toLowerCase();
  if (p === 'critical' || p === 'highest') return PRIORITY_COLORS.critical;
  if (p === 'high') return PRIORITY_COLORS.high;
  if (p === 'low' || p === 'lowest') return PRIORITY_COLORS.low;
  return PRIORITY_COLORS.medium;
}
