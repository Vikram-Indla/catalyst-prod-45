/**
 * Test Cycles Table
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { TestCycleSummary } from '../types';

interface TestCyclesTableProps {
  cycles: TestCycleSummary[];
  releaseId?: string;
}

export function TestCyclesTable({ cycles, releaseId }: TestCyclesTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (cycleId: string) => {
    if (releaseId) {
      navigate(`/releases/${releaseId}/cycles/${cycleId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Test Cycles</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-100">
            <th className="text-left pb-2 font-medium">Cycle</th>
            <th className="text-left pb-2 font-medium">Environment</th>
            <th className="text-left pb-2 font-medium">Progress</th>
            <th className="text-left pb-2 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((cycle) => (
            <tr
              key={cycle.id}
              className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
              onClick={() => handleRowClick(cycle.id)}
            >
              <td className="py-2 font-medium text-slate-800">{cycle.name}</td>
              <td className="py-2 text-slate-600">{cycle.environment}</td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${cycle.progress}%`,
                        backgroundColor: cycle.status === 'blocked' ? 'var(--ds-text-danger, #ef4444)' : '#0d9488',
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{cycle.progress}%</span>
                </div>
              </td>
              <td className="py-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: 'var(--ds-text-brand, #2563eb)' }}
                >
                  {cycle.assignee.initials}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
