/**
 * Incidents Panel
 * Shows production incidents affecting user's test scope
 */

import React from 'react';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
// No @atlaskit/icon equivalent — inline SVG
const ZapIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);
const ExternalLinkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
import type { RelatedIncident } from '../types';

interface IncidentsPanelProps {
  incidents: RelatedIncident[];
}

// §L38 Atlaskit Lozenge appearances replace bespoke className overrides.
const SEVERITY_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  P1: { label: 'P1 - Critical', appearance: 'removed' },  // red
  P2: { label: 'P2 - High',     appearance: 'moved' },    // yellow
  P3: { label: 'P3 - Medium',   appearance: 'default' },  // grey
  P4: { label: 'P4 - Low',      appearance: 'default' },  // grey
};

export function IncidentsPanel({ incidents }: IncidentsPanelProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircleIcon label="" size="large" primaryColor="currentColor" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">No Active Incidents</p>
        <p className="text-sm text-muted-foreground">
          There are no production incidents affecting your test scope
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Incidents Summary */}
      <div className="flex items-center gap-4 p-4 bg-danger/5 rounded-lg border border-danger/20">
        <ZapIcon size={24} className="text-danger" />
        <div>
          <p className="font-medium text-foreground">
            {incidents.length} Active Incident{incidents.length !== 1 ? 's' : ''} in Your Scope
          </p>
          <p className="text-sm text-muted-foreground">
            These production issues may require test re-execution after resolution
          </p>
        </div>
      </div>

      {/* Incident Cards */}
      <div className="space-y-3">
        {incidents.map((incident) => {
          const severityConfig = SEVERITY_CONFIG[incident.severity];
          const isResolved = incident.status === 'Resolved' || incident.status === 'Mitigated';

          return (
            <div
              key={incident.id}
              className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    incident.severity === 'P1' ? 'bg-danger/10' : 'bg-warning/10'
                  )}>
                    <ZapIcon
                      size={20}
                      className={cn(
                        incident.severity === 'P1' ? 'text-danger' : 'text-warning'
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{incident.key}</span>
                      <Lozenge appearance={severityConfig.appearance}>
                        {severityConfig.label}
                      </Lozenge>
                    </div>
                    <p className="text-sm text-foreground font-medium">{incident.title}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLinkIcon size={16} />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {isResolved ? (
                      <CheckCircleIcon label="" size="small" primaryColor="currentColor" />
                    ) : (
                      <WarningIcon label="" size="small" primaryColor="currentColor" />
                    )}
                    <span className="text-sm text-muted-foreground">{incident.status}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Module: <span className="text-foreground">{incident.module}</span>
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {incident.affectedTestCount} affected test{incident.affectedTestCount !== 1 ? 's' : ''}
                </span>
              </div>

              {incident.status === 'Investigating' && (
                <div className="mt-3 p-2 bg-warning/10 rounded border border-warning/20">
                  <p className="text-xs text-warning-foreground flex items-center gap-1">
                    <WarningIcon label="" size="small" primaryColor="currentColor" />
                    Active investigation — re-run affected tests after resolution
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
