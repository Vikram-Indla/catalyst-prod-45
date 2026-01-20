/**
 * Run Configuration Panel
 * Panel for configuring execution run environment and settings
 */

import React from 'react';
import { Settings, Monitor, Globe, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RunConfiguration, ExecutionEnvironment, BrowserType } from '../types/test-execution';

interface RunConfigPanelProps {
  environment: ExecutionEnvironment;
  configuration: RunConfiguration;
  onEnvironmentChange: (env: ExecutionEnvironment) => void;
  onConfigurationChange: (config: RunConfiguration) => void;
  disabled?: boolean;
}

const BROWSER_OPTIONS: { value: BrowserType; label: string; icon: React.ReactNode }[] = [
  { value: 'chrome', label: 'Chrome', icon: <Monitor className="h-4 w-4" /> },
  { value: 'firefox', label: 'Firefox', icon: <Globe className="h-4 w-4" /> },
  { value: 'safari', label: 'Safari', icon: <Monitor className="h-4 w-4" /> },
  { value: 'edge', label: 'Edge', icon: <Monitor className="h-4 w-4" /> },
  { value: 'mobile_ios', label: 'Mobile iOS', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'mobile_android', label: 'Mobile Android', icon: <Smartphone className="h-4 w-4" /> },
];

const ENVIRONMENT_OPTIONS: { value: ExecutionEnvironment; label: string }[] = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
  { value: 'custom', label: 'Custom' },
];

export const RunConfigPanel: React.FC<RunConfigPanelProps> = ({
  environment,
  configuration,
  onEnvironmentChange,
  onConfigurationChange,
  disabled = false,
}) => {
  const updateConfig = (updates: Partial<RunConfiguration>) => {
    onConfigurationChange({ ...configuration, ...updates });
  };

  const updateNotifications = (updates: Partial<NonNullable<RunConfiguration['notifications']>>) => {
    onConfigurationChange({
      ...configuration,
      notifications: { ...configuration.notifications, ...updates },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Run Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment */}
        <div className="space-y-2">
          <Label>Environment</Label>
          <Select
            value={environment}
            onValueChange={(v) => onEnvironmentChange(v as ExecutionEnvironment)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Browser */}
        <div className="space-y-2">
          <Label>Browser</Label>
          <Select
            value={configuration.browser || 'chrome'}
            onValueChange={(v) => updateConfig({ browser: v as BrowserType })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BROWSER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Browser Version */}
        <div className="space-y-2">
          <Label>Browser Version</Label>
          <Input
            placeholder="e.g., 120"
            value={configuration.browser_version || ''}
            onChange={(e) => updateConfig({ browser_version: e.target.value })}
            disabled={disabled}
          />
        </div>

        {/* Screen Resolution */}
        <div className="space-y-2">
          <Label>Screen Resolution</Label>
          <Input
            placeholder="e.g., 1920x1080"
            value={configuration.screen_resolution || ''}
            onChange={(e) => updateConfig({ screen_resolution: e.target.value })}
            disabled={disabled}
          />
        </div>

        {/* Operating System */}
        <div className="space-y-2">
          <Label>Operating System</Label>
          <Input
            placeholder="e.g., Windows 11, macOS 14"
            value={configuration.operating_system || ''}
            onChange={(e) => updateConfig({ operating_system: e.target.value })}
            disabled={disabled}
          />
        </div>

        {/* Notifications Section */}
        <div className="pt-3 border-t space-y-3">
          <Label className="text-sm font-medium">Notifications</Label>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal text-muted-foreground">
              Notify on completion
            </Label>
            <Switch
              checked={configuration.notifications?.on_completion || false}
              onCheckedChange={(checked) => updateNotifications({ on_completion: checked })}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal text-muted-foreground">
              Notify on failure
            </Label>
            <Switch
              checked={configuration.notifications?.on_failure || false}
              onCheckedChange={(checked) => updateNotifications({ on_failure: checked })}
              disabled={disabled}
            />
          </div>

          {/* Slack Channel */}
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">
              Slack Channel
            </Label>
            <Input
              placeholder="#qa-notifications"
              value={configuration.notifications?.slack_channel || ''}
              onChange={(e) => updateNotifications({ slack_channel: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
