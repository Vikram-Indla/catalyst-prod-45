/**
 * Scenario Detail Panel — Right panel with resource table and editing
 * Extracted from BudgetScenarioTab.tsx
 */

import { useState, useMemo } from 'react';
import { GitBranch, Eye, Trash2, RefreshCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type BudgetResource } from '@/hooks/budget/useBudgetData';
import {
  useCreateScenario,
  useDeleteScenario,
  type BudgetScenario,
  type ScenarioExtension,
  type BaselineBudget,
} from '@/hooks/budget/useBudgetScenarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const EXTENSION_OPTIONS = [
  { value: 0, label: 'No change' },
  { value: 1, label: '+1 month' },
  { value: 2, label: '+2 months' },
  { value: 3, label: '+3 months' },
  { value: 4, label: '+4 months' },
  { value: 5, label: '+5 months' },
  { value: 6, label: '+6 months' },
  { value: 7, label: '+7 months' },
  { value: 8, label: '+8 months' },
  { value: 9, label: '+9 months' },
  { value: 10, label: '+10 months' },
  { value: 11, label: '+11 months' },
  { value: 12, label: '+12 months' },
];

// Contract end date styling
function getContractDateClass(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'text-red-600 font-semibold';
  if (diffDays <= 60) return 'text-red-600 font-semibold';
  if (diffDays <= 90) return 'text-amber-600 font-medium';
  return 'text-foreground';
}

// Format date for display
function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

interface ScenarioDetailPanelProps {
  selectedScenario: BudgetScenario | null;
  filteredDetailResources: BudgetResource[];
  allResources: BudgetResource[];
  baselineBudget: BaselineBudget;
  detailExtensions: Record<string, number>;
  setDetailExtensions: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  detailSelectedResources: Set<string>;
  setDetailSelectedResources: React.Dispatch<React.SetStateAction<Set<string>>>;
  onViewDetails: () => void;
  onResetEdits: () => void;
}

export function ScenarioDetailPanel({
  selectedScenario,
  filteredDetailResources,
  allResources,
  baselineBudget,
  detailExtensions,
  setDetailExtensions,
  detailSelectedResources,
  setDetailSelectedResources,
  onViewDetails,
  onResetEdits,
}: ScenarioDetailPanelProps) {
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveScenarioName, setSaveScenarioName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Calculate current detail panel totals
  const detailTotals = useMemo(() => {
    let totalDelta = 0;
    let resourceCount = 0;

    Object.entries(detailExtensions).forEach(([id, months]) => {
      if (months > 0) {
        const resource = allResources.find(r => r.id === id);
        if (resource) {
          totalDelta += (resource.ctc || 0) * months;
          resourceCount++;
        }
      }
    });

    return { totalDelta, resourceCount };
  }, [detailExtensions, allResources]);

  const toggleDetailSelectAll = () => {
    if (detailSelectedResources.size === filteredDetailResources.length) {
      setDetailSelectedResources(new Set());
    } else {
      setDetailSelectedResources(new Set(filteredDetailResources.map(r => r.id)));
    }
  };

  const handleSaveDetailScenario = async () => {
    if (!saveScenarioName.trim() || detailTotals.resourceCount === 0) return;

    const extensions: ScenarioExtension[] = [];
    Object.entries(detailExtensions).forEach(([id, months]) => {
      if (months > 0) {
        const resource = allResources.find(r => r.id === id);
        if (resource) {
          const originalEnd = resource.contractEnd ? new Date(resource.contractEnd) : new Date();
          const newEnd = new Date(originalEnd);
          newEnd.setMonth(newEnd.getMonth() + months);

          extensions.push({
            resourceId: resource.id,
            resourceName: resource.name,
            department: resource.department,
            originalEnd: resource.contractEnd,
            extensionMonths: months,
            newEnd: newEnd.toISOString().split('T')[0],
            deltaCost: (resource.ctc || 0) * months,
            monthlyCTC: resource.ctc || 0,
            rid: resource.rid,
            role: resource.role,
            resourceType: resource.resourceType,
            vendorName: resource.vendorName || null,
          });
        }
      }
    });

    await createScenario.mutateAsync({
      name: saveScenarioName,
      extensions,
      baselineBudget,
    });

    setSaveModalOpen(false);
    setSaveScenarioName('');
    onResetEdits();
  };

  if (!selectedScenario) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GitBranch className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Scenario</h3>
          <p className="text-muted-foreground max-w-sm">
            Choose a scenario from the list to view details, or create a new custom scenario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div>
          <h3 className="font-bold text-lg text-foreground">{selectedScenario.name}</h3>
          <p className="text-sm text-muted-foreground">{selectedScenario.description || 'No description'}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetEdits}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>

          {/* View Details */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </Button>

          {/* Save Scenario -- PRIMARY CTA (always visible) */}
          <Button
            size="sm"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setSaveModalOpen(true)}
            disabled={detailTotals.resourceCount === 0}
          >
            <Save className="w-4 h-4" />
            Save Scenario
          </Button>

          {/* Delete (custom scenarios only) */}
          {selectedScenario.type === 'custom' && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Resource Table */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={detailSelectedResources.size === filteredDetailResources.length && filteredDetailResources.length > 0}
              onCheckedChange={toggleDetailSelectAll}
            />
            <span className="text-sm font-medium text-foreground">
              Select All ({filteredDetailResources.length} resources)
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {detailSelectedResources.size} selected
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 border-b">
                <tr>
                  <th className="px-3 py-2 text-left w-10"></th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[180px]">Resource</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">Dept</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[80px]">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[90px]">Vendor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[110px]">Contract End</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground min-w-[100px]">Monthly CTC</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground min-w-[140px]">Extension</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground min-w-[90px]">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDetailResources.map(r => {
                  const months = detailExtensions[r.id] || 0;
                  const delta = (r.ctc || 0) * months;
                  const isSelected = detailSelectedResources.has(r.id);

                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer transition-colors",
                        isSelected && "bg-primary/5"
                      )}
                      onClick={() => {
                        const newSet = new Set(detailSelectedResources);
                        if (newSet.has(r.id)) {
                          newSet.delete(r.id);
                        } else {
                          newSet.add(r.id);
                        }
                        setDetailSelectedResources(newSet);
                      }}
                    >
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {
                            const newSet = new Set(detailSelectedResources);
                            if (newSet.has(r.id)) {
                              newSet.delete(r.id);
                            } else {
                              newSet.add(r.id);
                            }
                            setDetailSelectedResources(newSet);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className="text-xs text-muted-foreground">RID: {r.rid}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.department}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          r.resourceType === 'Variable' ? "text-blue-600" : "text-purple-600"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            r.resourceType === 'Variable' ? "bg-blue-500" : "bg-purple-500"
                          )} />
                          {r.resourceType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.vendorName || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={cn("font-mono text-xs", getContractDateClass(r.contractEnd))}>
                          {formatDateDisplay(r.contractEnd)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">
                        {r.ctc ? formatCurrency(r.ctc) : '—'}
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <Select
                          value={String(months)}
                          onValueChange={(v) => {
                            setDetailExtensions(prev => ({...prev, [r.id]: parseInt(v)}));
                            if (parseInt(v) > 0) {
                              setDetailSelectedResources(prev => new Set(prev).add(r.id));
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXTENSION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {months > 0 ? (
                          <span className="font-semibold text-green-600">+{formatCurrency(delta)}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-4 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            Selected: <strong className="text-foreground">{detailSelectedResources.size}</strong> resources ·
            Total Extension: <strong className={cn(
              "font-mono",
              detailTotals.totalDelta > 0 ? "text-green-600" : "text-slate-400 dark:text-slate-500"
            )}>
              {detailTotals.totalDelta > 0 ? '+' : ''}{formatCurrency(detailTotals.totalDelta)} SAR
            </strong>
          </div>
        </div>
      </div>

      {/* Save Scenario Modal (from detail edits) */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Scenario Name</label>
              <Input
                value={saveScenarioName}
                onChange={(e) => setSaveScenarioName(e.target.value)}
                placeholder="Enter scenario name"
              />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resources Extended:</span>
                <strong>{detailTotals.resourceCount}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Delta:</span>
                <strong className="text-amber-600">+{formatCurrency(detailTotals.totalDelta)} SAR</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Total:</span>
                <strong>{formatCurrency(baselineBudget.total + detailTotals.totalDelta)} SAR</strong>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveDetailScenario}
              disabled={!saveScenarioName.trim() || createScenario.isPending}
              className="bg-primary"
            >
              {createScenario.isPending ? 'Saving...' : 'Save Scenario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UX-2 FIX: Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scenario?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This will permanently delete "{selectedScenario.name}". This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteScenario.mutate(selectedScenario.id);
                setDeleteConfirmOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
