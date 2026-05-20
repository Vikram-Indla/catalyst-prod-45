/**
 * IdeaDrawer — Phase 6 (2026-05-02): thin facade over CatalystDetailRouter.
 *
 * The detail-surface body lives at
 *   components/catalyst-detail-views/idea/CatalystViewIdea.tsx
 * routed through the canonical CatalystDetailRouter (the same router that
 * serves Story / Epic / BusinessRequest / Defect / etc.). This file is
 * preserved only so the existing call sites
 *   - pages/producthub/IdeasBoardPage.tsx
 *   - pages/producthub/IdeasBacklogPage.tsx
 *   - pages/producthub/IdeasRoadmapPage.tsx
 * don't have to change. New code should import CatalystDetailRouter
 * directly with itemType="idea" — see CLAUDE.md.
 *
 * The "Drawer" name is legacy. The widget is a centered Atlaskit modal
 * (no slide-in drawer chrome).
 */
import React from 'react';
import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';
import type { IdeaRow } from '@/hooks/useIdeasHub';

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (idea: IdeaRow) => void;
}

export default function IdeaDrawer({ ideaKey, onClose, onConvert }: Props) {
  return (
    <CatalystDetailRouter
      isOpen={!!ideaKey}
      onClose={onClose}
      itemId={ideaKey || ''}
      itemType="idea"
      onConvert={onConvert as ((item: unknown) => void) | undefined}
    />
  );
}
