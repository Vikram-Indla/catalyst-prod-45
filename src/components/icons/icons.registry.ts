/**
 * ═══════════════════════════════════════════════════════════════════════
 * CATALYST ICON REGISTRY — CANONICAL TYPED LOOKUP
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Code word: "RESET ICONS"
 *
 * Single source of truth for resolving:
 *   • work-item-type id  → SVG asset URL (light + optional dark variant)
 *   • priority level     → SVG asset URL (light + optional dark variant)
 *   • project key        → avatar PNG asset URL
 *
 * Engineers MUST consume icons via this registry — never import from
 * src/assets/icons/** directly. The registry is the seam where:
 *   - Vite ?url imports resolve at build time
 *   - Light/dark variants are paired
 *   - Jira-side aliases (e.g. "Bug" → "qa-bug") are normalized
 *   - Future codegen from manifest.json plugs in
 *   - Runtime overrides from /admin/icons (useIconOverrides) are merged
 *
 * Companion files:
 *   src/assets/icons/manifest.json          — machine-readable index
 *   src/assets/icons/README.md              — operating contract
 *   src/components/icons/WorkItemTypeIcon.tsx
 *   src/components/icons/PriorityIcon.tsx
 *   src/components/icons/ProjectAvatar.tsx
 *   src/components/icons/useIconOverrides.ts — runtime override hook
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── WORK-TYPE ICONS ──────────────────────────────────────────────────

import storyLight from '@/assets/icons/work-type/story.svg?url';
import taskLight from '@/assets/icons/work-type/task.svg?url';
import epicLight from '@/assets/icons/work-type/epic.svg?url';
import subTaskLight from '@/assets/icons/work-type/sub-task.svg?url';
import qaBugLight from '@/assets/icons/work-type/qa-bug.svg?url';
import featureLight from '@/assets/icons/work-type/feature.svg?url';
import changeRequestLight from '@/assets/icons/work-type/change-request.svg?url';
import productionIncidentLight from '@/assets/icons/work-type/production-incident.svg?url';
import businessGapLight from '@/assets/icons/work-type/business-gap.svg?url';
import apiRequirementLight from '@/assets/icons/work-type/api-requirement.svg?url';
import frontendLight from '@/assets/icons/work-type/frontend.svg?url';
import backendLight from '@/assets/icons/work-type/backend.svg?url';
import integrationLight from '@/assets/icons/work-type/integration.svg?url';
import figmaLight from '@/assets/icons/work-type/figma.svg?url';

import figmaDark from '@/assets/icons/work-type/_dark/figma.svg?url';

// ─── PRIORITY ICONS ───────────────────────────────────────────────────

import priorityHighestLight from '@/assets/icons/priority/highest.svg?url';
import priorityHighLight from '@/assets/icons/priority/high.svg?url';
import priorityMediumLight from '@/assets/icons/priority/medium.svg?url';
import priorityLowLight from '@/assets/icons/priority/low.svg?url';
import priorityLowestLight from '@/assets/icons/priority/lowest.svg?url';
import priorityNoneLight from '@/assets/icons/priority/none.svg?url';

import priorityNoneDark from '@/assets/icons/priority/_dark/none.svg?url';

// ─── PROJECT AVATARS ──────────────────────────────────────────────────

import bauAvatar from '@/assets/icons/project-avatars/BAU.png?url';
import dataAvatar from '@/assets/icons/project-avatars/DATA.png?url';
import detAvatar from '@/assets/icons/project-avatars/DET.png?url';
import essAvatar from '@/assets/icons/project-avatars/ESS.png?url';
import fsmAvatar from '@/assets/icons/project-avatars/FSM.png?url';
import icpAvatar from '@/assets/icons/project-avatars/ICP.png?url';
import inAvatar from '@/assets/icons/project-avatars/IN.png?url';
import invAvatar from '@/assets/icons/project-avatars/INV.png?url';
import ipAvatar from '@/assets/icons/project-avatars/IP.png?url';
import irpAvatar from '@/assets/icons/project-avatars/IRP.png?url';
import isaAvatar from '@/assets/icons/project-avatars/ISA.png?url';
import mdtAvatar from '@/assets/icons/project-avatars/MDT.png?url';
import mimiAvatar from '@/assets/icons/project-avatars/MIMI.png?url';
import mwrAvatar from '@/assets/icons/project-avatars/MWR.png?url';
import sapiAvatar from '@/assets/icons/project-avatars/SAPI.png?url';
import simpAvatar from '@/assets/icons/project-avatars/SIMP.png?url';
import ssAvatar from '@/assets/icons/project-avatars/SS.png?url';
import tahAvatar from '@/assets/icons/project-avatars/TAH.png?url';

import stockUfo from '@/assets/icons/project-avatars/_stock/ufo.png?url';
import stockParrot from '@/assets/icons/project-avatars/_stock/parrot.png?url';
import stockCoffee from '@/assets/icons/project-avatars/_stock/coffee.png?url';
import stockHotDog from '@/assets/icons/project-avatars/_stock/hot-dog.png?url';
import stockKoala from '@/assets/icons/project-avatars/_stock/koala.png?url';
import stockFlask from '@/assets/icons/project-avatars/_stock/flask.png?url';
import stockStormCloud from '@/assets/icons/project-avatars/_stock/storm-cloud.png?url';
import stockYeti from '@/assets/icons/project-avatars/_stock/yeti.png?url';

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC TYPES
// ═══════════════════════════════════════════════════════════════════════

export type WorkItemType =
  | 'story' | 'task' | 'epic' | 'sub-task' | 'qa-bug'
  | 'feature' | 'change-request' | 'production-incident'
  | 'business-gap' | 'api-requirement'
  | 'frontend' | 'backend' | 'integration' | 'figma';

export type PriorityLevel =
  | 'highest' | 'high' | 'medium' | 'low' | 'lowest' | 'none';

export type ProjectKey =
  | 'BAU' | 'DATA' | 'DET' | 'ESS' | 'FSM' | 'ICP' | 'IN' | 'INV'
  | 'IP' | 'IRP' | 'ISA' | 'MDT' | 'MIMI' | 'MWR' | 'SAPI' | 'SIMP'
  | 'SS' | 'TAH';

export type StockAvatarId =
  | 'ufo' | 'parrot' | 'coffee' | 'hot-dog' | 'koala'
  | 'flask' | 'storm-cloud' | 'yeti';

export interface WorkTypeMeta {
  id: WorkItemType;
  label: string;
  color: string;
  light: string;
  dark: string;
}

export interface PriorityMeta {
  id: PriorityLevel;
  label: string;
  color: string;
  light: string;
  dark: string;
}

export interface ProjectAvatarMeta {
  key: ProjectKey;
  name: string;
  url: string;
}

export const WORK_ITEM_TYPES: readonly WorkItemType[] = [
  'story', 'task', 'epic', 'sub-task', 'qa-bug', 'feature', 'change-request',
  'production-incident', 'business-gap', 'api-requirement',
  'frontend', 'backend', 'integration', 'figma',
] as const;

export const PRIORITY_LEVELS: readonly PriorityLevel[] = [
  'highest', 'high', 'medium', 'low', 'lowest', 'none',
] as const;

export const PROJECT_KEYS: readonly ProjectKey[] = [
  'BAU', 'DATA', 'DET', 'ESS', 'FSM', 'ICP', 'IN', 'INV', 'IP', 'IRP',
  'ISA', 'MDT', 'MIMI', 'MWR', 'SAPI', 'SIMP', 'SS', 'TAH',
] as const;

// ═══════════════════════════════════════════════════════════════════════
// REGISTRY MAPS — bundled compile-time URLs
// ═══════════════════════════════════════════════════════════════════════

export const WORK_TYPE_REGISTRY: Record<WorkItemType, WorkTypeMeta> = {
  'story':               { id: 'story',               label: 'Story',               color: '#6A9A23', light: storyLight,               dark: storyLight },
  'task':                { id: 'task',                label: 'Task',                color: '#1868DB', light: taskLight,                dark: taskLight },
  'epic':                { id: 'epic',                label: 'Epic',                color: '#AF59E1', light: epicLight,                dark: epicLight },
  'sub-task':            { id: 'sub-task',            label: 'Sub-task',            color: '#1868DB', light: subTaskLight,             dark: subTaskLight },
  'qa-bug':              { id: 'qa-bug',              label: 'QA Bug',              color: '#AE2E24', light: qaBugLight,               dark: qaBugLight },
  'feature':             { id: 'feature',             label: 'Feature',             color: '#1868DB', light: featureLight,             dark: featureLight },
  'change-request':      { id: 'change-request',      label: 'Change Request',      color: '#1868DB', light: changeRequestLight,       dark: changeRequestLight },
  'production-incident': { id: 'production-incident', label: 'Production Incident', color: '#E06C00', light: productionIncidentLight,  dark: productionIncidentLight },
  'business-gap':        { id: 'business-gap',        label: 'Business Gap',        color: '#C9372C', light: businessGapLight,         dark: businessGapLight },
  'api-requirement':     { id: 'api-requirement',     label: 'API Requirement',     color: '#6A9A23', light: apiRequirementLight,      dark: apiRequirementLight },
  'frontend':            { id: 'frontend',            label: 'Frontend',            color: '#1868DB', light: frontendLight,            dark: frontendLight },
  'backend':             { id: 'backend',             label: 'Backend',             color: '#1868DB', light: backendLight,             dark: backendLight },
  'integration':         { id: 'integration',         label: 'Integration',         color: '#1868DB', light: integrationLight,         dark: integrationLight },
  'figma':               { id: 'figma',               label: 'Figma',               color: '#292A2E', light: figmaLight,               dark: figmaDark },
};

export const PRIORITY_REGISTRY: Record<PriorityLevel, PriorityMeta> = {
  highest: { id: 'highest', label: 'Highest', color: '#C9372C', light: priorityHighestLight, dark: priorityHighestLight },
  high:    { id: 'high',    label: 'High',    color: '#C9372C', light: priorityHighLight,    dark: priorityHighLight },
  medium:  { id: 'medium',  label: 'Medium',  color: '#E06C00', light: priorityMediumLight,  dark: priorityMediumLight },
  low:     { id: 'low',     label: 'Low',     color: '#1868DB', light: priorityLowLight,     dark: priorityLowLight },
  lowest:  { id: 'lowest',  label: 'Lowest',  color: '#1868DB', light: priorityLowestLight,  dark: priorityLowestLight },
  none:    { id: 'none',    label: 'None',    color: '#080F21', light: priorityNoneLight,    dark: priorityNoneDark },
};

export const PROJECT_AVATAR_REGISTRY: Record<ProjectKey, ProjectAvatarMeta> = {
  BAU:  { key: 'BAU',  name: 'Senaei BAU',                  url: bauAvatar },
  DATA: { key: 'DATA', name: 'DATA Project',                url: dataAvatar },
  DET:  { key: 'DET',  name: 'Digital Experience Team',     url: detAvatar },
  ESS:  { key: 'ESS',  name: 'Enterprise Shared Services',  url: essAvatar },
  FSM:  { key: 'FSM',  name: 'Field Service Management',    url: fsmAvatar },
  ICP:  { key: 'ICP',  name: 'ICP Project',                 url: icpAvatar },
  IN:   { key: 'IN',   name: 'Inspection Project',          url: inAvatar },
  INV:  { key: 'INV',  name: 'Investor360',                 url: invAvatar },
  IP:   { key: 'IP',   name: 'IP Implementation',           url: ipAvatar },
  IRP:  { key: 'IRP',  name: 'IR Platform',                 url: irpAvatar },
  ISA:  { key: 'ISA',  name: 'Industry.sa',                 url: isaAvatar },
  MDT:  { key: 'MDT',  name: 'MIM Digital Transformation',  url: mdtAvatar },
  MIMI: { key: 'MIMI', name: 'MIM Internal Implementation', url: mimiAvatar },
  MWR:  { key: 'MWR',  name: 'MIM Website Revamp',          url: mwrAvatar },
  SAPI: { key: 'SAPI', name: 'SAP Implementation',          url: sapiAvatar },
  SIMP: { key: 'SIMP', name: 'SS Implementation',           url: simpAvatar },
  SS:   { key: 'SS',   name: 'Sectorial Services',          url: ssAvatar },
  TAH:  { key: 'TAH',  name: 'Tahommena',                   url: tahAvatar },
};

export const STOCK_AVATAR_REGISTRY: Record<StockAvatarId, string> = {
  'ufo':         stockUfo,
  'parrot':      stockParrot,
  'coffee':      stockCoffee,
  'hot-dog':     stockHotDog,
  'koala':       stockKoala,
  'flask':       stockFlask,
  'storm-cloud': stockStormCloud,
  'yeti':        stockYeti,
};

// ═══════════════════════════════════════════════════════════════════════
// JIRA-SIDE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════

export function normalizeWorkItemType(raw: string | null | undefined): WorkItemType | null {
  if (!raw) return null;
  const t = raw.toLowerCase().trim();

  if (t in WORK_TYPE_REGISTRY) return t as WorkItemType;

  if (t.includes('production') && t.includes('incident')) return 'production-incident';
  if (t === 'incident') return 'production-incident';
  if (t.includes('qa') && t.includes('bug')) return 'qa-bug';
  if (t === 'bug' || t === 'defect') return 'qa-bug';
  if (t.includes('change') && t.includes('request')) return 'change-request';
  if (t.includes('business') && t.includes('gap')) return 'business-gap';
  if (t.includes('api') && t.includes('requirement')) return 'api-requirement';
  if (t.includes('sub-task') || t.includes('subtask') || t === 'sub task') return 'sub-task';
  if (t === 'new feature' || t === 'newfeature') return 'feature';
  if (t === 'story') return 'story';
  if (t === 'epic') return 'epic';
  if (t === 'task') return 'task';
  if (t === 'feature') return 'feature';
  if (t === 'frontend') return 'frontend';
  if (t === 'backend') return 'backend';
  if (t === 'integration') return 'integration';
  if (t === 'figma' || t === 'entity figma') return 'figma';

  return null;
}

export function normalizePriority(raw: string | null | undefined): PriorityLevel {
  if (!raw) return 'none';
  const p = raw.toLowerCase().trim();
  if (p in PRIORITY_REGISTRY) return p as PriorityLevel;
  if (p === 'critical' || p === 'blocker' || p === 'urgent') return 'highest';
  if (p === 'minor' || p === 'trivial') return 'lowest';
  return 'none';
}
