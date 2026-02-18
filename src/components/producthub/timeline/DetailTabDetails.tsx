// =====================================================
// DETAIL TAB — Details content
// =====================================================

import React from 'react';
import type { TimelineInitiative, InitiativeStatus } from '@/types/producthub/initiative';
import { STATUS_CONFIG, getPriorityFromScore } from '@/types/producthub/initiative';
import { format } from 'date-fns';

interface DetailTabDetailsProps {
  initiative: TimelineInitiative;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1">
      {label}
    </div>
    <div className="text-[13px] text-foreground">{children}</div>
  </div>
);

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '—'; }
}

export const DetailTabDetails: React.FC<DetailTabDetailsProps> = ({ initiative }) => {
  const statusCfg = STATUS_CONFIG[initiative.status];
  const priority = getPriorityFromScore(initiative.computed_score);

  return (
    <div className="p-5 space-y-5">
      {/* 2-col grid */}
      <div className="grid grid-cols-2 gap-4 gap-x-6">
        <Field label="Status">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusCfg.color }} />
            <span>{statusCfg.label}</span>
          </div>
        </Field>
        <Field label="EA Review">
          <span className="text-muted-foreground">—</span>
        </Field>

        <Field label="Priority">
          <span className="capitalize">{priority}</span>
          {initiative.computed_score !== null && (
            <span className="ml-1 text-[11px] text-muted-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ({initiative.computed_score.toFixed(2)})
            </span>
          )}
        </Field>
        <Field label="Target Quarter">
          {initiative.target_quarter ?? '—'}
        </Field>

        <Field label="Reporter">
          <span className="text-muted-foreground">—</span>
        </Field>
        <Field label="Assignee">
          {initiative.assignee_name ?? <span className="text-muted-foreground">Unassigned</span>}
        </Field>

        <Field label="Department">
          {initiative.department_name ?? <span className="text-muted-foreground">—</span>}
        </Field>
        <Field label="Business Owner">
          <span className="text-muted-foreground">—</span>
        </Field>

        <Field label="Business Ask Date">
          {formatDate(initiative.business_ask_date)}
        </Field>
        <Field label="Kickoff Date">
          {formatDate(initiative.kickoff_date)}
        </Field>

        <Field label="Target Complete">
          {formatDate(initiative.target_complete)}
        </Field>
        <Field label="Progress">
          <div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, initiative.progress)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {initiative.progress}%
            </span>
          </div>
        </Field>
      </div>

      {/* Description */}
      <div className="border-t border-border/50 pt-4">
        <h4 className="text-[13px] font-semibold text-foreground mb-2">Description</h4>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {initiative.description
            ? (typeof initiative.description === 'string' ? initiative.description : JSON.stringify(initiative.description))
            : 'No description provided for this initiative.'}
        </p>
      </div>
    </div>
  );
};

export default DetailTabDetails;
