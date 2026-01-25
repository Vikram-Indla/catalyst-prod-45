import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Resource360Header } from './Resource360Header';
import { MetricsRow } from './MetricsRow';
import { HierarchyTreeView } from './HierarchyTreeView';
import { useResource360Data } from '@/hooks/capacity/useResource360Data';

interface Resource360DrawerProps {
  resourceId: string | null;
  onClose: () => void;
}

export function Resource360Drawer({ resourceId, onClose }: Resource360DrawerProps) {
  const isOpen = resourceId !== null;

  const {
    resource,
    workItems,
    currentItems,
    pastItems,
    isLoading,
  } = useResource360Data(resourceId);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel - V8 Styling */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[640px] z-[101]",
          "bg-[var(--ct-surface)] ct-drawer",
          "shadow-[var(--ct-shadow-xl)] flex flex-col overflow-hidden",
          "border-l border-[var(--ct-border)]",
          "animate-in slide-in-from-right duration-300"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button - V8 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-[var(--ct-radius-md)] hover:bg-[var(--ct-surface-hover)] transition-colors"
        >
          <X className="w-5 h-5 text-[var(--ct-text-muted)]" />
        </button>

        {isLoading || !resource ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <Resource360Header resource={resource} />

            {/* Metrics Row */}
            <MetricsRow
              totalItems={totalItems}
              completed={completedItems}
              inProgress={inProgressItems}
              upcoming={upcomingItems}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <HierarchyTreeView workItems={workItems} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
