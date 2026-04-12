/**
 * CatalystViewStory — Story detail overlay.
 *
 * Wraps the existing StoryDetailModal (V15) to preserve all working
 * functionality while establishing the new naming convention.
 * Future enhancements can refactor internals to use CatalystViewBase.
 */
import React, { lazy, Suspense } from 'react';
import type { CatalystViewBaseProps } from '../shared/types';

const StoryDetailModal = lazy(
  () => import('@/modules/project-work-hub/components/dialogs/StoryDetailModal')
);

export default function CatalystViewStory({
  isOpen,
  onClose,
  itemId,
  projectId,
  projectKey,
  onOpenItem,
  panelMode,
  onTogglePanelMode,
  navigationItems,
  onNavigate,
}: CatalystViewBaseProps) {
  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <StoryDetailModal
        isOpen={isOpen}
        onClose={onClose}
        itemId={itemId}
        projectId={projectId || ''}
        projectKey={projectKey}
        onOpenItem={onOpenItem}
        panelMode={panelMode}
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}
