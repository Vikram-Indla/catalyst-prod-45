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
 * ICON SOURCE: SVG files in /admin/icons/jira/
 * Icons are loaded as <img> from static SVG files, making them
 * dynamically swappable by replacing files in public/admin/icons/jira/.
 *
 * CANONICAL ICON SPEC (12 types, from Jira Atlassian reference):
 *   Epic             → #6554C0  Purple   (lightning bolt)
 *   Task             → #2684FF  Blue     (empty square)
 *   Story            → #36B37E  Green    (bookmark)
 *   Incident         → #FF5630  Red      (beacon/triangle)
 *   Bug              → #FF5630  Red      (filled circle)
 *   Problem          → #FF5630  Red      (circle with slash)
 *   Question         → #6554C0  Purple   (circle with ?)
 *   Changes          → #FFAB00  Amber    (bidirectional arrows)
 *   Issue            → #2684FF  Blue     (square with checkmark)
 *   New Feature      → #36B37E  Green    (plus sign)
 *   Improvement      → #36B37E  Green    (up arrow)
 *   Subtask          → #2684FF  Blue     (two overlapping squares)
 */

import React from 'react';

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
  backend: { label: 'Backend', color: '#2684FF', iconFile: 'subtask' },
  frontend: { label: 'Frontend', color: '#2684FF', iconFile: 'subtask' },
  integration: { label: 'Integration', color: '#2684FF', iconFile: 'subtask' },
  figma: { label: 'Figma', color: '#2684FF', iconFile: 'subtask' },
  'entity figma': { label: 'Entity FIGMA', color: '#2684FF', iconFile: 'subtask' },

  // ── Business Request: uses story ──
  'business request': {
    label: 'Business Request',
    color: '#36B37E',
    iconFile: 'story',
  },
};

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
 * Canonical Jira issue type icon component.
 * ALWAYS use this — never create local icon mappings.
 * 
 * Renders an <img> pointing to the SVG in /admin/icons/jira/.
 * To change an icon globally, replace the SVG file — no code changes needed.
 */
export function JiraIssueTypeIcon({ type, size = 16, className, style }: JiraIssueTypeIconProps) {
  const cfg = resolveJiraTypeConfig(type);
  // Use 16px SVG for sizes ≤ 16, 24px SVG for anything larger
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
