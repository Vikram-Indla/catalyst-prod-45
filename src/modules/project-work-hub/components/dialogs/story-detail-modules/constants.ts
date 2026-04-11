/**
 * StoryDetailModal — Constants
 * Extracted from StoryDetailModal.tsx for modularity
 */
import React from 'react';
import type { ColumnConfig, StatusCategory, TestResult, AIImproveType, PriorityLevel } from './types';

export const DEFAULT_COLUMNS: ColumnConfig = {
  status: true, assignee: true, priority: true, created: false, updated: true,
};

export const STATUS_CATEGORIES: Record<string, string[]> = {
  todo: ['Backlog', 'To Do', 'In Requirements', 'In Design', 'Ready for Development', 'Technical Validation'],
  in_progress: ['In Development', 'In Progress', 'In Review', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing', 'On Hold', 'Analysis', 'Blocked', 'Awaiting Info'],
  done: ['Production Ready', 'Beta Ready', 'In Production', 'Done', 'Closed'],
};

export const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  todo: { bg: '#F4F5F7', text: '#42526E' },
  in_progress: { bg: '#0052CC', text: '#FFFFFF' },
  done: { bg: '#36B37E', text: '#FFFFFF' },
  blocked: { bg: '#FF5630', text: '#FFFFFF' },
  on_hold: { bg: '#FF991F', text: '#FFFFFF' },
  in_uat: { bg: '#00B8D9', text: '#FFFFFF' },
  in_beta: { bg: '#36B37E', text: '#FFFFFF' },
  in_prod: { bg: '#006644', text: '#FFFFFF' },
  in_review: { bg: '#FF991F', text: '#FFFFFF' },
};

export const LOZENGE_STYLES: Record<'grey' | 'blue' | 'green', React.CSSProperties> = {
  grey:  { background: '#DFE1E6', color: '#253858' },
  blue:  { background: '#DEEBFF', color: '#0747A6' },
  green: { background: '#E3FCEF', color: '#006644' },
};

export const LOZENGE: Record<StatusCategory, React.CSSProperties> = {
  todo:        { background: '#DFE1E6', color: '#253858' },
  in_progress: { background: '#DEEBFF', color: '#0747A6' },
  done:        { background: '#E3FCEF', color: '#006644' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#FF5630', High: '#FF5630', Medium: '#FFAB00', Low: '#36B37E', Lowest: '#8993A4',
};

export const PRIORITY_STYLES: Record<string, { color: string; symbol: string }> = {
  Highest: { color: '#AE2A19', symbol: '▲▲' },
  High: { color: '#DE350B', symbol: '▲' },
  Medium: { color: '#D97706', symbol: '—' },
  Low: { color: '#36B37E', symbol: '▼' },
  Lowest: { color: '#6B778C', symbol: '▼▼' },
};

export const PRIORITY_ICONS: Record<string, string> = {
  Highest: '⬆⬆', High: '⬆', Medium: '→', Low: '⬇', Lowest: '⬇⬇',
};

export const PRIORITY_LIST: PriorityLevel[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export const TEST_RESULT_STYLES: Record<TestResult, React.CSSProperties> = {
  passed:  { background: '#E3FCEF', color: '#006644' },
  failed:  { background: '#FFEDEB', color: '#BF2600' },
  blocked: { background: '#FFF0B3', color: '#974F0C' },
  skipped: { background: '#DFE1E6', color: '#253858' },
  not_run: { background: '#F1F5F9', color: '#6B778C' },
};

export const LINK_TYPE_LABELS: Record<string, string> = {
  relates_to: 'Relates to', blocks: 'Blocks', is_blocked_by: 'Is blocked by',
  duplicates: 'Duplicates', is_duplicated_by: 'Is duplicated by',
  implements: 'Implements', is_implemented_by: 'Is implemented by',
  clones: 'Clones', is_cloned_by: 'Is cloned by',
  'relates to': 'Relates to', 'is blocked by': 'Is blocked by',
  'is duplicated by': 'Is duplicated by', 'is cloned by': 'Is cloned by',
};

export const LINK_TYPE_STYLES: Record<string, React.CSSProperties> = {
  blocks:           { background: '#FFEDEB', color: '#BF2600' },
  'is blocked by':  { background: '#FFEDEB', color: '#BF2600' },
  'relates to':     { background: '#FFF0B3', color: '#974F0C' },
  relates_to:       { background: '#FFF0B3', color: '#974F0C' },
  duplicates:       { background: '#FFEDEB', color: '#BF2600' },
  'is duplicated by': { background: '#F1F5F9', color: '#6B778C' },
  clones:           { background: '#EFF6FF', color: '#1D4ED8' },
  'is cloned by':   { background: '#EFF6FF', color: '#1D4ED8' },
};

export const LINK_TYPE_OPTIONS = [
  'is blocked by', 'blocks',
  'is BRD of', 'BRD',
  'is cloned by', 'clones',
  'is duplicated by', 'duplicates',
  'is implemented by', 'implements',
  'relates to',
];

export const STATUS_OPTION_GROUPS = [
  { groupLabel: 'TO DO', category: 'todo', statuses: STATUS_CATEGORIES.todo },
  { groupLabel: 'IN PROGRESS', category: 'in_progress', statuses: STATUS_CATEGORIES.in_progress },
  { groupLabel: 'DONE', category: 'done', statuses: STATUS_CATEGORIES.done },
];

export const WORK_ITEM_ICONS: Record<string, string> = {
  task: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/></svg>`,
  'Sub-task': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M13,11 L13,6 C13,5.44771525 12.5522847,5 12,5 L6,5 C5.44771525,5 5,5.44771525 5,6 L5,12 C5,12.5522847 5.44771525,13 6,13 L11,13 L11,18 C11,18.5522847 11.4477153,19 12,19 L18,19 C18.5522847,19 19,18.5522847 19,18 L19,12 C19,11.4477153 18.5522847,11 18,11 L13,11 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M7,7 L11,7 L11,11 L7,11 L7,7 Z M13,13 L17,13 L17,17 L13,17 L13,13 Z"/></svg>`,
  Frontend: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect fill="#2684FF" width="16" height="16" rx="2"/><g transform="translate(2.5,3)" fill="none" stroke="#FFF" stroke-width="1.2" stroke-linecap="round"><rect x="0.5" y="0.5" width="10" height="9" rx="1"/><line x1="0.5" y1="3" x2="10.5" y2="3"/><circle cx="2.5" cy="1.8" r="0.5" fill="#FFF" stroke="none"/><circle cx="4.2" cy="1.8" r="0.5" fill="#FFF" stroke="none"/></g></svg>`,
  Backend: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect fill="#2684FF" width="16" height="16" rx="2"/><g transform="translate(3,2.5)" fill="none" stroke="#FFF" stroke-width="1.2"><rect x="0.5" y="0.5" width="9" height="3" rx="1"/><rect x="0.5" y="5" width="9" height="3" rx="1"/><circle cx="2.5" cy="2" r="0.6" fill="#FFF" stroke="none"/><circle cx="2.5" cy="6.5" r="0.6" fill="#FFF" stroke="none"/><line x1="5" y1="8.5" x2="5" y2="10.5" stroke-linecap="round"/><line x1="3" y1="10.5" x2="7" y2="10.5" stroke-linecap="round"/></g></svg>`,
  Figma: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect fill="#A259FF" width="16" height="16" rx="2"/><g transform="translate(4,2)"><rect x="0" y="0" width="3.5" height="3.5" rx="1.75" fill="#FF7262"/><rect x="4.5" y="0" width="3.5" height="3.5" rx="1.75" fill="#F24E1E"/><rect x="0" y="4.5" width="3.5" height="3.5" rx="1.75" fill="#A259FF"/><circle cx="6.25" cy="6.25" r="1.75" fill="#1ABCFE"/><rect x="0" y="9" width="3.5" height="3.5" rx="1.75" fill="#0ACF83"/></g></svg>`,
  Integration: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect fill="#2684FF" width="16" height="16" rx="2"/><g transform="translate(3,3)" fill="none" stroke="#FFF" stroke-width="1.3" stroke-linecap="round"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="5" cy="8" r="1.5"/><line x1="3.2" y1="3" x2="4.2" y2="6.5"/><line x1="6.8" y1="3" x2="5.8" y2="6.5"/></g></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  'QA Bug': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  Defect: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  'Production Incident': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M8.82852964,12 L7.92252934,15 L16.0774707,15 L15.1714704,12 L8.82852964,12 Z M9.43252984,10 L14.5674702,10 L12.9572977,4.66830491 C12.8604893,4.34774733 12.6096616,4.09691963 12.289104,4.00011121 C11.7604031,3.84044348 11.20237,4.13960399 11.0427023,4.66830491 L9.43252984,10 Z M17,17 L7,17 L6,17 C5.44771525,17 5,17.4477153 5,18 L5,20 L19,20 L19,18 C19,17.4477153 18.5522847,17 18,17 L17,17 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  epic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect fill="#6554C0" width="16" height="16" rx="2"/><path fill="#FFF" d="M11.5 6.5H9.5V3.5C9.5 3.22 9.28 3 9 3H7C6.72 3 6.5 3.22 6.5 3.5V8H4.5C4.22 8 4.08 8.34 4.27 8.54L8.27 12.79C8.46 12.99 8.77 12.99 8.96 12.79L12.73 8.54C12.92 8.34 12.78 8 12.5 8H11.5V6.5Z"/></svg>`,
  story: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M15.6470004,19.5152539 L16.9369996,17.9868881 L12.0001502,13.8199984 L7.06117589,17.98674 L7,18.1534919 L7,6.68807648 C7,6.34797522 7.41227423,6 8,6 L16,6 C16.5865377,6 17,6.34873697 17,6.68807648 L17,18.1534919 L15.6470004,19.5152539 Z"/></svg>`,
};

export const AI_IMPROVE_OPTIONS: { value: AIImproveType; label: string }[] = [
  { value: 'improve_clarify', label: 'Improve & Clarify' },
  { value: 'expand_detail', label: 'Expand & Detail' },
  { value: 'add_acceptance_criteria', label: 'Add Acceptance Criteria' },
  { value: 'convert_user_story', label: 'Convert to User Story format' },
  { value: 'shorten_focus', label: 'Shorten & Focus' },
  { value: 'add_edge_cases', label: 'Add Edge Cases' },
];

export const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 14px',
  background: 'none', border: 'none', fontSize: 13, color: '#344054', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  textAlign: 'left',
};

export const detailLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 650, color: '#475467', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.04em',
};

export const detailValueStyle: React.CSSProperties = {
  fontSize: 13, color: '#101828', padding: '6px 0',
};
