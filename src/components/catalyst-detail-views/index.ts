/**
 * Catalyst Detail Views — Barrel exports.
 *
 * Usage:
 *   import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';
 *   import { CatalystViewStory } from '@/components/catalyst-detail-views/story';
 *   import { CatalystViewEpic } from '@/components/catalyst-detail-views/epic';
 *   import { CatalystViewDefect } from '@/components/catalyst-detail-views/defect';
 *   import { CatalystViewIncident } from '@/components/catalyst-detail-views/incident';
 *   import { CatalystViewTask } from '@/components/catalyst-detail-views/task';
 */

export { default as CatalystDetailRouter } from './CatalystDetailRouter';
export { resolveItemType } from './CatalystDetailRouter';
export { CatalystViewBase } from './shared/CatalystViewBase';
export type { CatalystViewBaseProps, CatalystDetailRouterProps, CatalystItemType } from './shared/types';
