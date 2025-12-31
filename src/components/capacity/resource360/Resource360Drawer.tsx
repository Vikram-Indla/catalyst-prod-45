import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Resource360Header } from './Resource360Header';
import { Resource360Tabs } from './Resource360Tabs';
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
    hierarchyData,
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
          "fixed top-0 right-0 h-full w-full max-w-[640px] bg-white z-50",
          "shadow-2xl transition-transform duration-300 ease-out",
          "flex flex-col overflow-hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-[#f5f5f4] transition-colors"
        >
          <X className="w-5 h-5 text-[#737373]" />
        </button>

        {isLoading || !resource ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
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

            {/* Catalyst Work Item Hierarchy Legend */}
            <div className="px-6 py-4 border-b border-[#e5e5e5]">
              <div className="bg-[#fafafa] rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#737373] text-center mb-4 uppercase tracking-wide">
                  Catalyst Work Item Hierarchy
                </h4>
                <div className="flex justify-between items-start gap-2">
                  {/* Enterprise */}
                  <div className="flex-1 border-l-4 border-[#4d8b4d] pl-3">
                    <p className="text-[10px] font-semibold text-[#737373] uppercase mb-1">Enterprise</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#e5e5e5] bg-white text-[#4d8b4d]">Theme</span>
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#e5e5e5] bg-white text-[#6b7280]">Objective</span>
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#e5e5e5] bg-white text-[#d4b896]">Key Result</span>
                    </div>
                  </div>
                  
                  <span className="text-[#d4d4d4] mt-4">↓</span>
                  
                  {/* Program */}
                  <div className="flex-1 border-l-4 border-[#2563eb] pl-3">
                    <p className="text-[10px] font-semibold text-[#737373] uppercase mb-1">Program</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#2563eb]/30 bg-[#2563eb]/5 text-[#2563eb]">Epic</span>
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#0d9488]/30 bg-[#0d9488]/5 text-[#0d9488]">Feature</span>
                    </div>
                  </div>
                  
                  <span className="text-[#d4d4d4] mt-4">↓</span>
                  
                  {/* Project */}
                  <div className="flex-1 border-l-4 border-[#0d9488] pl-3">
                    <p className="text-[10px] font-semibold text-[#737373] uppercase mb-1">Project</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#e5e5e5] bg-white text-[#8b7355]">Story</span>
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#dc2626]/30 bg-[#dc2626]/5 text-[#dc2626]">Defect</span>
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#d97706]/30 bg-[#d97706]/5 text-[#d97706]">Incident</span>
                    </div>
                  </div>
                  
                  {/* Product */}
                  <div className="flex-1 border-l-4 border-[#d4d4d4] pl-3">
                    <p className="text-[10px] font-semibold text-[#737373] uppercase mb-1">Product</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 text-[10px] rounded border border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e]">Business Request</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-[#e5e5e5]">
              <div className="text-center py-3 px-2 border border-[#e5e5e5] rounded-lg">
                <p className="text-2xl font-bold text-[#0a0a0a]">{totalItems}</p>
                <p className="text-xs text-[#737373]">Total Items</p>
              </div>
              <div className="text-center py-3 px-2 border border-[#e5e5e5] rounded-lg">
                <p className="text-2xl font-bold text-[#0a0a0a]">{completedItems}</p>
                <p className="text-xs text-[#737373]">Completed</p>
              </div>
              <div className="text-center py-3 px-2 border border-[#e5e5e5] rounded-lg">
                <p className="text-2xl font-bold text-[#0a0a0a]">{inProgressItems}</p>
                <p className="text-xs text-[#737373]">In Progress</p>
              </div>
              <div className="text-center py-3 px-2 border border-[#e5e5e5] rounded-lg">
                <p className="text-2xl font-bold text-[#0a0a0a]">{upcomingItems}</p>
                <p className="text-xs text-[#737373]">Upcoming</p>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'hierarchy' && (
                <HierarchyTreeView
                  nodes={hierarchyData}
                  workItems={workItems}
                />
              )}

              {activeTab === 'sunburst' && (
                <SunburstView
                  data={sunburstData}
                  metrics={sunburstMetrics}
                  resourceName={resource.name}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
