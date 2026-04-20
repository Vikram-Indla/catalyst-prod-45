/**
 * Defects Panel
 * Shows linked defects affecting user's test scope
 */

import React from 'react';
import { Lozenge, toStatusCategory, type LozengeAppearance } from '@/components/ads';
import { Bug, ExternalLink } from 'lucide-react';
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
        <Bug className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
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
              <Bug className="h-5 w-5 text-orange-500 mt-0.5" />
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
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
