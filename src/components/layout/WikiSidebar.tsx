/**
 * WikiSidebar — /wiki sidebar with 4 grouped sections per V12 spec
 * Groups: KNOWLEDGE | DISCOVERY | PERSONAL | GOVERNANCE
 * Dynamic badges from Supabase via TanStack Query
 */

import { useMemo } from 'react';
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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface WikiSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function WikiSidebar({ expanded, onToggle, className }: WikiSidebarProps) {
  // Dynamic badge counts from Supabase
  const { data: articleCount } = useQuery({
    queryKey: ['wiki-sidebar-article-count'],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('wiki_pages')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: openRequestCount } = useQuery({
    queryKey: ['wiki-sidebar-open-requests'],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('wiki_knowledge_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: reviewCount } = useQuery({
    queryKey: ['wiki-sidebar-review-count'],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('wiki_pages')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'needs_review')
        .is('deleted_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const config: SidebarConfig = useMemo(() => ({
    badge: 'WK',
    // Block A rule 7 (2026-05-01): canonical spaced casing.
    label: 'Wiki Hub',
    sections: [
      {
        title: 'Knowledge',
        items: [
          { id: 'dashboard', title: 'Dashboard', path: '/wiki', icon: Home, exact: true },
          { id: 'domains', title: 'Domains', path: '/wiki/domains', icon: Layers, exact: true, badge: 9 },
          { id: 'all-articles', title: 'All Articles', path: '/wiki/articles', icon: FileText, exact: true, badge: articleCount ?? undefined },
        ],
      },
      {
        title: 'Discovery',
        items: [
          { id: 'search', title: 'Search', path: '/wiki/search', icon: Search, exact: true },
          { id: 'knowledge-graph', title: 'Knowledge Graph', path: '/wiki/knowledge-graph', icon: Share2, exact: true },
          { id: 'learning-paths', title: 'Learning Paths', path: '/wiki/learning-paths', icon: GraduationCap, exact: true, badge: 3 },
        ],
      },
      {
        title: 'Personal',
        items: [
          { id: 'reading-list', title: 'My Reading List', path: '/wiki/reading-list', icon: BookOpen, exact: true },
          { id: 'subscriptions', title: 'Subscriptions', path: '/wiki/subscriptions', icon: Bell, exact: true },
          { id: 'knowledge-requests', title: 'Knowledge Requests', path: '/wiki/knowledge-requests', icon: HelpCircle, exact: true, badge: openRequestCount ?? undefined, badgeVariant: (openRequestCount && openRequestCount > 0) ? 'danger' : undefined },
        ],
      },
      {
        title: 'Governance',
        items: [
          { id: 'verification-queue', title: 'Verification Queue', path: '/wiki/verification', icon: ShieldCheck, exact: true, badge: reviewCount ?? undefined, badgeVariant: (reviewCount && reviewCount > 0) ? 'danger' : undefined },
          { id: 'analytics', title: 'Analytics', path: '/wiki/analytics', icon: BarChart3, exact: true },
          { id: 'templates', title: 'Templates', path: '/wiki/templates', icon: FileCode, exact: true, badge: 5 },
        ],
      },
    ],
  }), [articleCount, openRequestCount, reviewCount]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
