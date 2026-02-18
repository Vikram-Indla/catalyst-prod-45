/**
 * CreateInitiativeDrawer — Slide-in form for creating a new initiative.
 * Uses custom dropdown components (no native selects).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { useDepartmentOptions, useProfileOptions } from '@/hooks/useInitiativeLookups';
import { StatusSelect } from './StatusSelect';
import { QuarterSelect } from './QuarterSelect';
import { PeopleSelect } from './PeopleSelect';
import { DepartmentSelect } from './DepartmentSelect';

interface CreateInitiativeDrawerProps {
  open: boolean;
  onClose: () => void;
}

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
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: '', description: '', status: 'new_demand',
        department_id: '', assignee_id: '', business_owner_id: '',
        reporter_id: '', target_quarter: '', kickoff_date: '',
        target_complete: '', business_ask_date: '',
      });
      setTitleError(false);
    }
  }, [open]);

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
          <motion.div
            className="fixed inset-0 z-[55]"
            style={{ background: 'rgba(0,0,0,0.20)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 h-screen z-[60] flex flex-col overflow-hidden bg-white"
            style={{ width: '55%', maxWidth: 840, minWidth: 480, boxShadow: '-8px 0 24px rgba(0,0,0,0.12)' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Sticky Header */}
            <div className="flex-shrink-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">New Initiative</h2>
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
                  + Create
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
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
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">
                  Description
                </div>
                <textarea
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Describe the initiative…"
                  rows={4}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                />
              </div>

              {/* 2-col grid with custom dropdowns */}
              <div className="grid grid-cols-2 gap-4 gap-x-8">
                {/* Status */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Status</div>
                  <StatusSelect value={form.status} onChange={v => updateField('status', v)} />
                </div>

                {/* Department */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Department</div>
                  <DepartmentSelect
                    value={form.department_id}
                    onChange={v => updateField('department_id', v)}
                    departments={departmentOptions || []}
                  />
                </div>

                {/* Assignee */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Assignee</div>
                  <PeopleSelect
                    value={form.assignee_id}
                    onChange={v => updateField('assignee_id', v)}
                    profiles={profileOptions || []}
                    placeholder="Select assignee"
                  />
                </div>

                {/* Business Owner */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Business Owner</div>
                  <PeopleSelect
                    value={form.business_owner_id}
                    onChange={v => updateField('business_owner_id', v)}
                    profiles={profileOptions || []}
                    placeholder="Select business owner"
                  />
                </div>

                {/* Reporter */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Reporter</div>
                  <PeopleSelect
                    value={form.reporter_id}
                    onChange={v => updateField('reporter_id', v)}
                    profiles={profileOptions || []}
                    placeholder="Select reporter"
                  />
                </div>

                {/* Quarter */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Target Quarter</div>
                  <QuarterSelect value={form.target_quarter} onChange={v => updateField('target_quarter', v)} />
                </div>

                {/* Kickoff Date */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Kickoff Date</div>
                  <input
                    type="date"
                    value={form.kickoff_date}
                    onChange={e => updateField('kickoff_date', e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Target Complete */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Target Complete</div>
                  <input
                    type="date"
                    value={form.target_complete}
                    onChange={e => updateField('target_complete', e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Business Ask Date */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">Business Ask Date</div>
                  <input
                    type="date"
                    value={form.business_ask_date}
                    onChange={e => updateField('business_ask_date', e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
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
