/**
 * Settings Sidebar Navigation
 * Matches Catalyst V5 reference design with proper sections
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Shield,
  Lock,
  SlidersHorizontal,
  Workflow,
  LayoutTemplate,
  Link,
  Bell,
  Code,
  FileText,
  Monitor,
} from 'lucide-react';
import type { SettingsTab } from '../../types/settings';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  memberCount?: number;
}

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Project',
    items: [
      { id: 'general', label: 'General', icon: Home },
      { id: 'team', label: 'Team Members', icon: Users },
      { id: 'roles', label: 'Roles & Permissions', icon: Shield },
      { id: 'security', label: 'Security', icon: Lock },
    ],
  },
  {
    title: 'Customization',
    items: [
      { id: 'custom-fields', label: 'Custom Fields', icon: SlidersHorizontal },
      { id: 'workflows', label: 'Workflows', icon: Workflow },
      { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { id: 'integrations', label: 'Connected Apps', icon: Link },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'api', label: 'API & Webhooks', icon: Code },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'audit-log', label: 'Audit Log', icon: FileText },
      { id: 'usage-billing', label: 'Usage & Billing', icon: Monitor },
    ],
  },
];

export function SettingsSidebar({ activeTab, onTabChange, memberCount }: SettingsSidebarProps) {
  return (
    <aside className="w-[260px] bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="px-5 py-5 border-b border-border/50">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Settings
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badge = item.id === 'team' ? memberCount : undefined;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-100',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'opacity-100' : 'opacity-70'
                    )} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge !== undefined && badge > 0 && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                          isActive
                            ? 'bg-primary/20 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
