/**
 * Roadmap Legend - Bottom legend bar
 */

import React from 'react';

export function RoadmapLegend() {
  return (
    <div className="flex items-center gap-6 px-5 py-2 bg-surface-0 border-t border-border shrink-0">
      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide">Status</span>
        <div className="flex gap-3">
          <LegendItem color="#0d9488" label="On Track" />
          <LegendItem color="#d97706" label="At Risk" />
          <LegendItem color="#dc2626" label="Blocked" />
          <LegendItem color="#737373" label="Pending" />
        </div>
      </div>

      {/* Milestones */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide">Milestones</span>
        <div className="flex gap-3">
          <LegendMilestone color="#d97706" label="Strategic" />
          <LegendMilestone color="#0d9488" label="Release" />
          <LegendMilestone color="#8b5cf6" label="Decision" />
        </div>
      </div>

      {/* Dependencies */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide">Dependencies</span>
        <div className="flex gap-3">
          <LegendLine solid label="FS" />
          <LegendLine dashed label="Other" />
          <LegendLine thick label="Critical" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-text-secondary">{label}</span>
    </div>
  );
}

function LegendMilestone({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rotate-45 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-text-secondary">{label}</span>
    </div>
  );
}

function LegendLine({ solid, dashed, thick, label }: { solid?: boolean; dashed?: boolean; thick?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className={`w-3.5 rounded-sm ${thick ? 'h-[3px] bg-text-muted' : 'h-0.5 bg-border-strong'} ${dashed ? 'border-t border-dashed border-border-strong' : ''}`}
        style={dashed ? { height: 0, borderTopWidth: 2 } : {}}
      />
      <span className="text-[10px] text-text-secondary">{label}</span>
    </div>
  );
}
