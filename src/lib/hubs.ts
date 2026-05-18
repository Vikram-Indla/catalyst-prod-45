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
// `/product` (not `/product`). Legacy `/product` stays in
// routeAliases below for back-compat; App.tsx adds a top-level redirect.
export const HUBS: Hub[] = [
  { id: 'enterprise', label: 'Strategy Hub', path: '/strategy', tileColor: 'purple', glyph: renderIcon(OfficeBuildingIcon, 'StrategyHub') },
  { id: 'product', label: 'Product Hub', path: '/product', tileColor: 'blue', glyph: renderIcon(PortfolioIcon, 'ProductHub') },
  { id: 'project', label: 'Project Hub', path: '/project', tileColor: 'teal', glyph: renderIcon(FolderIcon, 'ProjectHub') },
  { id: 'release', label: 'Release Hub', path: '/release/command-center', tileColor: 'orange', glyph: renderIcon(ShipIcon, 'ReleaseHub') },
  { id: 'test', label: 'Test Hub', path: '/test/dashboard', tileColor: 'green', glyph: renderIcon(TaskIcon, 'TestHub') },
  { id: 'incident', label: 'Incident Hub', path: '/incident', tileColor: 'red', glyph: renderIcon(WarningIcon, 'IncidentHub') },
  { id: 'task', label: 'Task Hub', path: '/task/boards', tileColor: 'yellow', glyph: renderIcon(CheckCircleIcon, 'TaskHub') },
  { id: 'plan', label: 'Plan Hub', path: '/plan', tileColor: 'magenta', glyph: renderIcon(CalendarIcon, 'PlanHub') },
  { id: 'wiki', label: 'Wiki Hub', path: '/wiki', tileColor: 'lime', glyph: renderIcon(BookIcon, 'WikiHub') },
];

const routeAliases: Record<string, string[]> = {
  enterprise: ['/enterprise', '/strategy'],
  product: ['/product', '/product'],
  project: ['/project', '/project'],
  release: ['/release', '/release'],
  test: ['/test', '/test'],
  incident: ['/incident', '/incident'],
  task: ['/task', '/task', '/priorities'],
  plan: ['/plan', '/plan'],
  wiki: ['/wiki'],
};

export function getActiveHub(pathname: string): Hub | null {
  return HUBS.find((hub) => routeAliases[hub.id]?.some((route) => pathname.startsWith(route))) ?? null;
}
