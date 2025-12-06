import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPreferencesPanel } from '@/components/settings/UserPreferencesPanel';
import { NotificationCenter } from '@/components/settings/NotificationCenter';
import { DEFAULT_THEME_PREFERENCES, ThemePreferences } from '@/types/userSettings.types';
import { ThemeAppearancePanel } from '@/components/settings/ThemeAppearancePanel';
import { Settings, Bell, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState('preferences');
  const [themeSettings, setThemeSettings] = useState<ThemePreferences>(DEFAULT_THEME_PREFERENCES);

  const handleThemeSave = (settings: ThemePreferences) => {
    setThemeSettings(settings);
    localStorage.setItem('themeSettings', JSON.stringify(settings));
    toast.success('Theme settings saved');
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-brand-gold" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <UserPreferencesPanel />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="appearance">
          <ThemeAppearancePanel settings={themeSettings} onSave={handleThemeSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
