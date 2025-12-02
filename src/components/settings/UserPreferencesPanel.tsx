import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings, Globe, Layout, Bell } from 'lucide-react';

export function UserPreferencesPanel() {
  const [prefs, setPrefs] = useState({
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    defaultView: 'list',
    itemsPerPage: '25',
    showWelcomeScreen: true,
    enableKeyboardShortcuts: true,
    enableAnimations: true,
    compactMode: false,
    autoRefresh: true,
    refreshInterval: '30'
  });

  const handleSave = () => {
    // Save to local storage or API
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
    toast.success('Preferences saved');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand-gold" />
          <CardTitle>User Preferences</CardTitle>
        </div>
        <CardDescription>
          Customize your application experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Regional Settings
          </h4>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={prefs.language} onValueChange={(v) => setPrefs({ ...prefs, language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={prefs.timezone} onValueChange={(v) => setPrefs({ ...prefs, timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Paris">Paris</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={prefs.dateFormat} onValueChange={(v) => setPrefs({ ...prefs, dateFormat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Format</Label>
              <Select value={prefs.timeFormat} onValueChange={(v) => setPrefs({ ...prefs, timeFormat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Display Settings
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default View</Label>
              <Select value={prefs.defaultView} onValueChange={(v) => setPrefs({ ...prefs, defaultView: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="grid">Grid View</SelectItem>
                  <SelectItem value="kanban">Kanban View</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Items Per Page</Label>
              <Select value={prefs.itemsPerPage} onValueChange={(v) => setPrefs({ ...prefs, itemsPerPage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'showWelcomeScreen', label: 'Show Welcome Screen', desc: 'Display welcome screen on login' },
              { key: 'enableKeyboardShortcuts', label: 'Keyboard Shortcuts', desc: 'Enable keyboard navigation' },
              { key: 'enableAnimations', label: 'Animations', desc: 'Enable UI animations' },
              { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing for more content' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={prefs[item.key as keyof typeof prefs] as boolean}
                  onCheckedChange={(checked) => setPrefs({ ...prefs, [item.key]: checked })}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Auto-Refresh
          </h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-Refresh</Label>
              <p className="text-xs text-muted-foreground">Automatically refresh data</p>
            </div>
            <Switch
              checked={prefs.autoRefresh}
              onCheckedChange={(checked) => setPrefs({ ...prefs, autoRefresh: checked })}
            />
          </div>

          {prefs.autoRefresh && (
            <div className="space-y-2">
              <Label>Refresh Interval</Label>
              <Select value={prefs.refreshInterval} onValueChange={(v) => setPrefs({ ...prefs, refreshInterval: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}
