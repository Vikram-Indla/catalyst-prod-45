import React, { useState } from 'react';
import { useFeatureFlags, FeatureFlag } from '@/contexts/FeatureFlagContext';
import {
  Package, TestTube, AlertTriangle, Rocket, FolderKanban, Target,
  Calendar, BookOpen, Library, Sparkles, Layers, Building2, ListChecks,
  Shield, ToggleLeft, ToggleRight, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Package, TestTube, AlertTriangle, Rocket, FolderKanban, Target,
  Calendar, BookOpen, Library, Sparkles, Layers, Building2, ListChecks,
};

function ModuleCard({ flag, onToggle }: { flag: FeatureFlag; onToggle: (key: string, enabled: boolean) => void }) {
  const [toggling, setToggling] = useState(false);
  const Icon = ICON_MAP[flag.icon || ''] || Package;

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(flag.module_key, !flag.is_enabled);
    setToggling(false);
  };

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all duration-200 ${
        flag.is_enabled
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-border bg-muted/30 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`mt-0.5 rounded-md p-2 ${
              flag.is_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">{flag.label}</h3>
              {flag.is_enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  <CheckCircle2 size={10} /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <XCircle size={10} /> Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{flag.description}</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`shrink-0 transition-colors duration-200 rounded-full p-0.5 ${
            toggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-80'
          }`}
          title={flag.is_enabled ? 'Disable module' : 'Enable module'}
        >
          {flag.is_enabled ? (
            <ToggleRight size={32} className="text-primary" />
          ) : (
            <ToggleLeft size={32} className="text-muted-foreground" />
          )}
        </button>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground/60">
        Updated {new Date(flag.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function FeatureFlagsPage() {
  const { allFlags, isLoading, toggleFlag, refetch, flags } = useFeatureFlags();

  const groups = allFlags.reduce<Record<string, FeatureFlag[]>>((acc, flag) => {
    const g = flag.group_name;
    if (!acc[g]) acc[g] = [];
    acc[g].push(flag);
    return acc;
  }, {});

  const enabledCount = allFlags.filter((f) => f.is_enabled).length;
  const totalCount = allFlags.length;

  const enableAll = async () => {
    for (const flag of allFlags) {
      if (!flag.is_enabled) await toggleFlag(flag.module_key, true);
    }
  };

  const disableAll = async () => {
    for (const flag of allFlags) {
      if (flag.is_enabled) await toggleFlag(flag.module_key, false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Feature Flags</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Control which modules are active. Toggle modules on/off for incremental rollout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-6 rounded-lg border bg-card p-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-foreground">
              {enabledCount}<span className="text-muted-foreground text-lg font-normal">/{totalCount}</span>
            </div>
            <span className="text-sm text-muted-foreground">modules enabled</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(enabledCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 border-l pl-4">
          <button
            onClick={enableAll}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ToggleRight size={14} /> Enable All
          </button>
          <button
            onClick={disableAll}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <ToggleLeft size={14} /> Disable All
          </button>
        </div>
      </div>

      {/* Groups */}
      {Object.entries(groups).map(([groupName, groupFlags]) => (
        <div key={groupName} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            {groupName}
            <span className="text-[10px] font-normal">
              ({groupFlags.filter((f) => f.is_enabled).length}/{groupFlags.length})
            </span>
            <span className="h-px flex-1 bg-border" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupFlags.map((flag) => (
              <ModuleCard key={flag.module_key} flag={flag} onToggle={toggleFlag} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer note */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <strong>💡 How it works:</strong> Disabled modules will show a "Coming Soon" placeholder.
        Changes take effect immediately for all users. Use this to incrementally roll out features
        after each publish cycle.
      </div>
    </div>
  );
}
