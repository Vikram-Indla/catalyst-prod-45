/**
 * InitiativeBudgetTab — Summary cards, CapEx/OpEx split, line items, inline add form.
 * Fixed: allocated budget input, remaining card color, fiscal quarter dropdown, placeholder.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { Plus, Wallet, ChevronDown } from 'lucide-react';

interface InitiativeBudgetTabProps {
  initiativeId: string;
  budgetAllocated: number;
  onBudgetAllocatedChange?: (value: string) => void;
}

const BUDGET_CATEGORIES = ['development', 'infrastructure', 'consulting', 'licensing', 'training', 'operations', 'contingency', 'other'];
const FISCAL_QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027'];

export function InitiativeBudgetTab({ initiativeId, budgetAllocated, onBudgetAllocatedChange }: InitiativeBudgetTabProps) {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showQtrDropdown, setShowQtrDropdown] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    category: 'development', description: '', expense_type: 'opex',
    planned_amount: '', vendor: '', po_number: '', fiscal_quarter: '',
  });

  const { data: budgetItems = [], refetch: refetchBudget } = useQuery({
    queryKey: ['initiative-budget', initiativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_initiative_budget_items')
        .select('*, creator:profiles!created_by(id, full_name)')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const totalPlanned = budgetItems.reduce((sum: number, i: any) => sum + (Number(i.planned_amount) || 0), 0);
  const totalActual = budgetItems.reduce((sum: number, i: any) => sum + (Number(i.actual_amount) || 0), 0);
  const remaining = budgetAllocated - totalActual;
  const noBudgetSet = budgetAllocated === 0;

  const handleCreateBudgetItem = async () => {
    if (!budgetForm.description.trim() || !budgetForm.planned_amount) return;
    const { error } = await supabase.from('ph_initiative_budget_items').insert({
      initiative_id: initiativeId, category: budgetForm.category,
      description: budgetForm.description.trim(), expense_type: budgetForm.expense_type,
      planned_amount: parseFloat(budgetForm.planned_amount),
      vendor: budgetForm.vendor.trim() || null, po_number: budgetForm.po_number.trim() || null,
      fiscal_quarter: budgetForm.fiscal_quarter || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (error) { catalystToast.error('Failed to add budget item'); return; }
    catalystToast.success('Budget item added');
    refetchBudget();
    setShowAddBudget(false);
    setBudgetForm({ category: 'development', description: '', expense_type: 'opex', planned_amount: '', vendor: '', po_number: '', fiscal_quarter: '' });
  };

  // Remaining card color: neutral when no budget set
  const remainingPct = budgetAllocated > 0 ? (remaining / budgetAllocated) * 100 : 0;
  const remainingCardClass = noBudgetSet
    ? 'bg-zinc-50 border-zinc-200'
    : remainingPct > 20 ? 'bg-emerald-50 border-emerald-200' : remainingPct > 5 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const remainingTextClass = noBudgetSet
    ? 'text-zinc-500'
    : remainingPct > 20 ? 'text-emerald-600' : remainingPct > 5 ? 'text-amber-600' : 'text-red-600';
  const remainingValueClass = noBudgetSet
    ? 'text-zinc-900'
    : remainingPct > 20 ? 'text-emerald-900' : remainingPct > 5 ? 'text-amber-900' : 'text-red-900';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Budget</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{budgetItems.length} line item{budgetItems.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddBudget(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      {/* Total Allocated Budget Input */}
      {onBudgetAllocatedChange && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Allocated Budget</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">SAR</span>
            <input
              type="number"
              value={budgetAllocated || ''}
              onChange={(e) => onBudgetAllocatedChange(e.target.value)}
              className="w-40 px-3 py-1.5 text-sm font-semibold border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter total budget"
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Allocated</p>
          <p className="text-lg font-bold text-blue-900 mt-1">SAR {budgetAllocated.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Actual Spend</p>
          <p className="text-lg font-bold text-zinc-900 mt-1">SAR {totalActual.toLocaleString()}</p>
          {budgetAllocated > 0 && <p className="text-[10px] text-zinc-400 mt-0.5">{Math.round((totalActual / budgetAllocated) * 100)}% of allocated</p>}
        </div>
        <div className={`border rounded-lg p-3 ${remainingCardClass}`}>
          <p className={`text-[10px] font-medium uppercase tracking-wide ${remainingTextClass}`}>Remaining</p>
          <p className={`text-lg font-bold mt-1 ${remainingValueClass}`}>
            SAR {remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* CapEx / OpEx Split — always show when items exist */}
      {budgetItems.length > 0 && (() => {
        const capexItems = budgetItems.filter((i: any) => i.expense_type === 'capex');
        const opexItems = budgetItems.filter((i: any) => i.expense_type === 'opex');
        const capexPlanned = capexItems.reduce((s: number, i: any) => s + (Number(i.planned_amount) || 0), 0);
        const capexActual = capexItems.reduce((s: number, i: any) => s + (Number(i.actual_amount) || 0), 0);
        const opexPlanned = opexItems.reduce((s: number, i: any) => s + (Number(i.planned_amount) || 0), 0);
        const opexActual = opexItems.reduce((s: number, i: any) => s + (Number(i.actual_amount) || 0), 0);
        return (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border border-zinc-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs font-semibold text-zinc-700">CapEx</span>
                <span className="text-[10px] text-zinc-400 ml-auto">{capexItems.length} items</span>
              </div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Planned</span><span className="text-zinc-700 font-medium">SAR {capexPlanned.toLocaleString()}</span></div>
              <div className="flex items-center justify-between text-[11px] mt-1"><span className="text-zinc-500">Actual</span><span className="text-zinc-700 font-medium">SAR {capexActual.toLocaleString()}</span></div>
            </div>
            <div className="border border-zinc-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" /><span className="text-xs font-semibold text-zinc-700">OpEx</span>
                <span className="text-[10px] text-zinc-400 ml-auto">{opexItems.length} items</span>
              </div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Planned</span><span className="text-zinc-700 font-medium">SAR {opexPlanned.toLocaleString()}</span></div>
              <div className="flex items-center justify-between text-[11px] mt-1"><span className="text-zinc-500">Actual</span><span className="text-zinc-700 font-medium">SAR {opexActual.toLocaleString()}</span></div>
            </div>
          </div>
        );
      })()}

      {/* Inline Add Form */}
      {showAddBudget && (
        <div className="border border-zinc-200 rounded-lg p-5 bg-zinc-50 space-y-4 mb-6">
          <h4 className="text-xs font-semibold text-zinc-700">New Budget Item</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Category *</label>
              <button type="button" onClick={() => setShowCatDropdown(v => !v)}
                className="w-full flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-50">
                <span className="capitalize">{budgetForm.category}</span><ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>
              {showCatDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                  {BUDGET_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setBudgetForm(f => ({ ...f, category: cat })); setShowCatDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs capitalize transition-colors ${budgetForm.category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Expense Type *</label>
              <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
                <button type="button" onClick={() => setBudgetForm(f => ({ ...f, expense_type: 'capex' }))}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${budgetForm.expense_type === 'capex' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}>CapEx</button>
                <button type="button" onClick={() => setBudgetForm(f => ({ ...f, expense_type: 'opex' }))}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${budgetForm.expense_type === 'opex' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}>OpEx</button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Description *</label>
            <textarea value={budgetForm.description} onChange={e => setBudgetForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="What does this cover..." className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Planned Amount (SAR) *</label>
              <input type="number" value={budgetForm.planned_amount} onChange={e => setBudgetForm(f => ({ ...f, planned_amount: e.target.value }))}
                placeholder="Enter amount" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div className="relative">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Fiscal Quarter</label>
              <button type="button" onClick={() => setShowQtrDropdown(v => !v)}
                className="w-full flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-50">
                <span>{budgetForm.fiscal_quarter || 'Select quarter'}</span><ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>
              {showQtrDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                  {FISCAL_QUARTERS.map(q => (
                    <button key={q} onClick={() => { setBudgetForm(f => ({ ...f, fiscal_quarter: q })); setShowQtrDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${budgetForm.fiscal_quarter === q ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Vendor</label>
              <input value={budgetForm.vendor} onChange={e => setBudgetForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder="Vendor name" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">PO Number</label>
              <input value={budgetForm.po_number} onChange={e => setBudgetForm(f => ({ ...f, po_number: e.target.value }))}
                placeholder="PO-12345" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setShowAddBudget(false)}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreateBudgetItem} disabled={!budgetForm.description.trim() || !budgetForm.planned_amount}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">Save Item</button>
          </div>
        </div>
      )}

      {/* Line Items */}
      {budgetItems.length === 0 && !showAddBudget ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
            <Wallet className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600">No budget items yet</p>
          <p className="text-xs text-zinc-400 mt-1">Add budget line items to track planned and actual spending</p>
          <button onClick={() => setShowAddBudget(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {budgetItems.map((item: any) => {
            const statusBg = item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
              item.status === 'paid' ? 'bg-blue-50 text-blue-700' :
              item.status === 'pending_approval' ? 'bg-amber-50 text-amber-700' :
              item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-600';
            const variance = (Number(item.planned_amount) || 0) - (Number(item.actual_amount) || 0);
            return (
              <div key={item.id} className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.expense_type === 'capex' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                      {item.expense_type === 'capex' ? 'CapEx' : 'OpEx'}
                    </span>
                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full capitalize">{item.category}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBg}`}>
                    {(item.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-900 mb-2">{item.description}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-[10px] text-zinc-400 uppercase">Planned</p><p className="text-sm font-semibold text-zinc-700">SAR {Number(item.planned_amount).toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-zinc-400 uppercase">Actual</p><p className="text-sm font-semibold text-zinc-700">SAR {Number(item.actual_amount || 0).toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-zinc-400 uppercase">Variance</p><p className={`text-sm font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{variance >= 0 ? '+' : ''}SAR {variance.toLocaleString()}</p></div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100">
                  <div className="flex items-center gap-3">
                    {item.vendor && <span className="text-[10px] text-zinc-500">Vendor: {item.vendor}</span>}
                    {item.po_number && <span className="text-[10px] text-zinc-500">PO: {item.po_number}</span>}
                    {item.fiscal_quarter && <span className="text-[10px] text-zinc-500">{item.fiscal_quarter}</span>}
                  </div>
                  <span className="text-[10px] text-zinc-400">{item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {month:'short',day:'numeric'}) : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
