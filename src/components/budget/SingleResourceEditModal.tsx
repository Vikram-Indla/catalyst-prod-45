/**
 * Single Resource Edit Modal - V8 Design
 * 
 * Focused modal for editing ONE resource's CTC
 * Used when clicking "Edit" on a single resource row
 */

import { useState } from 'react';
import { X, User, Calendar, Building2, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  rid: string;
  name: string;
  role: string | null;
  vendorName: string | null;
  contractEnd: string | null;
  ctc: number | null;
}

interface SingleResourceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource;
  onSaved: () => void;
}

export function SingleResourceEditModal({
  open,
  onOpenChange,
  resource,
  onSaved,
}: SingleResourceEditModalProps) {
  const queryClient = useQueryClient();
  const [ctcValue, setCTCValue] = useState(resource.ctc?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setCTCValue(raw);
  };

  const displayValue = ctcValue
    ? parseInt(ctcValue).toLocaleString('en-US')
    : '';

  const annualCost = ctcValue ? parseInt(ctcValue) * 12 : 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSave = async () => {
    // Allow zero values - only block if empty string
    if (ctcValue === '' || ctcValue === undefined) {
      toast.error('Please enter a CTC value');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('resource_inventory')
        .update({ ctc: parseInt(ctcValue) })
        .eq('id', resource.id);

      if (error) throw error;

      toast.success(`CTC updated for ${resource.name}`);

      // Optimistic UI: update cached budget resources immediately
      const nextCtc = parseInt(ctcValue);
      queryClient.setQueryData<any[]>(['budget-resources'], (old) => {
        if (!old) return old;
        return old.map((row: any) => (row.id === resource.id ? { ...row, ctc: nextCtc } : row));
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving CTC:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {resource.ctc ? 'Edit' : 'Add'} Compensation
            </h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Resource Info Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-sm text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                {resource.rid?.padStart(3, '0') || '—'}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {resource.name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Briefcase className="w-3.5 h-3.5" />
                <span className="truncate">{resource.role || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{resource.vendorName || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(resource.contractEnd)}</span>
              </div>
            </div>
          </div>

          {/* CTC Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Monthly CTC
            </label>
            <div
              className={cn(
                'flex items-center border rounded-lg overflow-hidden transition-all duration-150',
                isFocused
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              )}
            >
              <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter amount"
                autoFocus
                className="flex-1 px-4 py-3 text-right font-mono text-lg text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none placeholder:text-slate-400 placeholder:font-sans placeholder:text-left"
              />
              <span className="px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600">
                SAR
              </span>
            </div>
          </div>

          {/* Annual Preview */}
          {ctcValue && parseInt(ctcValue) > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="text-sm text-emerald-700 dark:text-emerald-400">
                Annual cost:{' '}
                <span className="font-mono font-semibold">
                  {annualCost.toLocaleString('en-US')} SAR
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={ctcValue === '' || ctcValue === undefined || parseInt(ctcValue) < 0 || isSaving}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              ctcValue !== '' && ctcValue !== undefined && parseInt(ctcValue) >= 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save CTC'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
