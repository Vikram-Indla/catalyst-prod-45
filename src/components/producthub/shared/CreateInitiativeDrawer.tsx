/**
 * CreateInitiativeDrawer — Slide-in form for creating a new initiative.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import type { InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { EditableField } from './EditableField';
import { useDepartmentOptions, useProfileOptions } from '@/hooks/useInitiativeLookups';

interface CreateInitiativeDrawerProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = Object.entries(STATUS_DISPLAY).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  color: cfg.dot,
}));

function generateQuarterOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  for (const year of [2025, 2026, 2027]) {
    for (let q = 1; q <= 4; q++) {
      const val = `Q${q} ${year}`;
      opts.push({ value: val, label: val });
    }
  }
  return opts;
}

const QUARTER_OPTIONS = generateQuarterOptions();

function useNextInitiativeKey() {
  return useQuery({
    queryKey: ['next-initiative-key'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_initiatives')
        .select('initiative_key')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastKey = data[0].initiative_key;
        const lastNum = parseInt(lastKey.split('-')[1]);
        return `MIM-${String(lastNum + 1).padStart(3, '0')}`;
      }
      return 'MIM-001';
    },
    staleTime: 0,
  });
}

function useCreateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newInit: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from('ph_initiatives')
        .insert({
          title: newInit.title,
          description: newInit.description || null,
          status: newInit.status || 'new_demand',
          department_id: newInit.department_id || null,
          assignee_id: newInit.assignee_id || null,
          business_owner_id: newInit.business_owner_id || null,
          reporter_id: newInit.reporter_id || null,
          target_quarter: newInit.target_quarter || null,
          kickoff_date: newInit.kickoff_date || null,
          target_complete: newInit.target_complete || null,
          business_ask_date: newInit.business_ask_date || null,
          initiative_key: newInit.initiative_key,
          progress: 0,
          sort_order: 0,
          is_archived: false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
      queryClient.invalidateQueries({ queryKey: ['next-initiative-key'] });
      catalystToast.success(`${data.initiative_key} created`);
    },
    onError: (err: Error) => {
      catalystToast.error('Failed to create: ' + err.message);
    },
  });
}

export function CreateInitiativeDrawer({ open, onClose }: CreateInitiativeDrawerProps) {
  const { data: nextKey } = useNextInitiativeKey();
  const createMutation = useCreateInitiative();

  const { data: departmentOptions } = useDepartmentOptions();
  const { data: profileOptions } = useProfileOptions();

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'new_demand' as string,
    department_id: '',
    assignee_id: '',
    business_owner_id: '',
    reporter_id: '',
    target_quarter: '',
    kickoff_date: '',
    target_complete: '',
    business_ask_date: '',
  });
  const [titleError, setTitleError] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        status: 'new_demand',
        department_id: '',
        assignee_id: '',
        business_owner_id: '',
        reporter_id: '',
        target_quarter: '',
        kickoff_date: '',
        target_complete: '',
        business_ask_date: '',
      });
      setTitleError(false);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const updateField = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'title') setTitleError(false);
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setTitleError(true);
      return;
    }
    await createMutation.mutateAsync({
      ...form,
      initiative_key: nextKey || 'MIM-001',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-[55]"
            style={{ background: 'rgba(0,0,0,0.20)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 h-screen z-[60] flex flex-col overflow-hidden bg-white"
            style={{ width: '55%', maxWidth: 840, minWidth: 480, boxShadow: '-8px 0 24px rgba(0,0,0,0.12)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">🆕 New Initiative</h2>
                {nextKey && (
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                    {nextKey}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 h-9 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className={cn(
                    'px-4 h-9 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2',
                    form.title.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                  )}
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title */}
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </div>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="Initiative title"
                  className={cn(
                    'w-full border rounded-lg px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-shadow',
                    titleError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-zinc-300'
                  )}
                  autoFocus
                />
                {titleError && <p className="text-xs text-red-500 mt-1">Title is required</p>}
              </div>

              {/* Description */}
              <EditableField
                label="Description"
                value={form.description}
                isEditing={true}
                type="textarea"
                onChange={v => updateField('description', v)}
                placeholder="Describe the initiative…"
              />

              {/* 2-col grid */}
              <div className="grid grid-cols-2 gap-4 gap-x-8">
                <EditableField
                  label="Status"
                  value={form.status}
                  isEditing={true}
                  type="select"
                  options={STATUS_OPTIONS}
                  onChange={v => updateField('status', v)}
                />
                <EditableField
                  label="Department"
                  value={form.department_id}
                  isEditing={true}
                  type="select"
                  options={departmentOptions || []}
                  onChange={v => updateField('department_id', v)}
                />
                <EditableField
                  label="Assignee"
                  value={form.assignee_id}
                  isEditing={true}
                  type="select"
                  options={profileOptions || []}
                  onChange={v => updateField('assignee_id', v)}
                />
                <EditableField
                  label="Business Owner"
                  value={form.business_owner_id}
                  isEditing={true}
                  type="select"
                  options={profileOptions || []}
                  onChange={v => updateField('business_owner_id', v)}
                />
                <EditableField
                  label="Reporter"
                  value={form.reporter_id}
                  isEditing={true}
                  type="select"
                  options={profileOptions || []}
                  onChange={v => updateField('reporter_id', v)}
                />
                <EditableField
                  label="Quarter"
                  value={form.target_quarter}
                  isEditing={true}
                  type="select"
                  options={QUARTER_OPTIONS}
                  onChange={v => updateField('target_quarter', v)}
                />
                <EditableField
                  label="Target Date"
                  value={form.target_complete}
                  isEditing={true}
                  type="date"
                  onChange={v => updateField('target_complete', v)}
                />
                <EditableField
                  label="Kickoff Date"
                  value={form.kickoff_date}
                  isEditing={true}
                  type="date"
                  onChange={v => updateField('kickoff_date', v)}
                />
                <EditableField
                  label="Business Ask Date"
                  value={form.business_ask_date}
                  isEditing={true}
                  type="date"
                  onChange={v => updateField('business_ask_date', v)}
                />
              </div>

              {/* Tip */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Tip:</strong> Score will be calculated after the initiative is created.
                  Use the Score tab to set scoring criteria.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreateInitiativeDrawer;
