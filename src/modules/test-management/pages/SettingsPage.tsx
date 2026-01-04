/**
 * Test Management Settings Page
 * Admin configuration for TM module
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Tag, 
  Globe, 
  Users,
  FileText,
  Bell,
  Shield,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'priorities', label: 'Priorities', icon: Tag, description: 'Configure test case priorities' },
  { id: 'types', label: 'Case Types', icon: FileText, description: 'Manage test case types' },
  { id: 'environments', label: 'Environments', icon: Globe, description: 'Configure test environments' },
  { id: 'labels', label: 'Labels', icon: Palette, description: 'Manage custom labels' },
  { id: 'team', label: 'Team & Roles', icon: Users, description: 'Manage team permissions' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Configure alert settings' },
];

// Mock priorities data
const mockPriorities = [
  { id: '1', name: 'Critical', color: '#ef4444', sortOrder: 1 },
  { id: '2', name: 'High', color: '#f97316', sortOrder: 2 },
  { id: '3', name: 'Medium', color: '#eab308', sortOrder: 3 },
  { id: '4', name: 'Low', color: '#22c55e', sortOrder: 4 },
];

// Mock environments data
const mockEnvironments = [
  { id: '1', name: 'Development', url: 'https://dev.example.com', isActive: true },
  { id: '2', name: 'Staging', url: 'https://staging.example.com', isActive: true },
  { id: '3', name: 'Production', url: 'https://example.com', isActive: true },
  { id: '4', name: 'UAT', url: 'https://uat.example.com', isActive: false },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('priorities');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure test management settings and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Settings Navigation */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {activeSection === 'priorities' && (
            <Card>
              <CardHeader>
                <CardTitle>Test Case Priorities</CardTitle>
                <CardDescription>
                  Configure priority levels for test cases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockPriorities.map((priority) => (
                  <div 
                    key={priority.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border-subtle"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: priority.color }}
                      />
                      <span className="font-medium">{priority.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Order: {priority.sortOrder}
                      </Badge>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4">
                  Add Priority
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'environments' && (
            <Card>
              <CardHeader>
                <CardTitle>Test Environments</CardTitle>
                <CardDescription>
                  Configure environments for test execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockEnvironments.map((env) => (
                  <div 
                    key={env.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border-subtle"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className={cn(
                        'h-5 w-5',
                        env.isActive ? 'text-success' : 'text-muted-foreground'
                      )} />
                      <div>
                        <p className="font-medium">{env.name}</p>
                        <p className="text-xs text-muted-foreground">{env.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={env.isActive} />
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4">
                  Add Environment
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'types' && (
            <Card>
              <CardHeader>
                <CardTitle>Test Case Types</CardTitle>
                <CardDescription>
                  Define types to categorize test cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Functional', 'Regression', 'Smoke', 'Integration', 'Performance', 'Security'].map((type) => (
                    <div 
                      key={type}
                      className="flex items-center justify-between p-3 rounded-lg border border-border-subtle"
                    >
                      <span className="font-medium">{type}</span>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Add Type
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === 'labels' && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Labels</CardTitle>
                <CardDescription>
                  Create labels to tag and filter test cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { name: 'Automation', color: '#3b82f6' },
                    { name: 'API', color: '#2563eb' },
                    { name: 'UI', color: '#ec4899' },
                    { name: 'Mobile', color: '#10b981' },
                    { name: 'Backend', color: '#f59e0b' },
                  ].map((label) => (
                    <Badge 
                      key={label.name}
                      style={{ backgroundColor: label.color }}
                      className="text-white cursor-pointer hover:opacity-80"
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  Manage Labels
                </Button>
              </CardContent>
            </Card>
          )}

          {(activeSection === 'team' || activeSection === 'notifications') && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeSection === 'team' ? 'Team & Roles' : 'Notifications'}
                </CardTitle>
                <CardDescription>
                  {activeSection === 'team' 
                    ? 'Manage team members and their permissions'
                    : 'Configure notification preferences'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>This section is coming soon</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
