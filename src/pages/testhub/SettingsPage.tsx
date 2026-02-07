/**
 * Settings Page — TestHub Module
 * Route: /testhub/settings
 */

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 p-8">
      <Settings className="w-16 h-16 mb-4 opacity-30" />
      <h2 className="text-lg font-semibold mb-2 text-foreground">TestHub Settings</h2>
      <p className="text-sm text-center max-w-md">
        Configure test management settings, integrations, and preferences. Coming soon.
      </p>
    </div>
  );
}
