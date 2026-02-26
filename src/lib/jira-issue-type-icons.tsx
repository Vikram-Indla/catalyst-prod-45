/**
 * ═══════════════════════════════════════════════════════════════════════
 * JIRA ISSUE TYPE ICONS — CANONICAL GUARDRAIL
 * ═══════════════════════════════════════════════════════════════════════
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for all Jira issue type icons
 * across the entire platform. Every component that renders an issue
 * type icon MUST import from this file.
 *
 * GUARDRAIL RULES:
 * 1. All icons are 16×16 SVG with rounded-square backgrounds
 * 2. Colors and shapes are LOCKED per the approved Jira icon spec
 * 3. DO NOT create local icon mappings in individual components
 * 4. DO NOT use emojis for issue types — Lucide/SVG only
 * 5. Any new issue type must be added HERE and nowhere else
 *
 * The icon visual spec (from Jira) is:
 *   Epic             → Purple (#904EE2)  lightning bolt
 *   Feature          → Blue (#4BADE8)    checkbox/check
 *   Story            → Amber (#D97706)   bookmark flag
 *   Business Gap     → Red (#E5493A)     exclamation square
 *   QA Bug           → Orange (#D97706)  bug silhouette
 *   Production Inc.  → Orange (#D97706)  circle with ?
 *   Change Request   → Blue (#4BADE8)    checkbox/check
 *   Task             → Blue (#4BADE8)    checkbox/check
 *   Sub-task         → Blue (#4BADE8)    nested checkbox
 *   API Requirement  → Teal (#0D9488)    code brackets
 *   Defect           → Red (#E5493A)     bug silhouette
 *   BRD Task         → Blue (#4BADE8)    checkbox/check
 *   Backend          → Purple (#904EE2)  code brackets
 *   Frontend         → Blue (#4BADE8)    layers
 *   Integration      → Teal (#0D9488)    link/plug
 *   Business Request → Blue (#2563EB)    document
 *   Entity FIGMA     → Pink (#EC4899)    pen tool
 *   Figma            → Pink (#EC4899)    pen tool
 */

import React from 'react';

// ─── TYPE CONFIG ─────────────────────────────────────────────────────

export interface JiraTypeConfig {
  label: string;
  color: string;       // background color of the rounded square
  /** SVG inner content (rendered inside a 16×16 viewBox) */
  renderInner: (size: number) => React.ReactNode;
}

const CONFIGS: Record<string, JiraTypeConfig> = {
  // ── Epic: purple lightning bolt ──
  epic: {
    label: 'Epic',
    color: '#904EE2',
    renderInner: () => (
      <path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white" />
    ),
  },

  // ── Feature: blue checkbox ──
  feature: {
    label: 'Feature',
    color: '#4BADE8',
    renderInner: () => (
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },

  // ── Story: amber/orange bookmark flag ──
  story: {
    label: 'Story',
    color: '#D97706',
    renderInner: () => (
      <path d="M5 3h6v10l-3-2-3 2V3z" fill="white" />
    ),
  },

  // ── Business Gap: red exclamation ──
  'business gap': {
    label: 'Business Gap',
    color: '#E5493A',
    renderInner: () => (
      <>
        <path d="M8 4v4.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="11" r="1.2" fill="white" />
      </>
    ),
  },

  // ── QA Bug: orange bug silhouette ──
  'qa bug': {
    label: 'QA Bug',
    color: '#D97706',
    renderInner: () => (
      <>
        {/* Antennae */}
        <path d="M5.5 5L4 3M10.5 5L12 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        {/* Head */}
        <circle cx="8" cy="5.5" r="2" fill="white" />
        {/* Body */}
        <path d="M5 7.5h6v3.5a3 3 0 0 1-6 0V7.5z" fill="white" />
        {/* Legs */}
        <path d="M5 9H3.5M11 9H12.5M5 11H3.5M11 11H12.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </>
    ),
  },

  // ── Production Incident: orange circle with ? ──
  'production incident': {
    label: 'Production Incident',
    color: '#D97706',
    renderInner: () => (
      <>
        <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5" fill="none" />
        <text x="8" y="10.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="sans-serif">?</text>
      </>
    ),
  },

  // ── Change Request: blue checkbox ──
  'change request': {
    label: 'Change Request',
    color: '#4BADE8',
    renderInner: () => (
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },

  // ── Task: blue checkbox ──
  task: {
    label: 'Task',
    color: '#4BADE8',
    renderInner: () => (
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },

  // ── Sub-task: blue nested checkbox ──
  'sub-task': {
    label: 'Sub-task',
    color: '#4BADE8',
    renderInner: () => (
      <>
        <rect x="4" y="4" width="8" height="8" rx="1" fill="#fff" opacity=".4" />
        <path d="M6 8.5l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  // ── API Requirement: teal code brackets ──
  'api requirement': {
    label: 'API Requirement',
    color: '#0D9488',
    renderInner: () => (
      <>
        <path d="M6 4.5L3.5 8L6 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M10 4.5L12.5 8L10 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M9 3.5L7 12.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </>
    ),
  },

  // ── Defect: red bug ──
  defect: {
    label: 'Defect',
    color: '#E5493A',
    renderInner: () => (
      <>
        <path d="M10 5.5a2 2 0 1 0-4 0v1h4v-1z" fill="white" />
        <path d="M5 8h6v2.5a3 3 0 0 1-6 0V8z" fill="white" />
      </>
    ),
  },

  // ── BRD Task: blue checkbox ──
  'brd task': {
    label: 'BRD Task',
    color: '#4BADE8',
    renderInner: () => (
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },

  // ── Backend: purple code ──
  backend: {
    label: 'Backend',
    color: '#904EE2',
    renderInner: () => (
      <>
        <path d="M6 4.5L3.5 8L6 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M10 4.5L12.5 8L10 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },

  // ── Frontend: blue layers ──
  frontend: {
    label: 'Frontend',
    color: '#4BADE8',
    renderInner: () => (
      <>
        <path d="M3 8l5 3 5-3" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 6l5 3 5-3" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
        <path d="M3 10l5 3 5-3" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".4" />
      </>
    ),
  },

  // ── Integration: teal plug ──
  integration: {
    label: 'Integration',
    color: '#0D9488',
    renderInner: () => (
      <>
        <path d="M5 8h6M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },

  // ── Business Request: blue document ──
  'business request': {
    label: 'Business Request',
    color: '#2563EB',
    renderInner: () => (
      <>
        <rect x="4" y="2" width="8" height="12" rx="1" fill="white" />
        <path d="M6 5h4M6 7.5h4M6 10h2.5" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
      </>
    ),
  },

  // ── Figma: pink pen tool ──
  figma: {
    label: 'Figma',
    color: '#EC4899',
    renderInner: () => (
      <path d="M8 3l4.5 4.5L8 12 3.5 7.5 8 3z" fill="white" />
    ),
  },

  // ── Entity FIGMA ──
  'entity figma': {
    label: 'Entity FIGMA',
    color: '#EC4899',
    renderInner: () => (
      <path d="M8 3l4.5 4.5L8 12 3.5 7.5 8 3z" fill="white" />
    ),
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

  // Fallback → Task style
  return {
    label: issueType || 'Unknown',
    color: '#64748B',
    renderInner: () => (
      <circle cx="8" cy="8" r="3" fill="white" />
    ),
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
 * Useful for left-border accents on cards.
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
