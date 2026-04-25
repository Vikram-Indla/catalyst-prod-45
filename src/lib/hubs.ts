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
// CamelCase labels are the brand-locked spelling that appears in the top
// nav, the sidebar "Jump to" rail, breadcrumbs, and page titles. Paths
// match the primary alias each hub registers; routeAliases below covers
// the legacy short-form prefixes (/enterprise, /product, /project, ...)
// so existing routes keep resolving while we converge on the canonical
// path everywhere.
export const HUBS: Hub[] = [
  { id: 'enterprise', label: 'StrategyHub', path: '/strategyhub', tileColor: 'purple', glyph: renderIcon(OfficeBuildingIcon, 'StrategyHub') },
  { id: 'product', label: 'ProductHub', path: '/producthub', tileColor: 'blue', glyph: renderIcon(PortfolioIcon, 'ProductHub') },
  { id: 'project', label: 'ProjectHub', path: '/project-hub', tileColor: 'teal', glyph: renderIcon(FolderIcon, 'ProjectHub') },
  { id: 'release', label: 'ReleaseHub', path: '/release-hub/command-center', tileColor: 'orange', glyph: renderIcon(ShipIcon, 'ReleaseHub') },
  { id: 'test', label: 'TestHub', path: '/testhub/dashboard', tileColor: 'green', glyph: renderIcon(TaskIcon, 'TestHub') },
  { id: 'incident', label: 'IncidentHub', path: '/incident-hub', tileColor: 'red', glyph: renderIcon(WarningIcon, 'IncidentHub') },
  { id: 'task', label: 'TaskHub', path: '/taskhub/boards', tileColor: 'yellow', glyph: renderIcon(CheckCircleIcon, 'TaskHub') },
  { id: 'plan', label: 'PlanHub', path: '/planhub', tileColor: 'magenta', glyph: renderIcon(CalendarIcon, 'PlanHub') },
  { id: 'wiki', label: 'WikiHub', path: '/wiki', tileColor: 'lime', glyph: renderIcon(BookIcon, 'WikiHub') },
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
