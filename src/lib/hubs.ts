import type { ReactNode } from 'react';
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

export const HUBS: Hub[] = [
  { id: 'enterprise', name: 'Enterprise Hub', route: '/enterprise', tileColor: 'color.background.accent.purple.bolder', glyph: (label) => <OfficeBuildingIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/enterprise') || p.startsWith('/strategyhub') },
  { id: 'product', name: 'Product Room', route: '/product', tileColor: 'color.background.accent.blue.bolder', glyph: (label) => <PortfolioIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/product') || p.startsWith('/producthub') },
  { id: 'project', name: 'Project', route: '/project', tileColor: 'color.background.accent.teal.bolder', glyph: (label) => <FolderIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/project') || p.startsWith('/project-hub') },
  { id: 'release', name: 'Release', route: '/release', tileColor: 'color.background.accent.orange.bolder', glyph: (label) => <ShipIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/release') || p.startsWith('/release-hub') },
  { id: 'test', name: 'Test', route: '/test', tileColor: 'color.background.accent.green.bolder', glyph: (label) => <TaskIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/test') || p.startsWith('/testhub') },
  { id: 'incident', name: 'Incident', route: '/incident', tileColor: 'color.background.accent.red.bolder', glyph: (label) => <WarningIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/incident') || p.startsWith('/incident-hub') },
  { id: 'task', name: 'Task', route: '/task', tileColor: 'color.background.accent.yellow.bolder', glyph: (label) => <CheckCircleIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/task') || p.startsWith('/taskhub') || p.startsWith('/priorities') },
  { id: 'plan', name: 'Plan', route: '/plan', tileColor: 'color.background.accent.magenta.bolder', glyph: (label) => <CalendarIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/plan') || p.startsWith('/planhub') },
  { id: 'wiki', name: 'Wiki', route: '/wiki', tileColor: 'color.background.accent.lime.bolder', glyph: (label) => <BookIcon {...iconProps(label)} />, matcher: (p) => p.startsWith('/wiki') },
];

export function getActiveHub(pathname: string): Hub | null {
  return HUBS.find((hub) => hub.matcher(pathname)) ?? null;
}
