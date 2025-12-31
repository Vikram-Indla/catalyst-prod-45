import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Resource360Header } from './Resource360Header';
import { Resource360Tabs } from './Resource360Tabs';
import { MetricsRow } from './MetricsRow';
import { CatalystHierarchyLegend } from './CatalystHierarchyLegend';
import { HierarchyTreeView } from './HierarchyTreeView';
import { SunburstView } from './SunburstView';
import { useResource360Data } from '@/hooks/capacity/useResource360Data';
import type { DrawerTab } from '@/types/resource360';

interface Resource360DrawerProps {
  resourceId: string | null;
  onClose: () => void;
}

export function Resource360Drawer({ resourceId, onClose }: Resource360DrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('hierarchy');
  const isOpen = resourceId !== null;

  const {
    resource,
    workItems,
    currentItems,
    pastItems,
    sunburstData,
    sunburstMetrics,
    isLoading,
  } = useResource360Data(resourceId);

  // Reset tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('hierarchy');
    }
  }, [isOpen, resourceId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  // Calculate metrics
  const totalItems = workItems.length;
  const completedItems = pastItems.length;
  const inProgressItems = currentItems.filter(i => i.status === 'current').length;
  const upcomingItems = currentItems.filter(i => i.status === 'future').length;

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[640px] bg-background z-50",
          "shadow-2xl transition-transform duration-300 ease-out",
          "flex flex-col overflow-hidden border-l border-border",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {isLoading || !resource ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <Resource360Header resource={resource} />

            {/* Tabs */}
            <Resource360Tabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Metrics Row */}
            <MetricsRow
              totalItems={totalItems}
              completed={completedItems}
              inProgress={inProgressItems}
              upcoming={upcomingItems}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === 'hierarchy' && (
                <HierarchyTreeView workItems={workItems} />
              )}

              {activeTab === 'sunburst' && (
                <>
                  <CatalystHierarchyLegend />
                  <SunburstView
                    data={sunburstData}
                    metrics={sunburstMetrics}
                    resourceName={resource.name}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
