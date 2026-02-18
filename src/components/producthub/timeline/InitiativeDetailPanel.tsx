// =====================================================
// INITIATIVE DETAIL PANEL — Slide-over from right
// =====================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X, Pencil, Paperclip, Copy, Link2, Star, Trash2 } from 'lucide-react';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { STATUS_CONFIG } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { DetailTabDetails } from './DetailTabDetails';
import { DetailTabScore } from './DetailTabScore';
import { DetailTabPlaceholder } from './DetailTabPlaceholder';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'score', label: 'Score' },
  { key: 'budget', label: 'Budget' },
  { key: 'risks', label: 'Risks' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'links', label: 'Links' },
  { key: 'audit', label: 'Audit' },
] as const;

type TabKey = typeof TABS[number]['key'];

const ACTIONS = [
  { icon: Pencil, label: 'Edit', variant: 'default' },
  { icon: Paperclip, label: 'Attach', variant: 'default' },
  { icon: Copy, label: 'Clone', variant: 'default' },
  { icon: Link2, label: 'Link', variant: 'default' },
  { icon: Star, label: 'Score', variant: 'default' },
  { icon: Trash2, label: 'Delete', variant: 'danger' },
] as const;

interface InitiativeDetailPanelProps {
  initiative: TimelineInitiative;
  initiatives: TimelineInitiative[];
  onClose: () => void;
}

export const InitiativeDetailPanel: React.FC<InitiativeDetailPanelProps> = ({
  initiative,
  initiatives,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { openDetail } = useTimelineState();

  const statusCfg = STATUS_CONFIG[initiative.status];

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Close with animation
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClose]);

  // Arrow nav between initiatives
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const idx = initiatives.findIndex(i => i.id === initiative.id);
      if (idx === -1) return;
      const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < initiatives.length) {
        openDetail(initiatives[nextIdx].id);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [initiative.id, initiatives, openDetail]);

  // Focus trap
  useEffect(() => {
    if (panelRef.current) {
      const firstFocusable = panelRef.current.querySelector<HTMLElement>('button, [tabindex]');
      firstFocusable?.focus();
    }
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[200] transition-opacity duration-250',
          isVisible ? 'bg-black/15' : 'bg-transparent pointer-events-none'
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 h-full w-[480px] max-w-[90vw] z-[201] bg-card border-l border-border shadow-xl',
          'flex flex-col transition-transform duration-250 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${initiative.initiative_key}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border space-y-2 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}
                >
                  {initiative.initiative_key}
                </span>
              </div>
              <h2 className="text-[16px] font-semibold text-foreground leading-tight truncate">
                {initiative.title}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status pill */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.color }} />
            <span
              className="text-[12px] font-medium px-2 py-0.5 rounded-xl"
              style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-border shrink-0">
          {ACTIONS.map(action => (
            <button
              key={action.label}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md transition-colors',
                action.variant === 'danger'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <action.icon className="w-3.5 h-3.5" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 px-5 border-b border-border shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'details' && <DetailTabDetails initiative={initiative} />}
          {activeTab === 'score' && <DetailTabScore initiative={initiative} />}
          {activeTab === 'budget' && <DetailTabPlaceholder emoji="💰" label="Budget" />}
          {activeTab === 'risks' && <DetailTabPlaceholder emoji="⚠️" label="Risks" />}
          {activeTab === 'milestones' && <DetailTabPlaceholder emoji="🏁" label="Milestones" />}
          {activeTab === 'links' && <DetailTabPlaceholder emoji="🔗" label="Links" />}
          {activeTab === 'audit' && <DetailTabPlaceholder emoji="📋" label="Audit" />}
        </div>
      </div>
    </>
  );
};

export default InitiativeDetailPanel;
