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

export type Hub = {
  id: string;
  name: string;
  route: string;
  tileColor: string;
  glyph: (label: string) => ReactNode;
  matcher: (pathname: string) => boolean;
};

const iconProps = (label: string) => ({ label, size: 'medium' as const, primaryColor: 'currentColor' });
const renderIcon = (Icon: React.ComponentType<any>, label: string) => createElement(Icon, iconProps(label));

export const HUBS: Hub[] = [
  { id: 'enterprise', name: 'Enterprise Hub', route: '/enterprise', tileColor: 'color.background.accent.purple.bolder', glyph: (label) => renderIcon(OfficeBuildingIcon, label), matcher: (p) => p.startsWith('/enterprise') || p.startsWith('/strategyhub') },
  { id: 'product', name: 'Product Room', route: '/product', tileColor: 'color.background.accent.blue.bolder', glyph: (label) => renderIcon(PortfolioIcon, label), matcher: (p) => p.startsWith('/product') || p.startsWith('/producthub') },
  { id: 'project', name: 'Project', route: '/project', tileColor: 'color.background.accent.teal.bolder', glyph: (label) => renderIcon(FolderIcon, label), matcher: (p) => p.startsWith('/project') || p.startsWith('/project-hub') },
  { id: 'release', name: 'Release', route: '/release', tileColor: 'color.background.accent.orange.bolder', glyph: (label) => renderIcon(ShipIcon, label), matcher: (p) => p.startsWith('/release') || p.startsWith('/release-hub') },
  { id: 'test', name: 'Test', route: '/test', tileColor: 'color.background.accent.green.bolder', glyph: (label) => renderIcon(TaskIcon, label), matcher: (p) => p.startsWith('/test') || p.startsWith('/testhub') },
  { id: 'incident', name: 'Incident', route: '/incident', tileColor: 'color.background.accent.red.bolder', glyph: (label) => renderIcon(WarningIcon, label), matcher: (p) => p.startsWith('/incident') || p.startsWith('/incident-hub') },
  { id: 'task', name: 'Task', route: '/task', tileColor: 'color.background.accent.yellow.bolder', glyph: (label) => renderIcon(CheckCircleIcon, label), matcher: (p) => p.startsWith('/task') || p.startsWith('/taskhub') || p.startsWith('/priorities') },
  { id: 'plan', name: 'Plan', route: '/plan', tileColor: 'color.background.accent.magenta.bolder', glyph: (label) => renderIcon(CalendarIcon, label), matcher: (p) => p.startsWith('/plan') || p.startsWith('/planhub') },
  { id: 'wiki', name: 'Wiki', route: '/wiki', tileColor: 'color.background.accent.lime.bolder', glyph: (label) => renderIcon(BookIcon, label), matcher: (p) => p.startsWith('/wiki') },
];

export function getActiveHub(pathname: string): Hub | null {
  return HUBS.find((hub) => hub.matcher(pathname)) ?? null;
}
