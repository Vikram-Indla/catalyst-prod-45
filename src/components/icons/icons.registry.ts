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
import brdTaskLight from '@/assets/icons/work-type/brd-task.svg?url';
import uatFindingLight from '@/assets/icons/work-type/uat-finding.svg?url';
import releaseLight from '@/assets/icons/work-type/release.svg?url';
import testCaseLight from '@/assets/icons/work-type/test-case.svg?url';

import figmaDark from '@/assets/icons/work-type/_dark/figma.svg?url';
import brdTaskDark from '@/assets/icons/work-type/_dark/brd-task.svg?url';
import uatFindingDark from '@/assets/icons/work-type/_dark/uat-finding.svg?url';

// ─── PRIORITY ICONS ───────────────────────────────────────────────────

import priorityHighestLight from '@/assets/icons/priority/highest.svg?url';
import priorityHighLight from '@/assets/icons/priority/high.svg?url';
import priorityMediumLight from '@/assets/icons/priority/medium.svg?url';
import priorityLowLight from '@/assets/icons/priority/low.svg?url';
import priorityLowestLight from '@/assets/icons/priority/lowest.svg?url';
import priorityNoneLight from '@/assets/icons/priority/none.svg?url';

import priorityNoneDark from '@/assets/icons/priority/_dark/none.svg?url';

// ─── PROJECT AVATARS — original branded PNGs (restored 2026-06-13) ───
//
// These are the original per-project icons as commissioned/uploaded.
// They must NEVER be swapped for generic gradient SVGs — once a project
// has its icon, it is permanent (no rotation, no substitution).

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

// ─── STOCK AVATARS — gradient SVGs for new/unknown projects only ──────
//
// Used ONLY when a project key is NOT in PROJECT_AVATAR_REGISTRY.
// Never assigned to named projects — rotation is for genuinely new keys.

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

// ─── PRODUCT PLACE ICONS (Saudi landmarks — 2026-06-13) ──────────────
// 20 landmark SVGs used exclusively for product-line avatars.
// NOT shared with project avatars (which use the project-avatars/ set).

import placeKingdomCentre from '@/assets/icons/products/kingdom-centre.svg?url';
import placeFaisaliah from '@/assets/icons/products/faisaliah.svg?url';
import placeJeddahTower from '@/assets/icons/products/jeddah-tower.svg?url';
import placeKafd from '@/assets/icons/products/kafd.svg?url';
import placeMasmak from '@/assets/icons/products/masmak.svg?url';
import placeDiriyah from '@/assets/icons/products/diriyah.svg?url';
import placeNajdiTower from '@/assets/icons/products/najdi-tower.svg?url';
import placeRoshan from '@/assets/icons/products/roshan.svg?url';
import placeHegra from '@/assets/icons/products/hegra.svg?url';
import placeElephantRock from '@/assets/icons/products/elephant-rock.svg?url';
import placeFountain from '@/assets/icons/products/fountain.svg?url';
import placeIthra from '@/assets/icons/products/ithra.svg?url';
import placeNeom from '@/assets/icons/products/neom.svg?url';
import placeWaterTower from '@/assets/icons/products/water-tower.svg?url';
import placeTvTower from '@/assets/icons/products/tv-tower.svg?url';
import placeFerris from '@/assets/icons/products/ferris.svg?url';
import placeTuwaiq from '@/assets/icons/products/tuwaiq.svg?url';
import placeOasis from '@/assets/icons/products/oasis.svg?url';
import placeAsir from '@/assets/icons/products/asir.svg?url';
import placeEdge from '@/assets/icons/products/edge.svg?url';

// ─── HUB ICONS (SVG set — 2026-06-13) ────────────────────────────────

import hubHomeUrl from '@/assets/icons/hubs/home.svg?url';
import hubStrategyUrl from '@/assets/icons/hubs/strategy.svg?url';
import hubIdeationUrl from '@/assets/icons/hubs/ideation.svg?url';
import hubProductUrl from '@/assets/icons/hubs/product.svg?url';
import hubProjectUrl from '@/assets/icons/hubs/project.svg?url';
import hubReleaseUrl from '@/assets/icons/hubs/release.svg?url';
import hubTestUrl from '@/assets/icons/hubs/test.svg?url';
import hubIncidentUrl from '@/assets/icons/hubs/incident.svg?url';
import hubTaskUrl from '@/assets/icons/hubs/tasks.svg?url';
import hubPlanUrl from '@/assets/icons/hubs/plan.svg?url';
import hubWikiUrl from '@/assets/icons/hubs/wiki.svg?url';

import hubHomeOutlineUrl from '@/assets/icons/hubs/home-outline.svg?url';
import hubStrategyOutlineUrl from '@/assets/icons/hubs/strategy-outline.svg?url';
import hubIdeationOutlineUrl from '@/assets/icons/hubs/ideation-outline.svg?url';
import hubProductOutlineUrl from '@/assets/icons/hubs/product-outline.svg?url';
import hubProjectOutlineUrl from '@/assets/icons/hubs/project-outline.svg?url';
import hubReleaseOutlineUrl from '@/assets/icons/hubs/release-outline.svg?url';
import hubTestOutlineUrl from '@/assets/icons/hubs/test-outline.svg?url';
import hubIncidentOutlineUrl from '@/assets/icons/hubs/incident-outline.svg?url';
import hubTasksOutlineUrl from '@/assets/icons/hubs/tasks-outline.svg?url';
import hubPlanOutlineUrl from '@/assets/icons/hubs/plan-outline.svg?url';
import hubWikiOutlineUrl from '@/assets/icons/hubs/wiki-outline.svg?url';

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC TYPES
// ═══════════════════════════════════════════════════════════════════════

export type WorkItemType =
  | 'story' | 'task' | 'epic' | 'sub-task' | 'qa-bug'
  | 'feature' | 'change-request' | 'production-incident'
  | 'business-request' | 'business-gap' | 'api-requirement'
  | 'frontend' | 'backend' | 'integration' | 'figma'
  | 'brd-task' | 'uat-finding' | 'release' | 'test-case';

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
  'brd-task', 'uat-finding', 'release',
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
  'business-request':    { id: 'business-request',    label: 'Business Request',    color: 'var(--ds-text-warning, #E2B203)',   light: businessRequestLight,    dark: businessRequestLight },
  'story':               { id: 'story',               label: 'Story',               color: 'var(--ds-text-success, #6A9A23)',   light: storyLight,               dark: storyLight },
  'task':                { id: 'task',                label: 'Task',                color: 'var(--ds-link, #1868DB)',           light: taskLight,                dark: taskLight },
  'epic':                { id: 'epic',                label: 'Epic',                color: 'var(--ds-text-discovery, #AF59E1)', light: epicLight,                dark: epicLight },
  'sub-task':            { id: 'sub-task',            label: 'Sub-task',            color: 'var(--ds-link, #1868DB)',           light: subTaskLight,             dark: subTaskLight },
  'qa-bug':              { id: 'qa-bug',              label: 'QA Bug',              color: 'var(--ds-text-danger, #AE2E24)',    light: qaBugLight,               dark: qaBugLight },
  'feature':             { id: 'feature',             label: 'Feature',             color: 'var(--ds-link, #1868DB)',           light: featureLight,             dark: featureLight },
  'change-request':      { id: 'change-request',      label: 'Change Request',      color: 'var(--ds-link, #1868DB)',           light: changeRequestLight,       dark: changeRequestLight },
  'production-incident': { id: 'production-incident', label: 'Production Incident', color: 'var(--ds-text-warning, #E06C00)',   light: productionIncidentLight,  dark: productionIncidentLight },
  'business-gap':        { id: 'business-gap',        label: 'Business Gap',        color: 'var(--ds-text-discovery, #6554C0)', light: businessGapLight,         dark: businessGapLight },
  'api-requirement':     { id: 'api-requirement',     label: 'API Requirement',     color: 'var(--ds-text-success, #6A9A23)',   light: apiRequirementLight,      dark: apiRequirementLight },
  'frontend':            { id: 'frontend',            label: 'Frontend',            color: 'var(--ds-link, #1868DB)',           light: frontendLight,            dark: frontendLight },
  'backend':             { id: 'backend',             label: 'Backend',             color: 'var(--ds-link, #1868DB)',           light: backendLight,             dark: backendLight },
  'integration':         { id: 'integration',         label: 'Integration',         color: 'var(--ds-link, #1868DB)',           light: integrationLight,         dark: integrationLight },
  'figma':               { id: 'figma',               label: 'Figma',               color: 'var(--ds-text, #292A2E)',           light: figmaLight,               dark: figmaDark },
  'brd-task':            { id: 'brd-task',            label: 'BRD Task',            color: 'var(--ds-text-discovery, #6554C0)', light: brdTaskLight,             dark: brdTaskDark },
  'uat-finding':         { id: 'uat-finding',         label: 'UAT Finding',         color: 'var(--ds-text-discovery, #6554C0)', light: uatFindingLight,          dark: uatFindingDark },
  'release':             { id: 'release',             label: 'Release',             color: 'var(--ds-icon-success, #0C7A6D)',                            light: releaseLight,             dark: releaseLight },
  'test-case':           { id: 'test-case',           label: 'Test Case',           color: 'var(--ds-text-success, #1F845A)',   light: testCaseLight,            dark: testCaseLight },
};

export const PRIORITY_REGISTRY: Record<PriorityLevel, PriorityMeta> = {
  highest: { id: 'highest', label: 'Highest', color: 'var(--ds-text-danger, #C9372C)',  light: priorityHighestLight, dark: priorityHighestLight },
  high:    { id: 'high',    label: 'High',    color: 'var(--ds-text-danger, #C9372C)',  light: priorityHighLight,    dark: priorityHighLight },
  medium:  { id: 'medium',  label: 'Medium',  color: 'var(--ds-text-warning, #E06C00)', light: priorityMediumLight,  dark: priorityMediumLight },
  low:     { id: 'low',     label: 'Low',     color: 'var(--ds-link, #1868DB)',         light: priorityLowLight,     dark: priorityLowLight },
  lowest:  { id: 'lowest',  label: 'Lowest',  color: 'var(--ds-link, #1868DB)',         light: priorityLowestLight,  dark: priorityLowestLight },
  none:    { id: 'none',    label: 'None',    color: 'var(--ds-text, #080F21)',         light: priorityNoneLight,    dark: priorityNoneDark },
};

export const PROJECT_AVATAR_REGISTRY: Record<ProjectKey, ProjectAvatarMeta> = {
  BAU:  { key: 'BAU',  name: 'Senaei BAU',                  url: bauAvatar },
  DATA: { key: 'DATA', name: 'Data Migration',              url: dataAvatar },
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
// HUB ICON REGISTRY
// ═══════════════════════════════════════════════════════════════════════

export type HubKey =
  | 'home' | 'strategy' | 'ideation' | 'product' | 'project'
  | 'release' | 'test' | 'incident' | 'task' | 'plan' | 'wiki';

export const HUB_ICON_REGISTRY: Record<HubKey, string> = {
  home:     hubHomeUrl,
  strategy: hubStrategyUrl,
  ideation: hubIdeationUrl,
  product:  hubProductUrl,
  project:  hubProjectUrl,
  release:  hubReleaseUrl,
  test:     hubTestUrl,
  incident: hubIncidentUrl,
  task:     hubTaskUrl,
  plan:     hubPlanUrl,
  wiki:     hubWikiUrl,
};

export const HUB_ICON_OUTLINE_REGISTRY: Record<HubKey, string> = {
  home:     hubHomeOutlineUrl,
  strategy: hubStrategyOutlineUrl,
  ideation: hubIdeationOutlineUrl,
  product:  hubProductOutlineUrl,
  project:  hubProjectOutlineUrl,
  release:  hubReleaseOutlineUrl,
  test:     hubTestOutlineUrl,
  incident: hubIncidentOutlineUrl,
  task:     hubTasksOutlineUrl,
  plan:     hubPlanOutlineUrl,
  wiki:     hubWikiOutlineUrl,
};

// ═══════════════════════════════════════════════════════════════════════
// PRODUCT PLACE REGISTRY — Saudi landmark avatars for product lines
// ═══════════════════════════════════════════════════════════════════════

/** All 20 Saudi-landmark place slugs (kebab-case). */
export type PlaceId =
  | 'kingdom-centre'
  | 'faisaliah'
  | 'jeddah-tower'
  | 'kafd'
  | 'masmak'
  | 'diriyah'
  | 'najdi-tower'
  | 'roshan'
  | 'hegra'
  | 'elephant-rock'
  | 'fountain'
  | 'ithra'
  | 'neom'
  | 'water-tower'
  | 'tv-tower'
  | 'ferris'
  | 'tuwaiq'
  | 'oasis'
  | 'asir'
  | 'edge';

/** Rotation order for new products — most recognisable landmarks first. */
export const STOCK_PLACE_IDS: readonly PlaceId[] = [
  'kingdom-centre',
  'kafd',
  'jeddah-tower',
  'faisaliah',
  'ithra',
  'masmak',
  'diriyah',
  'hegra',
  'neom',
  'elephant-rock',
  'fountain',
  'ferris',
  'tuwaiq',
  'oasis',
  'asir',
  'roshan',
  'najdi-tower',
  'water-tower',
  'tv-tower',
  'edge',
] as const;

export const STOCK_PLACE_REGISTRY: Record<PlaceId, string> = {
  'kingdom-centre': placeKingdomCentre,
  'faisaliah':      placeFaisaliah,
  'jeddah-tower':   placeJeddahTower,
  'kafd':           placeKafd,
  'masmak':         placeMasmak,
  'diriyah':        placeDiriyah,
  'najdi-tower':    placeNajdiTower,
  'roshan':         placeRoshan,
  'hegra':          placeHegra,
  'elephant-rock':  placeElephantRock,
  'fountain':       placeFountain,
  'ithra':          placeIthra,
  'neom':           placeNeom,
  'water-tower':    placeWaterTower,
  'tv-tower':       placeTvTower,
  'ferris':         placeFerris,
  'tuwaiq':         placeTuwaiq,
  'oasis':          placeOasis,
  'asir':           placeAsir,
  'edge':           placeEdge,
};

/**
 * Maps known product codes to their assigned Saudi landmark.
 * New products not listed here get a stable rotation via getProductAvatarUrl().
 */
export const KNOWN_PRODUCT_PLACES: Record<string, PlaceId> = {
  INV: 'elephant-rock', // Investor Journey Product → Elephant Rock (amber-gold; kingdom-centre was Catalyst blue)
};

/**
 * Returns the bundled SVG URL for a product code.
 * Known products get their assigned landmark; unknown products get a stable
 * djb2 rotation through all 20 — so the 21st product wraps back around.
 */
export function getProductAvatarUrl(productCode: string): string {
  const upper = productCode.toUpperCase();
  if (upper in KNOWN_PRODUCT_PLACES) {
    return STOCK_PLACE_REGISTRY[KNOWN_PRODUCT_PLACES[upper]];
  }
  const hash = upper.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0);
  const index = Math.abs(hash) % STOCK_PLACE_IDS.length;
  return STOCK_PLACE_REGISTRY[STOCK_PLACE_IDS[index]];
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
  if (t.includes('brd')) return 'brd-task';
  if (t.includes('uat')) return 'uat-finding';
  if (t === 'release') return 'release';
  if (t === 'test case' || t === 'test-case' || t === 'testcase' || t === 'test') return 'test-case';

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
