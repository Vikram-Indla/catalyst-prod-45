/**
 * Budget Scenario Planning Tab - V8 Design
 * Scenario list, create wizard, view/compare modals
 */

import { useState, useMemo, Fragment } from 'react';
import { Plus, GitBranch, Eye, GitCompare, Trash2, Check, X, ChevronRight, ChevronDown, Calendar, Filter, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type BudgetPeriod, type BudgetResource, type DepartmentBudget } from '@/hooks/budget/useBudgetData';
import { 
  useBudgetScenarios, 
  useCreateScenario, 
  useDeleteScenario,
  generatePresetScenarios,
  type BudgetScenario,
  type ScenarioExtension,
} from '@/hooks/budget/useBudgetScenarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface BudgetScenarioTabProps {
  data: {
    resources: BudgetResource[];
    departments: Record<string, DepartmentBudget>;
    licenseBudget: number;
  } | null;
  period: BudgetPeriod;
}

type WizardStep = 1 | 2 | 3 | 4;

const EXTENSION_OPTIONS = [
  { value: 0, label: 'No change' },
  { value: 1, label: '+1 month' },
  { value: 2, label: '+2 months' },
  { value: 3, label: '+3 months' },
  { value: 6, label: '+6 months' },
  { value: 9, label: '+9 months' },
  { value: 12, label: '+12 months' },
];

export function BudgetScenarioTab({ data, period }: BudgetScenarioTabProps) {
  const { data: savedScenarios = [], isLoading } = useBudgetScenarios();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  const [selectedScenario, setSelectedScenario] = useState<BudgetScenario | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareScenarios, setCompareScenarios] = useState<BudgetScenario[]>([]);
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardName, setWizardName] = useState('');
  const [wizardDeptFilter, setWizardDeptFilter] = useState<string>('all');
  const [wizardExpiryFilter, setWizardExpiryFilter] = useState<string>('all');
  const [wizardCustomDate, setWizardCustomDate] = useState<string>('');
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [resourceExtensions, setResourceExtensions] = useState<Record<string, number>>({});

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading scenario data...
      </div>
    );
  }

  // Generate baseline budget
  const baselineBudget = useMemo(() => {
    const allBudget = data.departments.all || { insourced: 0, cosourced: 0, outsourced: 0, licenses: 0, total: 0 };
    return {
      insourced: allBudget.insourced,
      cosourced: allBudget.cosourced,
      outsourced: allBudget.outsourced,
      licenses: allBudget.licenses,
      total: allBudget.total,
    };
  }, [data.departments]);

  // Generate preset scenarios from live data
  const presetScenarios = useMemo(() => 
    generatePresetScenarios(data.resources, baselineBudget),
    [data.resources, baselineBudget]
  );

  // All scenarios (presets + saved)
  const allScenarios = useMemo(() => {
    const presetsAsScenarios: BudgetScenario[] = presetScenarios.map((p, i) => ({
      ...p,
      id: `preset-${i}`,
      createdAt: new Date().toISOString(),
      createdBy: null,
      updatedAt: new Date().toISOString(),
    }));
    return [...presetsAsScenarios, ...savedScenarios];
  }, [presetScenarios, savedScenarios]);

  // Filter resources for wizard
  const filteredResources = useMemo(() => {
    let resources = data.resources.filter(r => 
      r.resourceType === 'Variable' || r.resourceType === 'Freelance'
    );

    if (wizardDeptFilter !== 'all') {
      resources = resources.filter(r => r.department === wizardDeptFilter);
    }

    if (wizardExpiryFilter === 'q1') {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        return new Date(r.contractEnd) <= new Date(2026, 2, 31);
      });
    } else if (wizardExpiryFilter === 'q2') {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        return new Date(r.contractEnd) <= new Date(2026, 5, 30);
      });
    } else if (wizardExpiryFilter === 'h2') {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        const d = new Date(r.contractEnd);
        return d >= new Date(2026, 6, 1) && d <= new Date(2026, 11, 31);
      });
    } else if (wizardExpiryFilter === 'custom' && wizardCustomDate) {
      resources = resources.filter(r => {
        if (!r.contractEnd) return false;
        return new Date(r.contractEnd) <= new Date(wizardCustomDate);
      });
    }

    return resources;
  }, [data.resources, wizardDeptFilter, wizardExpiryFilter, wizardCustomDate]);

  // Calculate wizard totals
  const wizardTotals = useMemo(() => {
    let totalDelta = 0;
    const extensions: ScenarioExtension[] = [];

    selectedResources.forEach(id => {
      const resource = data.resources.find(r => r.id === id);
      if (!resource) return;

      const months = resourceExtensions[id] || 0;
      if (months === 0) return;

      const delta = (resource.ctc || 0) * months;
      totalDelta += delta;

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
        deltaCost: delta,
        monthlyCTC: resource.ctc || 0,
        rid: resource.rid,
        role: resource.role,
        resourceType: resource.resourceType,
      });
    });

    return {
      extensions,
      totalDelta,
      newTotal: baselineBudget.total + totalDelta,
      resourceCount: extensions.filter(e => e.extensionMonths > 0).length,
    };
  }, [selectedResources, resourceExtensions, data.resources, baselineBudget]);

  // Wizard handlers
  const resetWizard = () => {
    setWizardStep(1);
    setWizardName('');
    setWizardDeptFilter('all');
    setWizardExpiryFilter('all');
    setWizardCustomDate('');
    setSelectedResources(new Set());
    setResourceExtensions({});
  };

  const openWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const handleSaveScenario = async () => {
    if (!wizardName.trim()) return;

    await createScenario.mutateAsync({
      name: wizardName,
      extensions: wizardTotals.extensions.filter(e => e.extensionMonths > 0),
      filterDepartment: wizardDeptFilter !== 'all' ? wizardDeptFilter : undefined,
      filterExpiryStart: undefined,
      filterExpiryEnd: wizardExpiryFilter === 'custom' ? wizardCustomDate : undefined,
      baselineBudget,
    });

    setWizardOpen(false);
    resetWizard();
  };

  const toggleSelectAll = () => {
    if (selectedResources.size === filteredResources.length) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(filteredResources.map(r => r.id)));
    }
  };

  const applyExtensionToAll = (months: number) => {
    const newExtensions: Record<string, number> = {};
    selectedResources.forEach(id => {
      newExtensions[id] = months;
    });
    setResourceExtensions(newExtensions);
  };

  const departments = ['all', ...Object.keys(data.departments).filter(k => k !== 'all')];

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      {/* Left: Scenario List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-sm text-slate-700">Scenarios</h3>
        </div>
        
        {/* Create Button */}
        <div className="p-3 border-b border-slate-100">
          <Button 
            onClick={openWizard}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Scenario
          </Button>
        </div>

        {/* Scenario List */}
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-auto">
          {allScenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className={cn(
                "px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50",
                selectedScenario?.id === scenario.id && "bg-blue-50 border-l-2 border-l-blue-500"
              )}
              onClick={() => setSelectedScenario(scenario)}
            >
              <div className="flex items-center gap-2 mb-1">
                {scenario.type === 'preset' ? (
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
                )}
                <span className="font-medium text-sm text-slate-800">{scenario.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-600">{formatCurrency(scenario.totalBudget)}</span>
                {scenario.deltaFromBaseline !== 0 && (
                  <span className={cn(
                    "font-mono font-medium",
                    scenario.deltaFromBaseline > 0 ? "text-amber-600" : "text-green-600"
                  )}>
                    {scenario.deltaFromBaseline > 0 ? '+' : ''}{formatCurrency(scenario.deltaFromBaseline)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Compare Button */}
        <div className="p-3 border-t border-slate-200">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => {
              if (selectedScenario) {
                setCompareScenarios([allScenarios[0], selectedScenario]);
                setCompareModalOpen(true);
              }
            }}
            disabled={!selectedScenario}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare Scenarios
          </Button>
        </div>
      </div>

      {/* Right: Scenario Detail */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {selectedScenario ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{selectedScenario.name}</h3>
                <p className="text-sm text-slate-500">{selectedScenario.description || 'No description'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewModalOpen(true)}>
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                {selectedScenario.type === 'custom' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteScenario.mutate(selectedScenario.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Budget Impact Cards */}
            <div className="p-5">
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 mb-1">Total</div>
                  <div className="font-mono text-xl font-bold text-slate-800">{formatCurrency(selectedScenario.totalBudget)}</div>
                  {selectedScenario.deltaFromBaseline !== 0 && (
                    <div className={cn("text-xs font-medium", selectedScenario.deltaFromBaseline > 0 ? "text-amber-600" : "text-green-600")}>
                      {selectedScenario.deltaFromBaseline > 0 ? '+' : ''}{formatCurrency(selectedScenario.deltaFromBaseline)}
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-blue-600 mb-1">Insourced</div>
                  <div className="font-mono text-xl font-bold text-blue-700">{formatCurrency(selectedScenario.insourcedBudget)}</div>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-teal-600 mb-1">Cosourced</div>
                  <div className="font-mono text-xl font-bold text-teal-700">{formatCurrency(selectedScenario.cosourcedBudget)}</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-amber-600 mb-1">Outsourced</div>
                  <div className="font-mono text-xl font-bold text-amber-700">{formatCurrency(selectedScenario.outsourcedBudget)}</div>
                </div>
                <div className="bg-violet-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-violet-600 mb-1">Licenses</div>
                  <div className="font-mono text-xl font-bold text-violet-700">{formatCurrency(selectedScenario.licensesBudget)}</div>
                </div>
              </div>

              {/* Extended Resources Preview */}
              {selectedScenario.scenarioData.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">
                    Extended Resources ({selectedScenario.resourceCount})
                  </h4>
                  <div className="bg-slate-50 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Resource</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Dept</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Original End</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">Extension</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">New End</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedScenario.scenarioData.slice(0, 5).map((ext, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3 py-2 font-medium text-slate-800">{ext.resourceName}</td>
                            <td className="px-3 py-2 text-slate-600">{ext.department}</td>
                            <td className="px-3 py-2 text-slate-500">{ext.originalEnd || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                +{ext.extensionMonths}mo
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-800">{ext.newEnd}</td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-amber-600">
                              +{formatCurrency(ext.deltaCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedScenario.scenarioData.length > 5 && (
                      <div className="px-4 py-2 text-xs text-slate-500 bg-slate-100 border-t">
                        +{selectedScenario.scenarioData.length - 5} more resources
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedScenario.scenarioData.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Baseline scenario — no extensions applied</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitBranch className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Scenario</h3>
            <p className="text-slate-500 max-w-sm">
              Choose a scenario from the list to view details, or create a new custom scenario.
            </p>
          </div>
        )}
      </div>

      {/* Create Wizard Modal */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Custom Scenario</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg mb-4">
            {[1, 2, 3, 4].map((step) => (
              <Fragment key={step}>
                <div className={cn(
                  "flex items-center gap-2",
                  step <= wizardStep ? "text-blue-600" : "text-slate-400"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    step < wizardStep ? "bg-blue-600 text-white" :
                    step === wizardStep ? "bg-blue-100 text-blue-600 ring-2 ring-blue-600" :
                    "bg-slate-200 text-slate-500"
                  )}>
                    {step < wizardStep ? <Check className="w-3 h-3" /> : step}
                  </div>
                  <span className="text-sm font-medium">
                    {step === 1 ? 'Name & Filter' : step === 2 ? 'Select Resources' : step === 3 ? 'Set Extensions' : 'Review'}
                  </span>
                </div>
                {step < 4 && <div className={cn("flex-1 h-0.5", step < wizardStep ? "bg-blue-600" : "bg-slate-200")} />}
              </Fragment>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-auto min-h-0">
            {wizardStep === 1 && (
              <div className="grid grid-cols-2 gap-6 p-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Scenario Name *</label>
                  <Input 
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    placeholder="e.g., Q2 Critical Extension"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Department</label>
                  <Select value={wizardDeptFilter} onValueChange={setWizardDeptFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.filter(d => d !== 'all').map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contract Expiry Filter</label>
                  <Select value={wizardExpiryFilter} onValueChange={setWizardExpiryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contracts</SelectItem>
                      <SelectItem value="q1">Q1 2026 (Jan-Mar)</SelectItem>
                      <SelectItem value="q2">Q2 2026 (Apr-Jun)</SelectItem>
                      <SelectItem value="h2">H2 2026 (Jul-Dec)</SelectItem>
                      <SelectItem value="custom">Custom Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {wizardExpiryFilter === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Before Date</label>
                    <Input 
                      type="date"
                      value={wizardCustomDate}
                      onChange={(e) => setWizardCustomDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedResources.size === filteredResources.length && filteredResources.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium text-slate-700">Select All ({filteredResources.length} resources)</span>
                  </div>
                  <span className="text-sm text-slate-500">{selectedResources.size} selected</span>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Resource</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Vendor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Contract End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Monthly CTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredResources.map(r => (
                        <tr key={r.id} className={cn(
                          "hover:bg-slate-50 cursor-pointer",
                          selectedResources.has(r.id) && "bg-blue-50"
                        )} onClick={() => {
                          const newSet = new Set(selectedResources);
                          if (newSet.has(r.id)) {
                            newSet.delete(r.id);
                          } else {
                            newSet.add(r.id);
                          }
                          setSelectedResources(newSet);
                        }}>
                          <td className="px-3 py-2">
                            <Checkbox checked={selectedResources.has(r.id)} />
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.department}</td>
                          <td className="px-3 py-2 text-slate-600">{r.resourceType}</td>
                          <td className="px-3 py-2 text-slate-600">{r.vendorName || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{r.contractEnd || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">{r.ctc ? formatCurrency(r.ctc) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-700">Set extension for each resource</span>
                  <Select onValueChange={(v) => applyExtensionToAll(parseInt(v))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Apply to all..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXTENSION_OPTIONS.slice(1).map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Resource</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Dept</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Contract End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">CTC</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">Extension</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">New End</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...selectedResources].map(id => {
                        const r = data.resources.find(x => x.id === id);
                        if (!r) return null;
                        const months = resourceExtensions[id] || 0;
                        const originalEnd = r.contractEnd ? new Date(r.contractEnd) : new Date();
                        const newEnd = new Date(originalEnd);
                        newEnd.setMonth(newEnd.getMonth() + months);
                        const delta = (r.ctc || 0) * months;

                        return (
                          <tr key={id}>
                            <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                            <td className="px-3 py-2 text-slate-600">{r.department}</td>
                            <td className="px-3 py-2 text-slate-600">{r.contractEnd || '—'}</td>
                            <td className="px-3 py-2 text-right font-mono">{r.ctc ? formatCurrency(r.ctc) : '—'}</td>
                            <td className="px-3 py-2">
                              <Select 
                                value={String(months)} 
                                onValueChange={(v) => setResourceExtensions(prev => ({...prev, [id]: parseInt(v)}))}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXTENSION_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {months > 0 ? newEnd.toISOString().split('T')[0] : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-amber-600">
                              {months > 0 ? `+${formatCurrency(delta)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Running Total */}
                <div className="mt-4 p-4 bg-amber-50 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-amber-800">
                    {wizardTotals.resourceCount} resources extended
                  </span>
                  <span className="font-mono font-bold text-amber-800">
                    Total delta: +{formatCurrency(wizardTotals.totalDelta)} SAR
                  </span>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-slate-500 mb-1">Scenario Name</div>
                    <div className="font-semibold text-slate-800">{wizardName || '—'}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-slate-500 mb-1">Resources Extended</div>
                    <div className="font-mono text-2xl font-bold text-slate-800">{wizardTotals.resourceCount}</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-amber-600 mb-1">Total Delta</div>
                    <div className="font-mono text-2xl font-bold text-amber-700">+{formatCurrency(wizardTotals.totalDelta)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-blue-600 mb-1">New Total</div>
                    <div className="font-mono text-2xl font-bold text-blue-700">{formatCurrency(wizardTotals.newTotal)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Budget Breakdown</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600">Insourced</div>
                      <div className="font-mono font-bold text-blue-700">{formatCurrency(baselineBudget.insourced + wizardTotals.totalDelta)}</div>
                      <div className="text-xs text-blue-500">+{formatCurrency(wizardTotals.totalDelta)}</div>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-teal-600">Cosourced</div>
                      <div className="font-mono font-bold text-teal-700">{formatCurrency(baselineBudget.cosourced)}</div>
                      <div className="text-xs text-teal-500">—</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-amber-600">Outsourced</div>
                      <div className="font-mono font-bold text-amber-700">{formatCurrency(baselineBudget.outsourced)}</div>
                      <div className="text-xs text-amber-500">—</div>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-violet-600">Licenses</div>
                      <div className="font-mono font-bold text-violet-700">{formatCurrency(baselineBudget.licenses)}</div>
                      <div className="text-xs text-violet-500">—</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
            <div className="flex-1" />
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep((wizardStep - 1) as WizardStep)}>
                Back
              </Button>
            )}
            {wizardStep < 4 ? (
              <Button 
                onClick={() => setWizardStep((wizardStep + 1) as WizardStep)}
                disabled={(wizardStep === 1 && !wizardName.trim()) || (wizardStep === 2 && selectedResources.size === 0)}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSaveScenario}
                disabled={createScenario.isPending || wizardTotals.resourceCount === 0}
                className="bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                {createScenario.isPending ? 'Saving...' : 'Save Scenario'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Scenario Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          {selectedScenario && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedScenario.name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-4 gap-4 my-4">
                <div className="bg-slate-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500">Total</div>
                  <div className="font-mono font-bold">{formatCurrency(selectedScenario.totalBudget)}</div>
                </div>
                <div className="bg-amber-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-700">Delta</div>
                  <div className="font-mono font-bold text-amber-700">+{formatCurrency(selectedScenario.deltaFromBaseline)}</div>
                </div>
                <div className="bg-blue-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-700">Resources</div>
                  <div className="font-mono font-bold text-blue-700">{selectedScenario.resourceCount}</div>
                </div>
                <div className="bg-green-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-700">Avg Extension</div>
                  <div className="font-mono font-bold text-green-700">{selectedScenario.avgExtensionMonths.toFixed(1)} months</div>
                </div>
              </div>

              {selectedScenario.scenarioData.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Resource</th>
                      <th className="px-3 py-2 text-left">Dept</th>
                      <th className="px-3 py-2 text-left">Original End</th>
                      <th className="px-3 py-2 text-center">Extension</th>
                      <th className="px-3 py-2 text-left">New End</th>
                      <th className="px-3 py-2 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedScenario.scenarioData.map((ext, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">{ext.resourceName}</td>
                        <td className="px-3 py-2">{ext.department}</td>
                        <td className="px-3 py-2">{ext.originalEnd}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                            +{ext.extensionMonths}mo
                          </span>
                        </td>
                        <td className="px-3 py-2">{ext.newEnd}</td>
                        <td className="px-3 py-2 text-right font-mono text-amber-600">+{formatCurrency(ext.deltaCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare Scenarios</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            {compareScenarios.map((scenario, idx) => (
              <div key={idx} className="border rounded-xl p-4">
                <h4 className="font-bold text-lg mb-4">{scenario.name}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Budget</span>
                    <span className="font-mono font-bold">{formatCurrency(scenario.totalBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delta</span>
                    <span className="font-mono font-medium text-amber-600">
                      {scenario.deltaFromBaseline > 0 ? '+' : ''}{formatCurrency(scenario.deltaFromBaseline)}
                    </span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between">
                    <span className="text-blue-600">Insourced</span>
                    <span className="font-mono">{formatCurrency(scenario.insourcedBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600">Cosourced</span>
                    <span className="font-mono">{formatCurrency(scenario.cosourcedBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-600">Outsourced</span>
                    <span className="font-mono">{formatCurrency(scenario.outsourcedBudget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-violet-600">Licenses</span>
                    <span className="font-mono">{formatCurrency(scenario.licensesBudget)}</span>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resources Extended</span>
                    <span className="font-bold">{scenario.resourceCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
