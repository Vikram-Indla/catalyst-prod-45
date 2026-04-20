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

export const HUBS: Hub[] = [
  { id: 'enterprise', label: 'Enterprise Hub', path: '/enterprise', tileColor: 'purple', glyph: renderIcon(OfficeBuildingIcon, 'Enterprise Hub') },
  { id: 'product', label: 'Product Room', path: '/product', tileColor: 'blue', glyph: renderIcon(PortfolioIcon, 'Product Room') },
  { id: 'project', label: 'Project', path: '/project', tileColor: 'teal', glyph: renderIcon(FolderIcon, 'Project') },
  { id: 'release', label: 'Release', path: '/release', tileColor: 'orange', glyph: renderIcon(ShipIcon, 'Release') },
  { id: 'test', label: 'Test', path: '/test', tileColor: 'green', glyph: renderIcon(TaskIcon, 'Test') },
  { id: 'incident', label: 'Incident', path: '/incident', tileColor: 'red', glyph: renderIcon(WarningIcon, 'Incident') },
  { id: 'task', label: 'Task', path: '/task', tileColor: 'yellow', glyph: renderIcon(CheckCircleIcon, 'Task') },
  { id: 'plan', label: 'Plan', path: '/plan', tileColor: 'magenta', glyph: renderIcon(CalendarIcon, 'Plan') },
  { id: 'wiki', label: 'Wiki', path: '/wiki', tileColor: 'lime', glyph: renderIcon(BookIcon, 'Wiki') },
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
