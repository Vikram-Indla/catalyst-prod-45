/**
 * Data Quality Detail Modals - V8 Design
 * 
 * Modals that open when clicking on metric cards:
 * 1. TotalResourcesModal - Shows all resources grouped by dept
 * 2. CompleteRecordsModal - Shows only resources with CTC > 0
 * 3. MissingCTCModal - Shows only resources missing CTC with Fix All
 * 4. DataQualityBreakdownModal - Shows department breakdown with progress bars
 */

import { X, AlertTriangle, ChevronRight } from '@/lib/atlaskit-icons';
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
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--ds-blanket)' }} onClick={onClose} />
      <div className={cn(
        'relative w-full rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col',
        sizeClasses[size]
      )} style={{ background: 'var(--ds-surface-overlay)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--ds-text)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral))'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X className="w-5 h-5" style={{ color: 'var(--ds-icon-subtle)' }} />
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
        <div className="text-sm mb-4" style={{ color: 'var(--ds-text-subtle)' }}>
          Total: <span className="font-semibold" style={{ color: 'var(--ds-text)' }}>{resources.length}</span> resources across{' '}
          <span className="font-semibold" style={{ color: 'var(--ds-text)' }}>{Object.keys(grouped).length}</span> departments
        </div>

        {sortedDepts.map(dept => (
          <div key={dept} className="mb-4">
            <div className="flex items-center justify-between py-2 px-3 rounded-t-lg" style={{ background: 'var(--ds-background-neutral)' }}>
              <span className="font-semibold" style={{ color: 'var(--ds-text)' }}>{dept}</span>
              <span className="text-sm" style={{ color: 'var(--ds-text-subtle)' }}>{grouped[dept].length} resources</span>
            </div>
            <div className="border border-t-0 rounded-b-lg overflow-hidden" style={{ borderColor: 'var(--ds-border)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--ds-surface-sunken)' }}>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>RID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>Role</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--ds-border)' }}>
                  {grouped[dept].map(r => (
                    <tr key={r.id} className="hover:opacity-90" style={{ background: 'transparent' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--ds-text-subtle)' }}>{r.rid?.padStart(3, '0') || '—'}</td>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--ds-text)' }}>{r.name}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--ds-text-subtle)' }}>{r.role || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {/* CTC is considered present even if the value is 0; only null/undefined means missing */}
                        {r.ctc !== null && r.ctc !== undefined ? (
                          <span style={{ color: 'var(--ds-text)' }}>{r.ctc.toLocaleString()}</span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-warning)' }}>Missing</span>
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
  const completeResources = resources.filter(r => r.ctc !== null && r.ctc !== undefined);
  const totalMonthly = completeResources.reduce((sum, r) => sum + (r.ctc || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Records" size="xl">
      <div className="p-5">
        {/* Summary */}
        <div className="flex items-center gap-6 p-4 border rounded-lg mb-4" style={{ background: 'var(--ds-background-information)', borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="text-sm" style={{ color: 'var(--ds-text-information)' }}>Resources with CTC</div>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--ds-text-information)' }}>{completeResources.length}</div>
          </div>
          <div className="w-px h-10" style={{ background: 'var(--ds-border)' }} />
          <div>
            <div className="text-sm" style={{ color: 'var(--ds-text-information)' }}>Total Monthly CTC</div>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--ds-text-information)' }}>{totalMonthly.toLocaleString()} SAR</div>
          </div>
          <div className="w-px h-10" style={{ background: 'var(--ds-border)' }} />
          <div>
            <div className="text-sm" style={{ color: 'var(--ds-text-information)' }}>Est. Annual</div>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--ds-text-information)' }}>{(totalMonthly * 12).toLocaleString()} SAR</div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--ds-surface-sunken)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>RID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>Role</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: 'var(--ds-text-subtle)' }}>Monthly CTC</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--ds-border)' }}>
                {completeResources.map(r => (
                  <tr key={r.id} className="hover:opacity-90">
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--ds-text-subtle)' }}>{r.rid?.padStart(3, '0') || '—'}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--ds-text)' }}>{r.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--ds-text-subtle)' }}>{r.department}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--ds-text-subtle)' }}>{r.role || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium" style={{ color: 'var(--ds-text)' }}>
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
  const missingResources = resources.filter(r => r.ctc === null || r.ctc === undefined);

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
        <div className="flex items-start gap-3 p-4 border rounded-lg mb-4" style={{ background: 'var(--ds-background-warning)', borderColor: 'var(--ds-border)' }}>
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--ds-icon-warning, var(--ds-text-warning))' }} />
          <div className="flex-1">
            <div className="font-medium" style={{ color: 'var(--ds-text-warning)' }}>
              {missingResources.length} resources need compensation data
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--ds-text-warning)' }}>
              Budget calculations may be incomplete until CTC values are entered.
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onFixAll();
            }}
            className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 hover:opacity-80"
            style={{ color: 'var(--ds-text-warning)', background: 'var(--ds-background-warning-bold, var(--ds-background-warning))' }}
          >
            Fix All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grouped by Department */}
        {sortedDepts.map(([dept, deptResources]) => (
          <div key={dept} className="mb-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-t-lg" style={{ background: 'var(--ds-background-neutral)' }}>
              <span className="font-semibold" style={{ color: 'var(--ds-text)' }}>{dept}</span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ color: 'var(--ds-text-danger)', background: 'var(--ds-background-danger)' }}>
                {deptResources.length} missing
              </span>
            </div>
            <div className="border border-t-0 rounded-b-lg p-3" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="flex flex-wrap gap-2">
                {deptResources.map(r => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-sm border rounded"
                    style={{ background: 'var(--ds-surface-sunken)', borderColor: 'var(--ds-border)' }}
                  >
                    <span className="font-mono text-xs" style={{ color: 'var(--ds-text-subtle)' }}>{r.rid?.padStart(3, '0') || '—'}</span>
                    <span style={{ color: 'var(--ds-text-subtle)' }}>{r.name}</span>
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
        {sortedStats.map(stats => {
          const qualityColor = stats.quality >= 80
            ? 'var(--ds-text-success)'
            : stats.quality >= 50
            ? 'var(--ds-text-warning)'
            : 'var(--ds-text-danger)';
          const qualityBg = stats.quality >= 80
            ? 'var(--ds-background-success-bold, var(--ds-text-success))'
            : stats.quality >= 50
            ? 'var(--ds-background-warning-bold, var(--ds-text-warning))'
            : 'var(--ds-background-danger-bold, var(--ds-text-danger))';
          return (
          <div key={stats.name} className="mb-5 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium" style={{ color: 'var(--ds-text)' }}>{stats.name}</span>
              <span
                className="text-sm font-semibold"
                style={{ color: qualityColor }}
              >
                {stats.quality}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--ds-background-neutral)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${stats.quality}%`, background: qualityBg }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ds-text-subtle)' }}>
              <span>{stats.complete} complete</span>
              <span>•</span>
              <span style={stats.missing > 0 ? { color: 'var(--ds-text-danger)', fontWeight: 500 } : undefined}>
                {stats.missing} missing
              </span>
              <span>•</span>
              <span>{stats.total} total</span>
            </div>
          </div>
          );
        })}
      </div>
    </Modal>
  );
}
