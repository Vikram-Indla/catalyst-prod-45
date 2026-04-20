/**
 * FeatureDetailPanel - Right panel for split panel layout
 * Shows feature details with inline editing
 * Matches EpicDetailPanel UX exactly
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { ExternalLink, Copy, Trash2, ChevronLeft, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { FeatureBacklogItem } from '../../types';

interface FeatureDetailPanelProps {
  feature: FeatureBacklogItem | null;
  onOpenDrawer: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onMobileBack?: () => void;
  showMobileBack?: boolean;
}

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  funnel: { label: 'Funnel', appearance: 'default' },
  analyzing: { label: 'Analyzing', appearance: 'inprogress' },
  backlog: { label: 'Backlog', appearance: 'default' },
  implementing: { label: 'In Progress', appearance: 'inprogress' },
  done: { label: 'Done', appearance: 'success' },
};

export function FeatureDetailPanel({
  feature,
  onOpenDrawer,
  onClone,
  onDelete,
  onMobileBack,
  showMobileBack = false,
}: FeatureDetailPanelProps) {
  if (!feature) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center text-center p-8"
        style={{ backgroundColor: 'var(--surface-1)' }}
      >
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--surface-3)' }}
        >
          <Edit className="w-8 h-8" style={{ color: 'var(--text-4)' }} />
        </div>
        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-1)' }}>
          Select a Feature
        </h3>
        <p className="text-sm max-w-[240px]" style={{ color: 'var(--text-3)' }}>
          Choose a feature from the list to view its details and make updates
        </p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[feature.status || 'funnel'] || STATUS_CONFIG.funnel;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Header */}
      <div 
        className="shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center gap-3">
          {showMobileBack && (
            <Button variant="ghost" size="icon" onClick={onMobileBack} className="md:hidden">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--secondary-bronze))' }}>
              {feature.key}
            </span>
            <span className="ml-2">
              <Lozenge appearance={statusConfig.appearance}>
                {statusConfig.label}
              </Lozenge>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onOpenDrawer} title="Open full details">
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onClone && (
            <Button variant="ghost" size="icon" onClick={onClone} title="Clone">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary */}
        <div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
            {feature.summary}
          </h2>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Epic" value={feature.epic_name || '—'} />
          <InfoField label="Project" value={feature.project_name || '—'} />
          <InfoField label="Assignee" value={feature.assignee_name || '—'} />
          <InfoField label="Priority" value={feature.priority || '—'} />
          <InfoField label="Health" value={feature.health || '—'} />
          <InfoField label="Progress" value={`${feature.progress_pct || 0}%`} />
        </div>

        {/* Dates */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
            Dates
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <InfoField 
              label="Planned Start" 
              value={feature.planned_start_date ? format(new Date(feature.planned_start_date), 'MMM d, yyyy') : '—'} 
            />
            <InfoField 
              label="Planned End" 
              value={feature.planned_end_date ? format(new Date(feature.planned_end_date), 'MMM d, yyyy') : '—'} 
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
          <div className="text-xs space-y-1" style={{ color: 'var(--text-4)' }}>
            {feature.created_at && (
              <p>Created: {format(new Date(feature.created_at), 'MMM d, yyyy h:mm a')}</p>
            )}
            {feature.updated_at && (
              <p>Updated: {format(new Date(feature.updated_at), 'MMM d, yyyy h:mm a')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div 
        className="shrink-0 p-4"
        style={{ borderTop: '1px solid var(--divider)' }}
      >
        <Button onClick={onOpenDrawer} className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white">
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full Details
        </Button>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--text-1)' }}>{value}</p>
    </div>
  );
}
