/**
 * Defects Panel
 * Shows linked defects affecting user's test scope
 */

import React from 'react';
import { Lozenge, toStatusCategory, type LozengeAppearance } from '@/components/ads';
import BugIcon from '@atlaskit/icon/core/bug';
// No @atlaskit/icon equivalent — inline SVG
const ExternalLinkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
import type { LinkedDefect } from '../types';

interface DefectsPanelProps {
  defects: LinkedDefect[];
}

// §L38 Atlaskit Lozenge appearances replace bespoke className overrides.
const SEVERITY_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  critical: { label: 'Critical', appearance: 'removed' },  // red
  major:    { label: 'Major',    appearance: 'moved' },    // yellow
  minor:    { label: 'Minor',    appearance: 'default' },  // grey
  trivial:  { label: 'Trivial',  appearance: 'default' },  // grey
};

// Map defect.status → StatusLozenge 3-colour guardrail (CLAUDE.md §5).
const CATEGORY_TO_APPEARANCE: Record<string, LozengeAppearance> = {
  todo: 'default',
  inProgress: 'inprogress',
  done: 'success',
};

export function DefectsPanel({ defects }: DefectsPanelProps) {
  if (defects.length === 0) {
    return (
      <div className="text-center py-12">
        <BugIcon label="" size="large" primaryColor="currentColor" />
        <p className="text-muted-foreground">No defects linked to your tests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {defects.map((defect) => {
        const severityConfig = SEVERITY_CONFIG[defect.severity] || SEVERITY_CONFIG.minor;
        
        return (
          <div
            key={defect.id}
            className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <BugIcon label="" size="small" primaryColor="var(--ds-text-warning, #f97316)" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{defect.key}</span>
                  <Lozenge appearance={severityConfig.appearance}>
                    {severityConfig.label}
                  </Lozenge>
                  <Lozenge appearance={CATEGORY_TO_APPEARANCE[toStatusCategory(defect.status)]}>
                    {defect.status}
                  </Lozenge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{defect.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Affects {defect.affectedTestCount} test{defect.affectedTestCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button className="p-2 hover:bg-muted rounded-md transition-colors">
              <ExternalLinkIcon size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
