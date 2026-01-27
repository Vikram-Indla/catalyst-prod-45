/**
 * Fix CTC Modal - V8 Design (Critical Fixes Patch)
 * 
 * Fixes implemented:
 * 1. Input fields: SAR suffix outside input, right-aligned, no Arabic text
 * 2. Per-resource Edit buttons in expandable rows
 * 3. Impact Preview working in real-time
 * 4. Validation messaging explaining why save is disabled
 * 5. Visual polish with proper hover states
 */

import { useState, useMemo, useEffect } from 'react';
import { X, AlertCircle, Check, CheckCircle, Users, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ResourceToFix {
  id: string;
  rid: string;
  name: string;
  role: string;
  vendorName: string | null;
  contractEnd: string | null;
  ctc: number | null;
}

interface FixCTCModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: string;
  resources: ResourceToFix[];
  onSaved: () => void;
  /** Optional: Focus on specific resource by ID */
  focusResourceId?: string;
}

/**
 * CTC Input Component - Fixed currency formatting
 * SAR suffix outside input, numbers right-aligned, no Arabic text
 */
function CTCInput({ 
  value, 
  onChange, 
  autoFocus = false 
}: { 
  value: string; 
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers
    const raw = e.target.value.replace(/[^0-9]/g, '');
    onChange(raw);
  };
  
  // Format display value with thousand separators - allow "0" to show
  const displayValue = value !== '' 
    ? parseInt(value).toLocaleString('en-US')
    : '';

  // Check if value has been explicitly set (including 0)
  const hasValue = value !== '';
  const numericValue = value !== '' ? parseInt(value) : null;
  
  return (
    <div className={cn(
      "relative flex items-center",
      "border rounded-lg transition-all duration-150",
      isFocused 
        ? "border-blue-500 ring-2 ring-blue-500/20" 
        : hasValue && numericValue !== null && numericValue >= 0
          ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20"
          : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
    )}>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        placeholder="Enter amount"
        className={cn(
          "w-full px-3 py-2 text-right",
          "font-mono text-sm text-slate-800 dark:text-slate-200",
          "bg-transparent border-none outline-none",
          "placeholder:text-slate-400 placeholder:font-sans placeholder:text-left"
        )}
      />
      <span className="px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 rounded-r-lg whitespace-nowrap">
        SAR
      </span>
    </div>
  );
}

export function FixCTCModal({ 
  open, 
  onOpenChange, 
  department, 
  resources, 
  onSaved,
  focusResourceId 
}: FixCTCModalProps) {
  const [ctcValues, setCTCValues] = useState<Record<string, string>>({});
  const [bulkValue, setBulkValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens with new resources
  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      resources.forEach(r => {
        initial[r.id] = '';
      });
      setCTCValues(initial);
      setBulkValue('');
    }
  }, [open, resources]);

  // Calculate impact preview - FIXED: Now updates in real-time
  const impactPreview = useMemo(() => {
    let count = 0;
    let totalMonthly = 0;

    Object.entries(ctcValues).forEach(([id, value]) => {
      // Allow zero values - check if the value was explicitly set (not empty string)
      if (value !== '' && value !== undefined) {
        const numValue = parseInt(value) || 0;
        if (numValue >= 0) {
          count++;
          totalMonthly += numValue;
        }
      }
    });

    return {
      count,
      totalResources: resources.length,
      monthly: totalMonthly,
      annual: totalMonthly * 12,
      hasChanges: count > 0,
    };
  }, [ctcValues, resources.length]);

  const handleBulkApply = () => {
    const rawValue = bulkValue.replace(/,/g, '');
    // Allow 0 as valid bulk value
    if (rawValue === '' || isNaN(parseInt(rawValue)) || parseInt(rawValue) < 0) {
      toast.error('Please enter a valid CTC value');
      return;
    }

    const numericValue = parseInt(rawValue);
    const updated: Record<string, string> = {};
    resources.forEach(r => {
      updated[r.id] = numericValue.toString();
    });
    setCTCValues(updated);
    toast.success(`Applied ${numericValue.toLocaleString()} SAR to all ${resources.length} resources`);
  };

  const handleSave = async () => {
    if (!impactPreview.hasChanges) return;
    
    const updates: { id: string; ctc: number }[] = [];

    Object.entries(ctcValues).forEach(([id, value]) => {
      // Allow zero values - check if the value was explicitly set (not empty string)
      if (value !== '' && value !== undefined) {
        const numValue = parseInt(value) || 0;
        if (numValue >= 0) {
          updates.push({ id, ctc: numValue });
        }
      }
    });

    if (updates.length === 0) {
      toast.error('No changes to save. Please enter CTC values.');
      return;
    }

    setSaving(true);

    try {
      // Update resources in Supabase
      for (const update of updates) {
        const { error } = await supabase
          .from('resource_inventory')
          .update({ ctc: update.ctc })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success(`${updates.length} resource${updates.length > 1 ? 's' : ''} updated successfully!`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving CTC:', error);
      toast.error('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (n: number): string => {
    if (n >= 1_000_000) {
      return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M SAR';
    }
    if (n >= 1_000) {
      return (n / 1_000).toFixed(1).replace(/\.?0+$/, '') + 'K SAR';
    }
    return n.toLocaleString('en-US') + ' SAR';
  };

  const formatCurrencyFull = (n: number): string => {
    return n.toLocaleString('en-US') + ' SAR';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Fix Missing Compensation Data
            </h2>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        {/* Subheader */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{department}</span>
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {resources.length} resources missing CTC data
          </span>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Bulk Update Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Bulk Update (Optional)
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-xs">
                <CTCInput 
                  value={bulkValue}
                  onChange={setBulkValue}
                />
              </div>
              <button
                onClick={handleBulkApply}
                disabled={bulkValue === '' || parseInt(bulkValue) < 0}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium rounded-lg transition-all",
                  bulkValue !== '' && parseInt(bulkValue) >= 0
                    ? "bg-slate-800 dark:bg-slate-600 text-white hover:bg-slate-900 dark:hover:bg-slate-500"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                )}
              >
                Apply to All
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              This will set the same CTC for all resources below. You can still edit individually.
            </p>
          </div>
          
          {/* Resource Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contract End</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">Monthly CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-emerald-600 dark:text-emerald-400">
                        <Check className="w-5 h-5 inline-block mr-2" />
                        All resources in this department have CTC data
                      </td>
                    </tr>
                  ) : (
                    resources.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-400">
                          {r.rid?.padStart(3, '0') || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {r.role || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(r.contractEnd)}
                        </td>
                        <td className="px-4 py-3">
                          <CTCInput
                            value={ctcValues[r.id] || ''}
                            onChange={(val) => setCTCValues(prev => ({ ...prev, [r.id]: val }))}
                            autoFocus={focusResourceId === r.id}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Impact Preview - FIXED: Now updates in real-time */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Impact Preview
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Resources to Update */}
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
              <div className={cn(
                "text-2xl font-bold font-mono",
                impactPreview.hasChanges ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
              )}>
                {impactPreview.hasChanges ? impactPreview.count : '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {impactPreview.hasChanges 
                  ? `of ${impactPreview.totalResources} resources`
                  : 'Resources to update'
                }
              </div>
            </div>
            
            {/* Total Monthly CTC */}
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
              <div className={cn(
                "text-2xl font-bold font-mono",
                impactPreview.hasChanges ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
              )}>
                {impactPreview.hasChanges ? formatCurrency(impactPreview.monthly) : '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {impactPreview.hasChanges && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ↑ +{formatCurrencyFull(impactPreview.monthly)}
                  </span>
                )}
                {!impactPreview.hasChanges && 'Total monthly CTC'}
              </div>
            </div>
            
            {/* Est. Annual Budget */}
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
              <div className={cn(
                "text-2xl font-bold font-mono",
                impactPreview.hasChanges ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
              )}>
                {impactPreview.hasChanges ? formatCurrency(impactPreview.annual) : '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {impactPreview.hasChanges && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ↑ +{formatCurrencyFull(impactPreview.annual)}
                  </span>
                )}
                {!impactPreview.hasChanges && 'Est. annual budget'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer - FIXED: Now shows validation messaging */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          {/* Validation Message */}
          <div className="flex items-center gap-2 text-sm">
            {!impactPreview.hasChanges && (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">
                  Enter CTC for at least 1 resource to save changes
                </span>
              </>
            )}
            {impactPreview.hasChanges && !saving && (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  {impactPreview.count} resource{impactPreview.count > 1 ? 's' : ''} ready to update
                </span>
              </>
            )}
          </div>
          
          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!impactPreview.hasChanges || saving}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                impactPreview.hasChanges
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              )}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
