/**
 * Settings Page - Module 5 Main Entry
 * Route: /tests/settings
 * Simple field configurations style matching user reference
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tag,
  FileText,
  Globe,
  Tags,
  Users,
  Bell,
  Plus,
} from 'lucide-react';

// Types
type SettingsTab = 'priorities' | 'case-types' | 'environments' | 'labels' | 'team-roles' | 'notifications';

interface ConfigItem {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
}

// Navigation items matching the reference
const navItems: NavItem[] = [
  { id: 'priorities', label: 'Priorities', icon: Tag },
  { id: 'case-types', label: 'Case Types', icon: FileText },
  { id: 'environments', label: 'Environments', icon: Globe },
  { id: 'labels', label: 'Labels', icon: Tags },
  { id: 'team-roles', label: 'Team & Roles', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

// Default data
const defaultPriorities: ConfigItem[] = [
  { id: '1', name: 'Critical', color: '#ef4444', order: 1 },
  { id: '2', name: 'High', color: '#f97316', order: 2 },
  { id: '3', name: 'Medium', color: '#eab308', order: 3 },
  { id: '4', name: 'Low', color: '#22c55e', order: 4 },
];

const defaultCaseTypes: ConfigItem[] = [
  { id: '1', name: 'Functional', color: '#3b82f6', order: 1 },
  { id: '2', name: 'Regression', color: '#8b5cf6', order: 2 },
  { id: '3', name: 'Smoke', color: '#06b6d4', order: 3 },
  { id: '4', name: 'Integration', color: '#ec4899', order: 4 },
];

const defaultEnvironments: ConfigItem[] = [
  { id: '1', name: 'Development', color: '#22c55e', order: 1 },
  { id: '2', name: 'Staging', color: '#eab308', order: 2 },
  { id: '3', name: 'Production', color: '#ef4444', order: 3 },
];

const defaultLabels: ConfigItem[] = [
  { id: '1', name: 'Automation', color: '#3b82f6', order: 1 },
  { id: '2', name: 'Manual', color: '#8b5cf6', order: 2 },
  { id: '3', name: 'API', color: '#06b6d4', order: 3 },
  { id: '4', name: 'UI', color: '#ec4899', order: 4 },
];

// Tab metadata
const tabMeta: Record<SettingsTab, { title: string; subtitle: string; addLabel: string }> = {
  priorities: { title: 'Test Case Priorities', subtitle: 'Configure priority levels for test cases', addLabel: 'Add Priority' },
  'case-types': { title: 'Test Case Types', subtitle: 'Configure test case types', addLabel: 'Add Case Type' },
  environments: { title: 'Test Environments', subtitle: 'Configure test environments', addLabel: 'Add Environment' },
  labels: { title: 'Test Labels', subtitle: 'Configure labels for test cases', addLabel: 'Add Label' },
  'team-roles': { title: 'Team & Roles', subtitle: 'Manage team members and roles', addLabel: 'Add Member' },
  notifications: { title: 'Notifications', subtitle: 'Configure notification preferences', addLabel: '' },
};

// Settings Sidebar Component
function SettingsSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <aside className="w-[260px] bg-background border-r border-border flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-border/50">
        <span className="text-sm font-semibold text-foreground">Settings</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-100',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// Configurable Items List Component
function ConfigurableItemsList({
  items,
  addLabel,
  onEdit,
  onAdd,
}: {
  items: ConfigItem[];
  addLabel: string;
  onEdit: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between px-6 py-4 bg-background border border-border rounded-lg hover:border-border/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-medium text-foreground">{item.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-medium">
              Order: {item.order}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              Edit
            </Button>
          </div>
        </div>
      ))}
      
      {/* Add Button */}
      {addLabel && (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      )}
    </div>
  );
}

// Team & Roles placeholder
function TeamRolesSection() {
  return (
    <div className="bg-background border border-border rounded-xl p-8 text-center text-muted-foreground">
      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-sm">Team & Roles management coming soon...</p>
    </div>
  );
}

// Notifications placeholder
function NotificationsSection() {
  return (
    <div className="bg-background border border-border rounded-xl p-8 text-center text-muted-foreground">
      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-sm">Notification preferences coming soon...</p>
    </div>
  );
}

export function TMSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('priorities');
  const [priorities] = useState<ConfigItem[]>(defaultPriorities);
  const [caseTypes] = useState<ConfigItem[]>(defaultCaseTypes);
  const [environments] = useState<ConfigItem[]>(defaultEnvironments);
  const [labels] = useState<ConfigItem[]>(defaultLabels);

  const { title, subtitle, addLabel } = tabMeta[activeTab];

  const handleEdit = (id: string) => {
    console.log('Edit item:', id);
    // TODO: Open edit dialog
  };

  const handleAdd = () => {
    console.log('Add new item');
    // TODO: Open add dialog
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'priorities':
        return (
          <ConfigurableItemsList
            items={priorities}
            addLabel={addLabel}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        );
      case 'case-types':
        return (
          <ConfigurableItemsList
            items={caseTypes}
            addLabel={addLabel}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        );
      case 'environments':
        return (
          <ConfigurableItemsList
            items={environments}
            addLabel={addLabel}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        );
      case 'labels':
        return (
          <ConfigurableItemsList
            items={labels}
            addLabel={addLabel}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        );
      case 'team-roles':
        return <TeamRolesSection />;
      case 'notifications':
        return <NotificationsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>

            {/* Content */}
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default TMSettingsPage;
