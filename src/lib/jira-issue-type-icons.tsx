/**
 * ═══════════════════════════════════════════════════════════════════════
 * JIRA ISSUE TYPE ICONS — CANONICAL GUARDRAIL ("RESET ICONS" REFERENCE)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for all Jira issue type icons
 * across the entire Catalyst platform. Every component that renders an
 * issue type icon MUST import from this file.
 *
 * CODE WORD: "RESET ICONS"
 * When the user says "reset icons" + screenshot, all issue type icons
 * must match this file exactly. No exceptions.
 *
 * GUARDRAIL RULES:
 * 1. All icons are 16×16 SVG with rounded-square backgrounds
 * 2. Colors and shapes are LOCKED per the approved Jira icon spec (Image 2)
 * 3. DO NOT create local icon mappings in individual components
 * 4. DO NOT use emojis for issue types — SVG only
 * 5. Any new issue type must be added HERE and nowhere else
 *
 * CANONICAL ICON SPEC (from Jira — Image 2 reference):
 *   Epic             → Purple (#904EE2)  lightning bolt ⚡
 *   Feature          → Blue (#4BADE8)    checkbox ☑
 *   Story            → Green (#63BA3C)   bookmark flag 🔖
 *   Business Gap     → Orange (#FF991F)  exclamation badge ⚠
 *   QA Bug           → Red (#E5493A)     bug circle 🐛
 *   Production Inc.  → Red (#FF5630)     triangle warning ⚠
 *   Change Request   → Orange (#FF991F)  bookmark flag (same as story shape)
 *   Task             → Blue (#4BADE8)    checkbox ☑
 *   Sub-task         → Blue (#4BAEE8)    nested squares
 *   API Requirement  → Teal (#0D9488)    code brackets </>
 *   Defect           → Red (#E5493A)     bug circle
 *   BRD Task         → Blue (#4BAEE8)    nested squares
 *   Backend          → Blue (#4BAEE8)    nested squares
 *   Frontend         → Blue (#4BAEE8)    nested squares
 *   Integration      → Blue (#4BAEE8)    nested squares
 *   Business Request → Cyan (#00B8D9)    bookmark flag
 *   Entity FIGMA     → Blue (#4BAEE8)    nested squares
 *   Figma            → Blue (#4BAEE8)    nested squares
 */

import React from 'react';

// ─── ATLASSIAN SVG PATHS (exact from Jira icon set) ──────────────────

const EPIC_PATH = 'M5.9233,3.7566 L5.9213,3.7526 C5.9673,3.6776 6.0003,3.5946 6.0003,3.4996 C6.0003,3.2236 5.7763,2.9996 5.5003,2.9996 L3.0003,2.9996 L3.0003,0.4996 C3.0003,0.2236 2.7763,-0.0004 2.5003,-0.0004 C2.3283,-0.0004 2.1853,0.0916 2.0953,0.2226 C2.0673,0.2636 2.0443,0.3056 2.0293,0.3526 L0.0813,4.2366 L0.0833,4.2396 C0.0353,4.3166 0.0003,4.4026 0.0003,4.4996 C0.0003,4.7766 0.2243,4.9996 0.5003,4.9996 L3.0003,4.9996 L3.0003,7.4996 C3.0003,7.7766 3.2243,7.9996 3.5003,7.9996 C3.6793,7.9996 3.8293,7.9006 3.9183,7.7586 L3.9213,7.7596 L3.9343,7.7336 C3.9453,7.7126 3.9573,7.6936 3.9653,7.6716 L5.9233,3.7566 Z';

const STORY_PATH = 'M9,3 L5,3 C4.448,3 4,3.448 4,4 L4,10.5 C4,10.776 4.224,11 4.5,11 C4.675,11 4.821,10.905 4.91,10.769 L4.914,10.77 L6.84,8.54 C6.92,8.434 7.08,8.434 7.16,8.54 L9.086,10.77 L9.09,10.769 C9.179,10.905 9.325,11 9.5,11 C9.776,11 10,10.776 10,10.5 L10,4 C10,3.448 9.552,3 9,3';

const BUG_PATH = 'M10,7 C10,8.657 8.657,10 7,10 C5.343,10 4,8.657 4,7 C4,5.343 5.343,4 7,4 C8.657,4 10,5.343 10,7';

// ─── RENDER FUNCTIONS ────────────────────────────────────────────────

function renderEpic() {
  return (
    <g transform="translate(4, 3)">
      <path d={EPIC_PATH} fill="#FFFFFF" />
    </g>
  );
}

function renderCheckbox() {
  return (
    <g transform="translate(1, 1)">
      <g transform="translate(3, 3.5)" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M2,5 L6,0" />
        <path d="M2,5 L0,3" />
      </g>
    </g>
  );
}

function renderStory() {
  return (
    <g transform="translate(1, 1)">
      <path d={STORY_PATH} fill="#FFFFFF" />
    </g>
  );
}

function renderBug() {
  return (
    <g transform="translate(1, 1)">
      <path d={BUG_PATH} fill="#FFFFFF" />
    </g>
  );
}

function renderExclamation() {
  return (
    <g transform="translate(1, 1)">
      <g fill="none">
        <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
        <line x1="7" y1="4.5" x2="7" y2="7" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="9" r="0.8" fill="#FFFFFF" />
      </g>
    </g>
  );
}

function renderIncident() {
  return (
    <g transform="translate(1, 1)">
      <circle cx="7" cy="7" r="5" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
      <text x="7" y="9.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="700" fontFamily="sans-serif">?</text>
    </g>
  );
}

function renderSubtask() {
  return (
    <g transform="translate(1, 1)">
      <rect x="3" y="3" width="5" height="5" rx="0.8" stroke="#FFFFFF" fill="none" />
      <rect x="6" y="6" width="5" height="5" rx="0.8" stroke="#FFFFFF" fill="#FFFFFF" />
    </g>
  );
}

function renderCodeBrackets() {
  return (
    <g transform="translate(1, 1)">
      <path d="M5 3.5L2.5 7L5 10.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M9 3.5L11.5 7L9 10.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M8 2.5L6 11.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

// ─── TYPE CONFIG ─────────────────────────────────────────────────────

export interface JiraTypeConfig {
  label: string;
  color: string;       // background color of the rounded square
  renderInner: (size: number) => React.ReactNode;
}

const CONFIGS: Record<string, JiraTypeConfig> = {
  // ── Epic: purple lightning bolt ──
  epic: {
    label: 'Epic',
    color: '#904EE2',
    renderInner: renderEpic,
  },

  // ── Feature: blue checkbox ──
  feature: {
    label: 'Feature',
    color: '#4BADE8',
    renderInner: renderCheckbox,
  },

  // ── Story: GREEN bookmark flag ──
  story: {
    label: 'Story',
    color: '#63BA3C',
    renderInner: renderStory,
  },

  // ── Business Gap: orange exclamation badge ──
  'business gap': {
    label: 'Business Gap',
    color: '#FF991F',
    renderInner: renderExclamation,
  },

  // ── QA Bug: RED bug circle ──
  'qa bug': {
    label: 'QA Bug',
    color: '#E5493A',
    renderInner: renderBug,
  },

  // ── Production Incident: red/orange question circle ──
  'production incident': {
    label: 'Production Incident',
    color: '#FF5630',
    renderInner: renderIncident,
  },

  // ── Change Request: orange bookmark (same shape as story) ──
  'change request': {
    label: 'Change Request',
    color: '#FF991F',
    renderInner: renderStory,
  },

  // ── Task: blue checkbox ──
  task: {
    label: 'Task',
    color: '#4BADE8',
    renderInner: renderCheckbox,
  },

  // ── Sub-task: blue nested squares ──
  'sub-task': {
    label: 'Sub-task',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },

  // ── API Requirement: teal code brackets ──
  'api requirement': {
    label: 'API Requirement',
    color: '#0D9488',
    renderInner: renderCodeBrackets,
  },

  // ── Defect: red bug circle ──
  defect: {
    label: 'Defect',
    color: '#E5493A',
    renderInner: renderBug,
  },

  // ── BRD Task: blue nested squares ──
  'brd task': {
    label: 'BRD Task',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },

  // ── Backend: blue nested squares ──
  backend: {
    label: 'Backend',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },

  // ── Frontend: blue nested squares ──
  frontend: {
    label: 'Frontend',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },

  // ── Integration: blue nested squares ──
  integration: {
    label: 'Integration',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },

  // ── Business Request: cyan bookmark ──
  'business request': {
    label: 'Business Request',
    color: '#00B8D9',
    renderInner: renderStory,
  },

  // ── Figma: blue nested squares ──
  figma: {
    label: 'Figma',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },

  // ── Entity FIGMA ──
  'entity figma': {
    label: 'Entity FIGMA',
    color: '#4BAEE8',
    renderInner: renderSubtask,
  },
};

// Alias: subtask (no hyphen) → sub-task
CONFIGS['subtask'] = CONFIGS['sub-task'];

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
  if (t.includes('brd')) return CONFIGS['brd task'];
  if (t.includes('bug') || t.includes('defect')) return CONFIGS.defect;
  if (t.includes('epic')) return CONFIGS.epic;
  if (t.includes('story')) return CONFIGS.story;
  if (t.includes('sub-task') || t.includes('subtask')) return CONFIGS['sub-task'];
  if (t.includes('figma')) return CONFIGS.figma;
  if (t.includes('backend')) return CONFIGS.backend;
  if (t.includes('frontend')) return CONFIGS.frontend;
  if (t.includes('integration')) return CONFIGS.integration;
  if (t.includes('task')) return CONFIGS.task;
  if (t.includes('feature')) return CONFIGS.feature;
  if (t.includes('incident')) return CONFIGS['production incident'];

  // Fallback → gray circle
  return {
    label: issueType || 'Unknown',
    color: '#6B778C',
    renderInner: renderCheckbox,
  };
}

// ─── COMPONENT ───────────────────────────────────────────────────────

interface JiraIssueTypeIconProps {
  type: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Canonical Jira issue type icon component.
 * ALWAYS use this — never create local icon mappings.
 */
export function JiraIssueTypeIcon({ type, size = 16, className, style }: JiraIssueTypeIconProps) {
  const cfg = resolveJiraTypeConfig(type);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, ...style }}
      role="img"
      aria-label={cfg.label}
    >
      <rect x="1" y="1" width="14" height="14" rx="2" fill={cfg.color} />
      {cfg.renderInner(size)}
    </svg>
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