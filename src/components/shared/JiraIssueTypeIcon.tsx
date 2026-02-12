/**
 * JiraIssueTypeIcon — Official Jira-style issue type icons
 * Uses exact SVG paths from Atlassian's icon set.
 * This is the SINGLE SOURCE OF TRUTH for work item type icons across Catalyst.
 * 
 * Supported types: Epic, Story, Task, Sub-task, Defect, Bug, QA Bug,
 * Production Incident, Business Request, Change Request,
 * Frontend, Backend, Integration, BRD Task, API Requirement, Entity FIGMA, Figma, Business Gap
 */

import React from 'react';
import { cn } from '@/lib/utils';

// --- Official Jira icon configs (exact Atlassian SVG paths) ---

interface IconConfig {
  label: string;
  bgColor: string;
  render: (size: number) => React.ReactNode;
}

const EPIC_PATH = 'M5.9233,3.7566 L5.9213,3.7526 C5.9673,3.6776 6.0003,3.5946 6.0003,3.4996 C6.0003,3.2236 5.7763,2.9996 5.5003,2.9996 L3.0003,2.9996 L3.0003,0.4996 C3.0003,0.2236 2.7763,-0.0004 2.5003,-0.0004 C2.3283,-0.0004 2.1853,0.0916 2.0953,0.2226 C2.0673,0.2636 2.0443,0.3056 2.0293,0.3526 L0.0813,4.2366 L0.0833,4.2396 C0.0353,4.3166 0.0003,4.4026 0.0003,4.4996 C0.0003,4.7766 0.2243,4.9996 0.5003,4.9996 L3.0003,4.9996 L3.0003,7.4996 C3.0003,7.7766 3.2243,7.9996 3.5003,7.9996 C3.6793,7.9996 3.8293,7.9006 3.9183,7.7586 L3.9213,7.7596 L3.9343,7.7336 C3.9453,7.7126 3.9573,7.6936 3.9653,7.6716 L5.9233,3.7566 Z';

const STORY_PATH = 'M9,3 L5,3 C4.448,3 4,3.448 4,4 L4,10.5 C4,10.776 4.224,11 4.5,11 C4.675,11 4.821,10.905 4.91,10.769 L4.914,10.77 L6.84,8.54 C6.92,8.434 7.08,8.434 7.16,8.54 L9.086,10.77 L9.09,10.769 C9.179,10.905 9.325,11 9.5,11 C9.776,11 10,10.776 10,10.5 L10,4 C10,3.448 9.552,3 9,3';

const BUG_PATH = 'M10,7 C10,8.657 8.657,10 7,10 C5.343,10 4,8.657 4,7 C4,5.343 5.343,4 7,4 C8.657,4 10,5.343 10,7';

// Render functions for each icon shape
function renderEpic(size: number) {
  return (
    <g transform="translate(4, 3)">
      <path d={EPIC_PATH} fill="#FFFFFF" />
    </g>
  );
}

function renderStory(size: number) {
  return <path d={STORY_PATH} fill="#FFFFFF" />;
}

function renderTask(size: number) {
  return (
    <g transform="translate(4, 4.5)" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none">
      <path d="M2,5 L6,0" />
      <path d="M2,5 L0,3" />
    </g>
  );
}

function renderSubtask(size: number) {
  return (
    <g>
      <rect x="3" y="3" width="5" height="5" rx="0.8" stroke="#FFFFFF" fill="none" />
      <rect x="6" y="6" width="5" height="5" rx="0.8" stroke="#FFFFFF" fill="#FFFFFF" />
    </g>
  );
}

function renderBug(size: number) {
  return <path d={BUG_PATH} fill="#FFFFFF" />;
}

function renderIncident(size: number) {
  return (
    <g fill="none">
      <polygon points="7,3 12,11 2,11" fill="#FFFFFF" />
      {/* Exclamation mark in the bg color */}
      <line x1="7" y1="5.5" x2="7" y2="8" stroke="#FF5630" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="0.75" fill="#FF5630" />
    </g>
  );
}

// The master config map
const ICON_CONFIGS: Record<string, IconConfig> = {
  'Epic': { label: 'Epic', bgColor: '#904EE2', render: renderEpic },
  'Story': { label: 'Story', bgColor: '#63BA3C', render: renderStory },
  'Task': { label: 'Task', bgColor: '#4BADE8', render: renderTask },
  'Sub-task': { label: 'Sub-task', bgColor: '#4BAEE8', render: renderSubtask },
  'Defect': { label: 'Defect', bgColor: '#E5493A', render: renderBug },
  'Bug': { label: 'Bug', bgColor: '#E5493A', render: renderBug },
  'QA Bug': { label: 'QA Bug', bgColor: '#E5493A', render: renderBug },
  'Production Incident': { label: 'Incident', bgColor: '#FF5630', render: renderIncident },
  'Business Request': { label: 'Business Request', bgColor: '#00B8D9', render: renderStory },
  'Business Gap': { label: 'Business Gap', bgColor: '#00B8D9', render: renderStory },
  'Change Request': { label: 'Change Request', bgColor: '#FF991F', render: renderStory },
  // Sub-task variants all use the subtask icon
  'Frontend': { label: 'Frontend', bgColor: '#4BAEE8', render: renderSubtask },
  'Backend': { label: 'Backend', bgColor: '#4BAEE8', render: renderSubtask },
  'Integration': { label: 'Integration', bgColor: '#4BAEE8', render: renderSubtask },
  'BRD Task': { label: 'BRD Task', bgColor: '#4BAEE8', render: renderSubtask },
  'API Requirement': { label: 'API Requirement', bgColor: '#4BAEE8', render: renderSubtask },
  'Entity FIGMA': { label: 'Entity FIGMA', bgColor: '#4BAEE8', render: renderSubtask },
  'Figma': { label: 'Figma', bgColor: '#4BAEE8', render: renderSubtask },
};

// Fallback: generic task icon
const FALLBACK_CONFIG: IconConfig = {
  label: 'Unknown',
  bgColor: '#6B778C',
  render: renderTask,
};

// --- Component ---

interface JiraIssueTypeIconProps {
  issueType: string;
  size?: number;
  className?: string;
}

export function JiraIssueTypeIcon({ issueType, size = 16, className }: JiraIssueTypeIconProps) {
  const config = ICON_CONFIGS[issueType] || FALLBACK_CONFIG;
  const viewBox = '0 0 14 14';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', className)}
      aria-label={`${config.label} icon`}
    >
      <g transform="translate(1, 1)">
        <rect width="14" height="14" rx="2" fill={config.bgColor} />
        {config.render(size)}
      </g>
    </svg>
  );
}

/**
 * Get the background color for a given issue type (for badges, etc.)
 */
export function getIssueTypeBgColor(issueType: string): string {
  return (ICON_CONFIGS[issueType] || FALLBACK_CONFIG).bgColor;
}

/**
 * Get the display label for a given issue type
 */
export function getIssueTypeLabel(issueType: string): string {
  return (ICON_CONFIGS[issueType] || FALLBACK_CONFIG).label;
}

export default JiraIssueTypeIcon;
