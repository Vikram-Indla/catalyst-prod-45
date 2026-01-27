/**
 * Data Quality Detail Modals - V8 Design
 * 
 * Modals that open when clicking on metric cards:
 * 1. TotalResourcesModal - Shows all resources grouped by dept
 * 2. CompleteRecordsModal - Shows only resources with CTC > 0
 * 3. MissingCTCModal - Shows only resources missing CTC with Fix All
 * 4. DataQualityBreakdownModal - Shows department breakdown with progress bars
 */

import { X, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BudgetResource } from '@/hooks/budget/useBudgetData';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, size = 'lg', children }: BaseModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col',
        sizeClasses[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ========== TOTAL RESOURCES MODAL ==========
interface TotalResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: BudgetResource[];
}

export function TotalResourcesModal({ isOpen, onClose, resources }: TotalResourcesModalProps) {
  // Group by department
  const grouped = resources.reduce((acc, r) => {
    const dept = r.department || 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(r);
    return acc;
  }, {} as Record<string, BudgetResource[]>);

  const deptOrder = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];
  const sortedDepts = Object.keys(grouped).sort((a, b) => {
    const aIdx = deptOrder.indexOf(a);
    const bIdx = deptOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="All Resources" size="xl">
      <div className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Total: <span className="font-semibold text-slate-800 dark:text-slate-200">{resources.length}</span> resources across{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{Object.keys(grouped).length}</span> departments
        </div>

        {sortedDepts.map(dept => (
          <div key={dept} className="mb-4">
            <div className="flex items-center justify-between py-2 px-3 bg-slate-100 dark:bg-slate-800 rounded-t-lg">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{dept}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{grouped[dept].length} resources</span>
            </div>
            <div className="border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">RID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Role</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {grouped[dept].map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{r.rid?.padStart(3, '0') || '—'}</td>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.role || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {r.ctc && r.ctc > 0 ? (
                          <span className="text-slate-700 dark:text-slate-300">{r.ctc.toLocaleString()}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">Missing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ========== COMPLETE RECORDS MODAL ==========
interface CompleteRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: BudgetResource[];
}

export function CompleteRecordsModal({ isOpen, onClose, resources }: CompleteRecordsModalProps) {
  const completeResources = resources.filter(r => r.ctc && r.ctc > 0);
  const totalMonthly = completeResources.reduce((sum, r) => sum + (r.ctc || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Records" size="xl">
      <div className="p-5">
        {/* Summary */}
        <div className="flex items-center gap-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
          <div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Resources with CTC</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">{completeResources.length}</div>
          </div>
          <div className="w-px h-10 bg-blue-200 dark:bg-blue-700" />
          <div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Total Monthly CTC</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">{totalMonthly.toLocaleString()} SAR</div>
          </div>
          <div className="w-px h-10 bg-blue-200 dark:bg-blue-700" />
          <div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Est. Annual</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">{(totalMonthly * 12).toLocaleString()} SAR</div>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">RID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Monthly CTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {completeResources.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{r.rid?.padStart(3, '0') || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.department}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.role || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      {r.ctc?.toLocaleString()} SAR
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ========== MISSING CTC MODAL ==========
interface MissingCTCModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: BudgetResource[];
  onFixAll: () => void;
}

export function MissingCTCModal({ isOpen, onClose, resources, onFixAll }: MissingCTCModalProps) {
  const missingResources = resources.filter(r => !r.ctc || r.ctc === 0);

  // Group by department
  const grouped = missingResources.reduce((acc, r) => {
    const dept = r.department || 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(r);
    return acc;
  }, {} as Record<string, BudgetResource[]>);

  const sortedDepts = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Missing CTC Data" size="lg">
      <div className="p-5">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-800 dark:text-amber-300">
              {missingResources.length} resources need compensation data
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Budget calculations may be incomplete until CTC values are entered.
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onFixAll();
            }}
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-700/50 rounded-md transition-colors flex items-center gap-1"
          >
            Fix All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grouped by Department */}
        {sortedDepts.map(([dept, deptResources]) => (
          <div key={dept} className="mb-3">
            <div className="flex items-center justify-between py-2 px-3 bg-slate-100 dark:bg-slate-800 rounded-t-lg">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{dept}</span>
              <span className="px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full">
                {deptResources.length} missing
              </span>
            </div>
            <div className="border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg p-3">
              <div className="flex flex-wrap gap-2">
                {deptResources.map(r => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded"
                  >
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">{r.rid?.padStart(3, '0') || '—'}</span>
                    <span className="text-slate-700 dark:text-slate-300">{r.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ========== DATA QUALITY BREAKDOWN MODAL ==========
interface DeptStats {
  name: string;
  total: number;
  complete: number;
  missing: number;
  quality: number;
}

interface DataQualityBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  deptStats: DeptStats[];
}

export function DataQualityBreakdownModal({ isOpen, onClose, deptStats }: DataQualityBreakdownModalProps) {
  // Sort by quality ascending (worst first)
  const sortedStats = [...deptStats].sort((a, b) => a.quality - b.quality);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Quality Breakdown" size="md">
      <div className="p-5">
        {sortedStats.map(stats => (
          <div key={stats.name} className="mb-5 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">{stats.name}</span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  stats.quality >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stats.quality >= 50
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {stats.quality}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  stats.quality >= 80
                    ? 'bg-emerald-500'
                    : stats.quality >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${stats.quality}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>{stats.complete} complete</span>
              <span>•</span>
              <span className={stats.missing > 0 ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                {stats.missing} missing
              </span>
              <span>•</span>
              <span>{stats.total} total</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
