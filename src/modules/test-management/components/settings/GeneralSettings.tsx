/**
 * General Settings Section
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TMProject, ProjectSettings } from '../../types/settings';

interface GeneralSettingsProps {
  project?: TMProject;
  onUpdateProject: (updates: Partial<TMProject>) => void;
  onUpdateSettings: (settings: Partial<ProjectSettings>) => void;
  isLoading?: boolean;
}

export function GeneralSettings({
  project,
  onUpdateProject,
  onUpdateSettings,
  isLoading,
}: GeneralSettingsProps) {
  const [name, setName] = React.useState(project?.name || '');
  const [description, setDescription] = React.useState(project?.description || '');
  const [key, setKey] = React.useState(project?.key || '');

  React.useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setKey(project.key);
    }
  }, [project]);

  const settings = project?.settings || {} as ProjectSettings;

  const handleSaveBasic = () => {
    onUpdateProject({ name, description, key });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <section className="bg-background border border-border rounded-xl">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Project Information</h2>
          <p className="text-sm text-muted-foreground">Basic details about your project</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Project Key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="PRJ"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">Used for prefixes (e.g., TC-001)</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveBasic} disabled={isLoading}>
              Save Changes
            </Button>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-background border border-border rounded-xl">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Preferences</h2>
          <p className="text-sm text-muted-foreground">Configure default behaviors</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={settings.timezone || 'Asia/Riyadh'}
                onValueChange={(v) => onUpdateSettings({ timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Riyadh">Asia/Riyadh (GMT+3)</SelectItem>
                  <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={settings.date_format || 'DD/MM/YYYY'}
                onValueChange={(v) => onUpdateSettings({ date_format: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label>Test Case Prefix</Label>
              <Input
                value={settings.default_test_case_prefix || 'TC'}
                onChange={(e) => onUpdateSettings({ default_test_case_prefix: e.target.value })}
                placeholder="TC"
              />
            </div>
            <div className="space-y-2">
              <Label>Defect Prefix</Label>
              <Input
                value={settings.default_defect_prefix || 'DEF'}
                onChange={(e) => onUpdateSettings({ default_defect_prefix: e.target.value })}
                placeholder="DEF"
              />
            </div>
            <div className="space-y-2">
              <Label>Cycle Prefix</Label>
              <Input
                value={settings.default_cycle_prefix || 'CYC'}
                onChange={(e) => onUpdateSettings({ default_cycle_prefix: e.target.value })}
                placeholder="CYC"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Toggles */}
      <section className="bg-background border border-border rounded-xl">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Feature Settings</h2>
          <p className="text-sm text-muted-foreground">Enable or disable optional features</p>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Require Test Case Review</p>
              <p className="text-xs text-muted-foreground">
                Test cases must be reviewed before they can be executed
              </p>
            </div>
            <Switch
              checked={settings.require_test_case_review || false}
              onCheckedChange={(v) => onUpdateSettings({ require_test_case_review: v })}
            />
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-close Defects on Pass</p>
              <p className="text-xs text-muted-foreground">
                Automatically close linked defects when all tests pass
              </p>
            </div>
            <Switch
              checked={settings.auto_close_defects_on_pass || false}
              onCheckedChange={(v) => onUpdateSettings({ auto_close_defects_on_pass: v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
