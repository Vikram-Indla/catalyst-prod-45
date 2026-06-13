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
 *   • project key        → avatar SVG asset URL
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

import businessRequestLight from '@/assets/icons/work-type/business-request.svg?url';
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

// ─── PROJECT AVATARS (SVG set — 2026-06-13) ───────────────────────────
//
// 18 canonical project keys each get a named SVG.
// All 20 SVGs also form the STOCK_AVATAR_REGISTRY rotation pool
// for new projects not yet in the registry.

import analyticsReporting from '@/assets/icons/project-avatars/analytics-reporting.svg?url';
import apiIntegration from '@/assets/icons/project-avatars/api-integration.svg?url';
import automationPipeline from '@/assets/icons/project-avatars/automation-pipeline.svg?url';
import cloudInfrastructure from '@/assets/icons/project-avatars/cloud-infrastructure.svg?url';
import customerPortal from '@/assets/icons/project-avatars/customer-portal.svg?url';
import dataMigration from '@/assets/icons/project-avatars/data-migration.svg?url';
import financeBudget from '@/assets/icons/project-avatars/finance-budget.svg?url';
import icpProject from '@/assets/icons/project-avatars/icp-project.svg?url';
import inspectionProject from '@/assets/icons/project-avatars/inspection-project.svg?url';
import ipImplementation from '@/assets/icons/project-avatars/ip-implementation.svg?url';
import irPlatform from '@/assets/icons/project-avatars/ir-platform.svg?url';
import marketingCampaign from '@/assets/icons/project-avatars/marketing-campaign.svg?url';
import mimWebsiteRevamp from '@/assets/icons/project-avatars/mim-website-revamp.svg?url';
import mobileApp from '@/assets/icons/project-avatars/mobile-app.svg?url';
import onboardingTraining from '@/assets/icons/project-avatars/onboarding-training.svg?url';
import productRoadmap from '@/assets/icons/project-avatars/product-roadmap.svg?url';
import researchDiscovery from '@/assets/icons/project-avatars/research-discovery.svg?url';
import securityCompliance from '@/assets/icons/project-avatars/security-compliance.svg?url';
import senaEiBau from '@/assets/icons/project-avatars/senaei-bau.svg?url';
import tahommena from '@/assets/icons/project-avatars/tahommena.svg?url';

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC TYPES
// ═══════════════════════════════════════════════════════════════════════

export type WorkItemType =
  | 'story' | 'task' | 'epic' | 'sub-task' | 'qa-bug'
  | 'feature' | 'change-request' | 'production-incident'
  | 'business-request' | 'business-gap' | 'api-requirement'
  | 'frontend' | 'backend' | 'integration' | 'figma';

export type PriorityLevel =
  | 'highest' | 'high' | 'medium' | 'low' | 'lowest' | 'none';

export type ProjectKey =
  | 'BAU' | 'DATA' | 'DET' | 'ESS' | 'FSM' | 'ICP' | 'IN' | 'INV'
  | 'IP' | 'IRP' | 'ISA' | 'MDT' | 'MIMI' | 'MWR' | 'SAPI' | 'SIMP'
  | 'SS' | 'TAH';

export type StockAvatarId =
  | 'analytics-reporting'
  | 'api-integration'
  | 'automation-pipeline'
  | 'cloud-infrastructure'
  | 'customer-portal'
  | 'data-migration'
  | 'finance-budget'
  | 'icp-project'
  | 'inspection-project'
  | 'ip-implementation'
  | 'ir-platform'
  | 'marketing-campaign'
  | 'mim-website-revamp'
  | 'mobile-app'
  | 'onboarding-training'
  | 'product-roadmap'
  | 'research-discovery'
  | 'security-compliance'
  | 'senaei-bau'
  | 'tahommena';

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
  'production-incident', 'business-request', 'business-gap', 'api-requirement',
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
  'business-request':    { id: 'business-request',    label: 'Business Request',    color: '#E2B203', light: businessRequestLight,    dark: businessRequestLight },
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
  BAU:  { key: 'BAU',  name: 'Senaei BAU',                  url: senaEiBau },
  DATA: { key: 'DATA', name: 'Data Migration',              url: dataMigration },
  DET:  { key: 'DET',  name: 'Digital Experience Team',     url: mobileApp },
  ESS:  { key: 'ESS',  name: 'Enterprise Shared Services',  url: cloudInfrastructure },
  FSM:  { key: 'FSM',  name: 'Field Service Management',    url: automationPipeline },
  ICP:  { key: 'ICP',  name: 'ICP Project',                 url: icpProject },
  IN:   { key: 'IN',   name: 'Inspection Project',          url: inspectionProject },
  INV:  { key: 'INV',  name: 'Investor360',                 url: analyticsReporting },
  IP:   { key: 'IP',   name: 'IP Implementation',           url: ipImplementation },
  IRP:  { key: 'IRP',  name: 'IR Platform',                 url: irPlatform },
  ISA:  { key: 'ISA',  name: 'Industry.sa',                 url: researchDiscovery },
  MDT:  { key: 'MDT',  name: 'MIM Digital Transformation',  url: productRoadmap },
  MIMI: { key: 'MIMI', name: 'MIM Internal Implementation', url: onboardingTraining },
  MWR:  { key: 'MWR',  name: 'MIM Website Revamp',          url: mimWebsiteRevamp },
  SAPI: { key: 'SAPI', name: 'SAP Implementation',          url: apiIntegration },
  SIMP: { key: 'SIMP', name: 'SS Implementation',           url: securityCompliance },
  SS:   { key: 'SS',   name: 'Sectorial Services',          url: financeBudget },
  TAH:  { key: 'TAH',  name: 'Tahommena',                   url: tahommena },
};

// All 20 icons in rotation order — new projects cycle through this pool.
// Order follows _index.json (project-named icons first, generic spares after).
export const STOCK_AVATAR_IDS: readonly StockAvatarId[] = [
  'senaei-bau',
  'mim-website-revamp',
  'ip-implementation',
  'inspection-project',
  'ir-platform',
  'tahommena',
  'icp-project',
  'product-roadmap',
  'data-migration',
  'analytics-reporting',
  'security-compliance',
  'mobile-app',
  'api-integration',
  'cloud-infrastructure',
  'customer-portal',
  'marketing-campaign',
  'finance-budget',
  'automation-pipeline',
  'onboarding-training',
  'research-discovery',
] as const;

export const STOCK_AVATAR_REGISTRY: Record<StockAvatarId, string> = {
  'analytics-reporting':  analyticsReporting,
  'api-integration':      apiIntegration,
  'automation-pipeline':  automationPipeline,
  'cloud-infrastructure': cloudInfrastructure,
  'customer-portal':      customerPortal,
  'data-migration':       dataMigration,
  'finance-budget':       financeBudget,
  'icp-project':          icpProject,
  'inspection-project':   inspectionProject,
  'ip-implementation':    ipImplementation,
  'ir-platform':          irPlatform,
  'marketing-campaign':   marketingCampaign,
  'mim-website-revamp':   mimWebsiteRevamp,
  'mobile-app':           mobileApp,
  'onboarding-training':  onboardingTraining,
  'product-roadmap':      productRoadmap,
  'research-discovery':   researchDiscovery,
  'security-compliance':  securityCompliance,
  'senaei-bau':           senaEiBau,
  'tahommena':            tahommena,
};

// ═══════════════════════════════════════════════════════════════════════
// ROTATION HELPER — deterministic stock icon for unknown project keys
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns a stock avatar id for a project key not in PROJECT_AVATAR_REGISTRY.
 * Uses a stable djb2-style hash so the same key always gets the same icon
 * across renders and sessions. New projects cycle through all 20 icons.
 */
export function pickStockAvatarForKey(projectKey: string): StockAvatarId {
  const hash = projectKey.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0);
  const index = Math.abs(hash) % STOCK_AVATAR_IDS.length;
  return STOCK_AVATAR_IDS[index];
}

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
  if (t.includes('business') && t.includes('request')) return 'business-request';
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
