/**
 * Fix CTC Modal - V8 Design
 * Allows editing missing CTC values for resources in a department
 * CRITICAL: This was missing in V7 - "Fix X →" buttons were dead links
 */

import { useState, useMemo, useEffect } from 'react';
import { X, AlertTriangle, Check, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SYSTEM_CURRENCY } from '@/lib/currencyConfig';

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
}

export function FixCTCModal({ open, onOpenChange, department, resources, onSaved }: FixCTCModalProps) {
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

  // Calculate impact preview
  const impactPreview = useMemo(() => {
    let count = 0;
    let totalMonthly = 0;

    Object.entries(ctcValues).forEach(([, value]) => {
      const numValue = parseFloat(value) || 0;
      if (numValue > 0) {
        count++;
        totalMonthly += numValue;
      }
    });

    return {
      count,
      monthly: totalMonthly,
      annual: totalMonthly * 12,
    };
  }, [ctcValues]);

  const handleBulkApply = () => {
    const value = parseFloat(bulkValue);
    if (!value || value <= 0) {
      toast.error('Please enter a valid CTC value');
      return;
    }

    const updated: Record<string, string> = {};
    resources.forEach(r => {
      updated[r.id] = bulkValue;
    });
    setCTCValues(updated);
    toast.success(`Applied ${SYSTEM_CURRENCY.symbol} ${value.toLocaleString()} to all resources`);
  };

  const handleSave = async () => {
    const updates: { id: string; ctc: number }[] = [];

    Object.entries(ctcValues).forEach(([id, value]) => {
      const numValue = parseFloat(value) || 0;
      if (numValue > 0) {
        updates.push({ id, ctc: numValue });
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

      toast.success(`${updates.length} resources updated successfully!`);
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

  const formatCurrency = (n: number) => {
    return `${SYSTEM_CURRENCY.symbol} ${n.toLocaleString(SYSTEM_CURRENCY.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Fix Missing Compensation Data
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5">
          {/* Department Context */}
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="font-bold text-lg text-foreground">{department}</div>
            <div className="text-amber-600 font-semibold text-sm">
              {resources.length} resources missing CTC data
            </div>
          </div>

          {/* Bulk Update */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Bulk Update (Optional)
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {SYSTEM_CURRENCY.symbol}
                </span>
                <Input
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="Enter CTC"
                  min="0"
                  step="100"
                  className="pl-10 font-mono text-right"
                />
              </div>
              <Button variant="secondary" onClick={handleBulkApply}>
                Apply to All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This will set the same CTC for all resources below. You can still edit individually.
            </p>
          </div>

          {/* Resources Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      RID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Contract End
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-36">
                      Monthly CTC
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-emerald-600">
                        <Check className="w-5 h-5 inline-block mr-2" />
                        All resources in this department have CTC data
                      </td>
                    </tr>
                  ) : (
                    resources.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.rid?.padStart(3, '0') || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.role || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.vendorName || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(r.contractEnd)}</td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                              {SYSTEM_CURRENCY.symbol}
                            </span>
                            <Input
                              type="number"
                              value={ctcValues[r.id] || ''}
                              onChange={(e) =>
                                setCTCValues((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              placeholder="Enter CTC"
                              min="0"
                              step="100"
                              className={cn(
                                'pl-8 font-mono text-right h-8 text-sm',
                                ctcValues[r.id] && parseFloat(ctcValues[r.id]) > 0
                                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                                  : ''
                              )}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Impact Preview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Impact Preview
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resources to update:</span>
                <strong className="font-mono text-primary">{impactPreview.count}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total monthly CTC:</span>
                <strong className="font-mono text-primary">{formatCurrency(impactPreview.monthly)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. annual budget:</span>
                <strong className="font-mono text-primary">{formatCurrency(impactPreview.annual)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || impactPreview.count === 0}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
