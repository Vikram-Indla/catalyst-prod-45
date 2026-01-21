// ════════════════════════════════════════════════════════════════════════════
// SPACE SETTINGS - Main settings container with tabs
// ════════════════════════════════════════════════════════════════════════════

import { useParams } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useSpace } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { cn } from '@/lib/utils';
import { DetailsTab } from './tabs/DetailsTab';
import { AccessTab } from './tabs/AccessTab';
import { FeaturesTab } from './tabs/FeaturesTab';
import { PermissionsTab } from './tabs/PermissionsTab';
import { ComponentsTab } from './tabs/ComponentsTab';
import { VersionsTab } from './tabs/VersionsTab';
import { DangerZoneTab } from './tabs/DangerZoneTab';
import type { SettingsTab } from '@/types/spaces';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'access', label: 'Access' },
  { key: 'features', label: 'Features' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'components', label: 'Components' },
  { key: 'versions', label: 'Versions' },
  { key: 'danger', label: 'Danger Zone' },
];

export function SpaceSettings() {
  const { id } = useParams<{ id: string }>();
  const { activeSettingsTab, setActiveSettingsTab } = useSpaceStore();
  const { data: space, isLoading } = useSpace(id);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Space not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-muted rounded-lg">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Space Settings</h1>
          <p className="text-sm text-muted-foreground">{space.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSettingsTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeSettingsTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-background border border-border rounded-lg">
        {activeSettingsTab === 'details' && <DetailsTab space={space} />}
        {activeSettingsTab === 'access' && <AccessTab spaceId={space.id} />}
        {activeSettingsTab === 'features' && <FeaturesTab spaceId={space.id} />}
        {activeSettingsTab === 'permissions' && <PermissionsTab spaceId={space.id} />}
        {activeSettingsTab === 'components' && <ComponentsTab spaceId={space.id} />}
        {activeSettingsTab === 'versions' && <VersionsTab spaceId={space.id} />}
        {activeSettingsTab === 'danger' && <DangerZoneTab space={space} />}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-muted rounded-lg animate-pulse" />
        <div>
          <div className="h-5 w-32 bg-muted rounded animate-pulse mb-1" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="flex gap-4 border-b border-border mb-6 pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="bg-background border border-border rounded-lg p-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
