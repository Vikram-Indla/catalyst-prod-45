/**
 * Settings Sidebar Navigation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Shield,
  SlidersHorizontal,
  Link,
  Bell,
  FileText,
  Code,
  AlertTriangle,
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
  section?: string;
}

const navItems: NavItem[] = [
  { id: 'general', label: 'General', icon: Home, section: 'Project' },
  { id: 'team', label: 'Team Members', icon: Users, section: 'Project' },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, section: 'Project' },
  { id: 'custom-fields', label: 'Custom Fields', icon: SlidersHorizontal, section: 'Customization' },
  { id: 'integrations', label: 'Connected Apps', icon: Link, section: 'Integrations' },
  { id: 'notifications', label: 'Notifications', icon: Bell, section: 'Integrations' },
  { id: 'api', label: 'API & Webhooks', icon: Code, section: 'Integrations' },
  { id: 'audit-log', label: 'Audit Log', icon: FileText, section: 'System' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, section: 'System' },
];

export function SettingsSidebar({ activeTab, onTabChange, memberCount }: SettingsSidebarProps) {
  const sections = [...new Set(navItems.map((item) => item.section))];

  return (
    <aside className="w-60 border-r border-border bg-background flex flex-col">
      <div className="p-5 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Settings
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section}>
            <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {section}
            </div>
            <div className="space-y-1">
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badge = item.id === 'team' ? memberCount : undefined;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        item.id === 'danger' && !isActive && 'text-destructive hover:text-destructive'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {badge !== undefined && (
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
