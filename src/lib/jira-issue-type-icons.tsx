/**
 * ═══════════════════════════════════════════════════════════════════════
 * JIRA ISSUE TYPE ICONS — LEGACY DELEGATION LAYER ("RESET ICONS")
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 2026-05-03: Rendering is now DELEGATED to `WorkItemTypeIcon` from
 * `@/components/icons` — the canonical Catalyst icon library backed by
 * `src/assets/icons/work-type/*.svg`. The legacy helpers below
 * (resolveJiraTypeConfig, getJiraTypeColor, getJiraTypeLabel) remain for
 * non-icon consumers (color borders, status badges, label text).
 *
 * NEW WORK MUST USE: `import { WorkItemTypeIcon } from '@/components/icons'`
 *
 * PROTECTED ICON REGISTRY (from Jira project type configuration):
 * ─────────────────────────────────────────────────────────────────
 *   API Requirement   → #2684FF  Blue     → task SVG
 *   Backend           → #2684FF  Blue     → subtask SVG       [SUB-TASK]
 *   Bug / QA Bug      → #FF5630  Red      → bug SVG (filled circle)
 *   Business Gap      → #FF5630  Red      → incident SVG
 *   Change Request    → #FFAB00  Amber    → changes SVG (arrows)
 *   Epic              → #6554C0  Purple   → epic SVG (lightning bolt)
 *   Feature           → #36B37E  Green    → new-feature SVG (plus)
 *   Figma             → #2684FF  Blue     → subtask SVG       [SUB-TASK]
 *   Frontend          → #2684FF  Blue     → subtask SVG       [SUB-TASK]
 *   Improvement       → #36B37E  Green    → improvement SVG (up arrow)
 *   Incident          → #FF5630  Red      → incident SVG (beacon)
 *   Integration       → #2684FF  Blue     → subtask SVG       [SUB-TASK]
 *   Issue             → #2684FF  Blue     → issue SVG (checkmark square)
 *   New Feature       → #36B37E  Green    → new-feature SVG (plus)
 *   Problem           → #FF5630  Red      → problem SVG (circle slash)
 *   Prod. Incident    → #FF5630  Red      → incident SVG
 *   Question          → #6554C0  Purple   → question SVG (circle ?)
 *   Story             → #36B37E  Green    → story SVG (bookmark)
 *   Sub-task          → #2684FF  Blue     → subtask SVG       [SUB-TASK]
 *   Task              → #2684FF  Blue     → task SVG (empty square)
 *
 * FILES THAT DELEGATE TO THIS MODULE (guardrail chain):
 *   src/components/shared/JiraIssueTypeIcon.tsx          → re-export w/ tooltip
 *   src/components/project-hub/sdlc/PHIssueTypeIcon.tsx  → re-export
 *   src/modules/.../story-detail/IssueTypeIcon.tsx       → re-export
 *
 * SVG FILES: /admin/icons/jira/*.svg (16px and 24px variants)
 * To change an icon globally: replace the SVG file. No code changes.
 *
 * CODE WORD: "RESET ICONS"
 */

import React from 'react';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';

// ─── SVG FILE MAPPING ────────────────────────────────────────────────
// Each type maps to a filename prefix in /admin/icons/jira/
// Available sizes: 16 and 24

const ICON_BASE_PATH = '/admin/icons/jira';

export interface JiraTypeConfig {
  label: string;
  color: string;       // accent color for borders, badges, etc.
  iconFile: string;    // filename prefix (e.g. "epic" → epic-16.svg, epic-24.svg)
}

const CONFIGS: Record<string, JiraTypeConfig> = {
  // ── Epic: purple lightning bolt ──
  epic: {
    label: 'Epic',
    color: '#6554C0',
    iconFile: 'epic',
  },

  // ── Task: blue empty square ──
  task: {
    label: 'Task',
    color: '#2684FF',
    iconFile: 'task',
  },

  // ── Story: green bookmark ──
  story: {
    label: 'Story',
    color: '#36B37E',
    iconFile: 'story',
  },

  // ── Incident: red beacon ──
  incident: {
    label: 'Incident',
    color: '#FF5630',
    iconFile: 'incident',
  },
  'production incident': {
    label: 'Production Incident',
    color: '#FF5630',
    iconFile: 'incident',
  },

  // ── Bug / QA Bug / Defect: red filled circle ──
  bug: {
    label: 'Bug',
    color: '#FF5630',
    iconFile: 'bug',
  },
  'qa bug': {
    label: 'QA Bug',
    color: '#FF5630',
    iconFile: 'bug',
  },
  defect: {
    label: 'Defect',
    color: '#FF5630',
    iconFile: 'bug',
  },

  // ── Problem: red circle with slash ──
  problem: {
    label: 'Problem',
    color: '#FF5630',
    iconFile: 'problem',
  },

  // ── Question: purple circle with ? ──
  question: {
    label: 'Question',
    color: '#6554C0',
    iconFile: 'question',
  },

  // ── Changes / Change Request: amber arrows ──
  changes: {
    label: 'Changes',
    color: '#FFAB00',
    iconFile: 'changes',
  },
  'change request': {
    label: 'Change Request',
    color: '#FFAB00',
    iconFile: 'changes',
  },

  // ── Issue: blue square with checkmark ──
  issue: {
    label: 'Issue',
    color: '#2684FF',
    iconFile: 'issue',
  },

  // ── New Feature / Feature: green plus ──
  'new feature': {
    label: 'New Feature',
    color: '#36B37E',
    iconFile: 'new-feature',
  },
  feature: {
    label: 'Feature',
    color: '#36B37E',
    iconFile: 'new-feature',
  },

  // ── Improvement: green up arrow ──
  improvement: {
    label: 'Improvement',
    color: '#36B37E',
    iconFile: 'improvement',
  },

  // ── Subtask / Sub-task: blue two squares ──
  subtask: {
    label: 'Subtask',
    color: '#2684FF',
    iconFile: 'subtask',
  },
  'sub-task': {
    label: 'Sub-task',
    color: '#2684FF',
    iconFile: 'subtask',
  },

  // ── Business Gap: uses incident (closest match) ──
  'business gap': {
    label: 'Business Gap',
    color: '#FF5630',
    iconFile: 'incident',
  },

  // ── API Requirement: uses task ──
  'api requirement': {
    label: 'API Requirement',
    color: '#2684FF',
    iconFile: 'task',
  },

  // ── BRD Task: uses subtask ──
  'brd task': {
    label: 'BRD Task',
    color: '#2684FF',
    iconFile: 'subtask',
  },

  // ── Backend / Frontend / Integration / Figma: uses subtask ──
  backend: { label: 'Backend', color: '#5243AA', iconFile: 'backend' },
  frontend: { label: 'Frontend', color: '#00B8D9', iconFile: 'frontend' },
  integration: { label: 'Integration', color: '#2684FF', iconFile: 'subtask' },
  figma: { label: 'Figma', color: '#2684FF', iconFile: 'subtask' },
  'entity figma': { label: 'Entity FIGMA', color: '#2684FF', iconFile: 'subtask' },

  // ── Business Request: amber lightbulb ──
  'business request': {
    label: 'Business Request',
    color: '#FFAB00',
    iconFile: 'business-request',
  },
};

export const PROTECTED_ISSUE_TYPE_OPTIONS = [
  'API Requirement',
  'Backend',
  'Bug',
  'Business Gap',
  'Change Request',
  'Epic',
  'Feature',
  'Figma',
  'Frontend',
  'Improvement',
  'Integration',
  'Issue',
  'New Feature',
  'Problem',
  'Production Incident',
  'QA Bug',
  'Question',
  'Story',
  'Sub-task',
  'Task',
] as const;

const warnedUnknownTypes = new Set<string>();

function warnUnknownJiraType(normalizedType: string, rawType: string) {
  if (!import.meta.env.DEV) return;
  if (!normalizedType || warnedUnknownTypes.has(normalizedType)) return;
  warnedUnknownTypes.add(normalizedType);
  console.warn(
    `[JiraIssueTypeIcon guardrail] Unknown issue type "${rawType}" fell back to Task icon. Add it to src/lib/jira-issue-type-icons.tsx to protect it.`
  );
}

// ─── RESOLVER ────────────────────────────────────────────────────────

/**
 * Resolve a Jira issue type string to its canonical config.
 * Uses case-insensitive fuzzy matching.
 */
export function resolveJiraTypeConfig(issueType: string): JiraTypeConfig {
  const t = (issueType || '').toLowerCase().trim();

  // Direct match
  if (CONFIGS[t]) return CONFIGS[t];

  // Fuzzy match — order matters (more specific first)
  if (t.includes('production') && t.includes('incident')) return CONFIGS['production incident'];
  if (t.includes('qa') && t.includes('bug')) return CONFIGS['qa bug'];
  if (t.includes('business') && t.includes('gap')) return CONFIGS['business gap'];
  if (t.includes('change') && t.includes('request')) return CONFIGS['change request'];
  if (t.includes('business') && t.includes('request')) return CONFIGS['business request'];
  if (t.includes('api') && t.includes('requirement')) return CONFIGS['api requirement'];
  if (t.includes('new') && t.includes('feature')) return CONFIGS['new feature'];
  if (t.includes('brd')) return CONFIGS['brd task'];
  if (t.includes('bug') || t.includes('defect')) return CONFIGS.bug;
  if (t.includes('epic')) return CONFIGS.epic;
  if (t.includes('story')) return CONFIGS.story;
  if (t.includes('sub-task') || t.includes('subtask')) return CONFIGS.subtask;
  if (t.includes('improvement')) return CONFIGS.improvement;
  if (t.includes('problem')) return CONFIGS.problem;
  if (t.includes('question')) return CONFIGS.question;
  if (t.includes('incident')) return CONFIGS.incident;
  if (t.includes('change')) return CONFIGS.changes;
  if (t.includes('figma')) return CONFIGS.figma;
  if (t.includes('backend')) return CONFIGS.backend;
  if (t.includes('frontend')) return CONFIGS.frontend;
  if (t.includes('integration')) return CONFIGS.integration;
  if (t.includes('task')) return CONFIGS.task;
  if (t.includes('feature')) return CONFIGS.feature;
  if (t.includes('issue')) return CONFIGS.issue;

  warnUnknownJiraType(t, issueType);

  // Fallback → task icon
  return {
    label: issueType || 'Unknown',
    color: '#6B778C',
    iconFile: 'task',
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────

/**
 * Get the SVG URL for a given issue type and size.
 */
export function getJiraIconUrl(issueType: string, size: 16 | 24 = 16): string {
  const cfg = resolveJiraTypeConfig(issueType);
  return `${ICON_BASE_PATH}/${cfg.iconFile}-${size}.svg`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────

interface JiraIssueTypeIconProps {
  type: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Inline-SVG overrides for glyphs we want to draw in-code rather than
 * hit the /admin/icons/jira/*.svg static path. Useful where we want
 * modern Atlassian glyphs without shipping new static assets.
 *
 * 2026-04-19: Epic upgraded from the legacy purple-stroke lightning bolt
 * to the modern Atlassian Epic glyph — a filled purple rounded square
 * with a white bolt cutout (Jira Cloud 2024+). This is what new Jira
 * screenshots show; the old stroked icon reads dated beside modern
 * Atlassian UI.
 */
const INLINE_SVGS: Record<string, (size: number) => React.ReactNode> = {
  /* jira-compare ST-7 (2026-04-28): Frontend / Backend differentiated.
   * Frontend = monitor (cyan), Backend = server stack (indigo). */
  frontend: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label="Frontend">
      <rect width="16" height="16" rx="2" fill="#00B8D9" />
      <rect x="3" y="4" width="10" height="6" rx="0.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
      <rect x="6.5" y="11" width="3" height="1.6" fill="#FFFFFF" />
      <rect x="5" y="12.6" width="6" height="0.8" fill="#FFFFFF" />
    </svg>
  ),
  backend: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label="Backend">
      <rect width="16" height="16" rx="2" fill="#5243AA" />
      <ellipse cx="8" cy="4.5" rx="3.5" ry="1.4" fill="none" stroke="#FFFFFF" strokeWidth="1.1" />
      <path d="M4.5 4.5v3c0 .77 1.57 1.4 3.5 1.4s3.5-.63 3.5-1.4v-3" fill="none" stroke="#FFFFFF" strokeWidth="1.1" />
      <path d="M4.5 7.5v3c0 .77 1.57 1.4 3.5 1.4s3.5-.63 3.5-1.4v-3" fill="none" stroke="#FFFFFF" strokeWidth="1.1" />
    </svg>
  ),
  epic: (size) => (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label="Epic">
      <rect width="16" height="16" rx="2" fill="#904EE2" />
      <path
        d="M8.6 2.9a.4.4 0 0 0-.75-.17L4.4 8.35a.4.4 0 0 0 .34.61h2.1l-.47 4.13a.4.4 0 0 0 .75.26l3.95-5.72a.4.4 0 0 0-.33-.63h-2.3L8.6 2.9z"
        fill="#FFFFFF"
      />
    </svg>
  ),
};

/**
 * Canonical Jira issue type icon component.
 * ALWAYS use this — never create local icon mappings.
 *
 * Renders an inline SVG when INLINE_SVGS has an entry for the resolved
 * iconFile (modern Atlassian glyphs). Otherwise falls back to an <img>
 * pointing at /admin/icons/jira/*.svg for legacy icons.
 */
export function JiraIssueTypeIcon({ type, size = 16, className, style }: JiraIssueTypeIconProps) {
  // Delegate to canonical Catalyst icon component. WorkItemTypeIcon
  // accepts free-text and normalizes via normalizeWorkItemType().
  // Brand color, dark-mode swap, runtime overrides, a11y are handled there.
  return (
    <WorkItemTypeIcon
      type={type}
      size={size}
      className={className}
      style={style}
    />
  );
}

// Below is preserved only so legacy non-component call sites that imported
// JiraIssueTypeIcon (rare) continue to compile. The function body above has
// already returned. The `<img>` block below is unreachable code — kept as a
// reference of the old static-asset path until all callers have migrated.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _legacyImgFallback({ type, size = 16, className, style }: JiraIssueTypeIconProps) {
  const cfg = resolveJiraTypeConfig(type);
  const svgSize: 16 | 24 = size <= 16 ? 16 : 24;
  const src = `${ICON_BASE_PATH}/${cfg.iconFile}-${svgSize}.svg`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={cfg.label}
      title={cfg.label}
      className={className}
      style={{ flexShrink: 0, ...style }}
      draggable={false}
    />
  );
}

/**
 * Get the accent/border color for an issue type.
 */
export function getJiraTypeColor(issueType: string): string {
  return resolveJiraTypeConfig(issueType).color;
}

/**
 * Get the human-readable label for an issue type.
 */
export function getJiraTypeLabel(issueType: string): string {
  return resolveJiraTypeConfig(issueType).label;
}
