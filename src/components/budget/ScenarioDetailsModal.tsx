/**
 * Scenario Details Modal — Redesigned V2
 * Two variants: Baseline (no changes) vs Scenario with changes
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Info, ArrowRight, Users, Calendar, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyConfig';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ScenarioResource {
  resourceName: string;
  rid?: string;
  department: string;
  originalEnd: string;
  newEnd: string;
  extensionMonths: number;
  deltaCost: number;
}

export interface ScenarioBreakdown {
  insourced: number;
  cosourced: number;
  outsourced: number;
  licenses: number;
}

export interface ScenarioData {
  id: string;
  name: string;
  description?: string;
  type: 'preset' | 'custom';
  totalBudget: number;
  deltaFromBaseline: number;
  resourceCount: number;
  avgExtensionMonths: number;
  insourcedBudget: number;
  cosourcedBudget: number;
  outsourcedBudget: number;
  licensesBudget: number;
  scenarioData: ScenarioResource[];
}

interface ScenarioDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ScenarioData | null;
  baselineBreakdown: ScenarioBreakdown;
  onCompare: () => void;
  onExport?: () => void;
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
};

const CATEGORY_COLORS = {
  insourced: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  cosourced: '#0d9488',
  outsourced: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))',
  licenses: '#7c3aed',
} as const;

export function ScenarioDetailsModal({
  isOpen,
  onClose,
  scenario,
  baselineBreakdown,
  onCompare,
  onExport,
}: ScenarioDetailsModalProps) {
  if (!scenario) return null;

  const isBaseline = scenario.deltaFromBaseline === 0 && scenario.scenarioData.length === 0;
  const total = scenario.totalBudget;

  // Categories for baseline view with percentages
  const categories = [
    { 
      name: 'Insourced', 
      value: scenario.insourcedBudget, 
      color: CATEGORY_COLORS.insourced, 
      percent: total > 0 ? (scenario.insourcedBudget / total) * 100 : 0 
    },
    { 
      name: 'Outsourced', 
      value: scenario.outsourcedBudget, 
      color: CATEGORY_COLORS.outsourced, 
      percent: total > 0 ? (scenario.outsourcedBudget / total) * 100 : 0 
    },
    { 
      name: 'Cosourced', 
      value: scenario.cosourcedBudget, 
      color: CATEGORY_COLORS.cosourced, 
      percent: total > 0 ? (scenario.cosourcedBudget / total) * 100 : 0 
    },
    { 
      name: 'Licenses', 
      value: scenario.licensesBudget, 
      color: CATEGORY_COLORS.licenses, 
      percent: total > 0 ? (scenario.licensesBudget / total) * 100 : 0 
    },
  ].sort((a, b) => b.value - a.value);

  // Category breakdown for scenario with changes
  const categoryBreakdown = [
    { 
      key: 'insourced', 
      name: 'Insourced', 
      color: CATEGORY_COLORS.insourced,
      before: baselineBreakdown.insourced, 
      after: scenario.insourcedBudget,
      delta: scenario.insourcedBudget - baselineBreakdown.insourced
    },
    { 
      key: 'cosourced', 
      name: 'Cosourced', 
      color: CATEGORY_COLORS.cosourced,
      before: baselineBreakdown.cosourced, 
      after: scenario.cosourcedBudget,
      delta: scenario.cosourcedBudget - baselineBreakdown.cosourced
    },
    { 
      key: 'outsourced', 
      name: 'Outsourced', 
      color: CATEGORY_COLORS.outsourced,
      before: baselineBreakdown.outsourced, 
      after: scenario.outsourcedBudget,
      delta: scenario.outsourcedBudget - baselineBreakdown.outsourced
    },
    { 
      key: 'licenses', 
      name: 'Licenses', 
      color: CATEGORY_COLORS.licenses,
      before: baselineBreakdown.licenses, 
      after: scenario.licensesBudget,
      delta: scenario.licensesBudget - baselineBreakdown.licenses
    },
  ];

  // Baseline Modal Variant
  if (isBaseline) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 pr-14">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{scenario.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{scenario.description || 'Current portfolio state'}</p>
            </div>
            {/* Close button provided by DialogContent */}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Total */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Current Portfolio
              </span>
              <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Category Breakdown with Progress Bars */}
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.name}>
                  {/* Label + Value */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: cat.color }}>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(cat.value)}
                      </span>
                      <span className="text-xs text-slate-400 w-10 text-right">
                        {cat.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    This is the current state with no extensions applied.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select a different scenario to see budget impact, or create a new scenario.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <Button variant="ghost" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={onCompare} className="bg-blue-600 hover:bg-blue-700 text-white">
              Compare Scenarios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Scenario with Changes Modal Variant
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 pr-14">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{scenario.name}</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-slate-700 text-white rounded">
                  {scenario.type}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{scenario.description || 'Scenario details'}</p>
            </div>
          </div>
          {/* Close button provided by DialogContent */}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
          {/* Baseline */}
          <div className="text-center">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Baseline
            </div>
            <div className="font-mono text-lg font-semibold text-slate-600 dark:text-slate-400">
              {formatCurrency(total - scenario.deltaFromBaseline)}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>

          {/* Projected */}
          <div className="text-center">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Projected
            </div>
            <div className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatCurrency(total)}
            </div>
          </div>

          {/* Delta */}
          <div className="text-center">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Delta
            </div>
            <div className={cn(
              "font-mono text-lg font-bold",
              scenario.deltaFromBaseline > 0 ? "text-green-600" : "text-slate-400"
            )}>
              {scenario.deltaFromBaseline > 0 ? '+' : ''}{formatCurrency(scenario.deltaFromBaseline)}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-8 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{scenario.resourceCount}</span> resources extended
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Avg <span className="font-semibold">{scenario.avgExtensionMonths.toFixed(0)}</span> months
            </span>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Budget Impact by Category */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
              Budget Impact by Category
            </h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Before</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase w-10"></th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">After</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categoryBreakdown.map((cat) => (
                    <tr key={cat.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: cat.color }}>
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {formatCurrency(cat.before)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cat.delta > 0 ? (
                          <ArrowRight className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(cat.after)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {cat.delta > 0 ? (
                          <span className="text-green-600">+{formatCurrency(cat.delta)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resources Extended */}
          {scenario.scenarioData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                Resources Extended ({scenario.scenarioData.length})
              </h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Resource</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Dept</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Current End</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Extension</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Cost Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {scenario.scenarioData.map((resource, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{resource.resourceName}</div>
                          {resource.rid && (
                            <div className="text-xs text-slate-500 font-mono">{resource.rid}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {resource.department}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-red-600 dark:text-red-400 font-medium font-mono text-xs">
                            {formatDateDisplay(resource.originalEnd)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                            +{resource.extensionMonths} mo
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-semibold text-green-600">
                            +{formatCurrency(resource.deltaCost)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Total Row */}
                  <tfoot className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        Total Extension Cost:
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-600">
                        +{formatCurrency(scenario.deltaFromBaseline)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
          <Button 
            variant="ghost" 
            onClick={onExport}
            className="inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={onCompare} className="bg-blue-600 hover:bg-blue-700 text-white">
              Compare Scenarios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
