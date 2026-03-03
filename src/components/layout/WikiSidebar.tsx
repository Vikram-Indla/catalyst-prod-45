/**
 * WikiSidebar — /wiki sidebar with 4 grouped sections per V12 spec
 * Groups: KNOWLEDGE | DISCOVERY | PERSONAL | GOVERNANCE
 */

import {
  Home,
  Layers,
  FileText,
  Search,
  Share2,
  GraduationCap,
  BookOpen,
  Bell,
  HelpCircle,
  ShieldCheck,
  BarChart3,
  FileCode,
  Factory,
  Ship,
  FlaskConical,
  Leaf,
  Landmark,
  Bot,
  HardHat,
  Globe,
  Pickaxe,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface WikiSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const WIKI_SIDEBAR_CONFIG: SidebarConfig = {
  badge: 'WK',
  label: 'Wiki',
  sections: [
    {
      title: 'Knowledge',
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/wiki', icon: Home, exact: true },
        { id: 'domains', title: 'Domains', path: '/wiki/domains', icon: Layers, exact: true },
        { id: 'all-articles', title: 'All Articles', path: '/wiki/articles', icon: FileText, exact: true },
      ],
    },
    {
      title: 'Discovery',
      items: [
        { id: 'search', title: 'Search', path: '/wiki/search', icon: Search, exact: true },
        { id: 'knowledge-graph', title: 'Knowledge Graph', path: '/wiki/knowledge-graph', icon: Share2, exact: true },
        { id: 'learning-paths', title: 'Learning Paths', path: '/wiki/learning-paths', icon: GraduationCap, exact: true },
      ],
    },
    {
      title: 'Personal',
      items: [
        { id: 'reading-list', title: 'My Reading List', path: '/wiki/reading-list', icon: BookOpen, exact: true },
        { id: 'subscriptions', title: 'Subscriptions', path: '/wiki/subscriptions', icon: Bell, exact: true },
        { id: 'knowledge-requests', title: 'Knowledge Requests', path: '/wiki/knowledge-requests', icon: HelpCircle, exact: true },
      ],
    },
    {
      title: 'Governance',
      items: [
        { id: 'verification-queue', title: 'Verification Queue', path: '/wiki/verification', icon: ShieldCheck, exact: true },
        { id: 'analytics', title: 'Analytics', path: '/wiki/analytics', icon: BarChart3, exact: true },
        { id: 'templates', title: 'Templates', path: '/wiki/templates', icon: FileCode, exact: true },
      ],
    },
    {
      title: 'Domains',
      items: [
        { id: 'd1', title: 'Industrial Licensing', path: '/wiki/domains/D1', icon: Factory, exact: false },
        { id: 'd2', title: 'Customs & Trade', path: '/wiki/domains/D2', icon: Ship, exact: false },
        { id: 'd3', title: 'Chemical Permits', path: '/wiki/domains/D3', icon: FlaskConical, exact: false },
        { id: 'd4', title: 'Environmental Compliance', path: '/wiki/domains/D4', icon: Leaf, exact: false },
        { id: 'd5', title: 'Industrial Incentives', path: '/wiki/domains/D5', icon: Landmark, exact: false },
        { id: 'd6', title: 'Fourth Industrial Revolution', path: '/wiki/domains/D6', icon: Bot, exact: false },
        { id: 'd7', title: 'Workforce & Industrial Support', path: '/wiki/domains/D7', icon: HardHat, exact: false },
        { id: 'd8', title: 'Senaei Platform', path: '/wiki/domains/D8', icon: Globe, exact: false },
        { id: 'd9', title: 'Mining & Mineral Resources', path: '/wiki/domains/D9', icon: Pickaxe, exact: false },
      ],
    },
  ],
};

export function WikiSidebar({ expanded, onToggle, className }: WikiSidebarProps) {
  return (
    <SidebarBase
      config={WIKI_SIDEBAR_CONFIG}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
