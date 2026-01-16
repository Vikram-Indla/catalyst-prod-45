/**
 * Defect Summary - 4 severity cards
 */

import { motion } from 'framer-motion';
import type { DefectSummary } from '../types';

interface DefectSummaryCardProps {
  defects: DefectSummary;
}

const severityConfig = {
  blocker: { label: 'Blocker', bg: '#fee2e2', color: '#ef4444' },
  critical: { label: 'Critical', bg: '#fef3c7', color: '#d97706' },
  major: { label: 'Major', bg: '#eff6ff', color: '#2563eb' },
  minor: { label: 'Minor', bg: '#f1f5f9', color: '#64748b' },
};

export function DefectSummaryCard({ defects }: DefectSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Defect Summary</h3>
      <div className="grid grid-cols-2 gap-2">
        {(['blocker', 'critical', 'major', 'minor'] as const).map((sev) => (
          <div
            key={sev}
            className="p-3 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
            style={{ backgroundColor: severityConfig[sev].bg }}
          >
            <div className="text-2xl font-bold" style={{ color: severityConfig[sev].color }}>
              {defects[sev]}
            </div>
            <div className="text-xs font-medium" style={{ color: severityConfig[sev].color }}>
              {severityConfig[sev].label}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
