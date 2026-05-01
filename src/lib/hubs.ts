import { createElement, type ReactNode } from 'react';
import OfficeBuildingIcon from '@atlaskit/icon/glyph/office-building';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import ShipIcon from '@atlaskit/icon/glyph/ship';
import TaskIcon from '@atlaskit/icon/glyph/task';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import BookIcon from '@atlaskit/icon/glyph/book';
import PortfolioIcon from '@atlaskit/icon/glyph/portfolio';

export type HubTileColor =
  | 'purple'
  | 'blue'
  | 'teal'
  | 'orange'
  | 'green'
  | 'red'
  | 'yellow'
  | 'magenta'
  | 'lime';

export interface Hub {
  id: string;
  label: string;
  path: string;
  tileColor: HubTileColor;
  glyph: ReactNode;
}

const iconProps = (label: string) => ({ label, size: 'medium' as const, primaryColor: 'currentColor' });
const renderIcon = (Icon: React.ComponentType<any>, label: string) => createElement(Icon, iconProps(label));

// Canonical hub names (CLAUDE.md §2 — Hub Architecture).
// Block A rule 7 (2026-05-01): canonical hub label is the spaced form
// ("Product Hub", not "ProductHub"). The earlier "brand-locked" CamelCase
// was producing a mismatch between sidebar label and the page <title>
// "Product Hub · Catalyst" (the title was already spaced). The glyph alt
// text keeps the CamelCase id so analytics keys aren't disturbed.
//
// Block A rule 1 (2026-05-01): Product Hub canonical URL prefix is
// `/product-hub` (not `/producthub`). Legacy `/producthub` stays in
// routeAliases below for back-compat; App.tsx adds a top-level redirect.
export const HUBS: Hub[] = [
  { id: 'enterprise', label: 'Strategy Hub', path: '/strategyhub', tileColor: 'purple', glyph: renderIcon(OfficeBuildingIcon, 'StrategyHub') },
  { id: 'product', label: 'Product Hub', path: '/product-hub', tileColor: 'blue', glyph: renderIcon(PortfolioIcon, 'ProductHub') },
  { id: 'project', label: 'Project Hub', path: '/project-hub', tileColor: 'teal', glyph: renderIcon(FolderIcon, 'ProjectHub') },
  { id: 'release', label: 'Release Hub', path: '/release-hub/command-center', tileColor: 'orange', glyph: renderIcon(ShipIcon, 'ReleaseHub') },
  { id: 'test', label: 'Test Hub', path: '/testhub/dashboard', tileColor: 'green', glyph: renderIcon(TaskIcon, 'TestHub') },
  { id: 'incident', label: 'Incident Hub', path: '/incident-hub', tileColor: 'red', glyph: renderIcon(WarningIcon, 'IncidentHub') },
  { id: 'task', label: 'Task Hub', path: '/taskhub/boards', tileColor: 'yellow', glyph: renderIcon(CheckCircleIcon, 'TaskHub') },
  { id: 'plan', label: 'Plan Hub', path: '/planhub', tileColor: 'magenta', glyph: renderIcon(CalendarIcon, 'PlanHub') },
  { id: 'wiki', label: 'Wiki Hub', path: '/wiki', tileColor: 'lime', glyph: renderIcon(BookIcon, 'WikiHub') },
];

const routeAliases: Record<string, string[]> = {
  enterprise: ['/enterprise', '/strategyhub'],
  product: ['/product', '/producthub'],
  project: ['/project', '/project-hub'],
  release: ['/release', '/release-hub'],
  test: ['/test', '/testhub'],
  incident: ['/incident', '/incident-hub'],
  task: ['/task', '/taskhub', '/priorities'],
  plan: ['/plan', '/planhub'],
  wiki: ['/wiki'],
};

export function getActiveHub(pathname: string): Hub | null {
  return HUBS.find((hub) => routeAliases[hub.id]?.some((route) => pathname.startsWith(route))) ?? null;
}
