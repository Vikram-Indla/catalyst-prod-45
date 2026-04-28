/**
 * PromoteToRoadmapDialog — Compact dialog for promoting a business request to roadmap
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Map } from 'lucide-react';
import { usePromoteToRoadmap } from '@/hooks/useRoadmapPromotion';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  request: { id: string; title: string; initiative_key?: string; description?: string | null; assignee_id?: string | null; department_id?: string | null; business_owner_id?: string | null; target_quarter?: string | null; progress?: number } | null;
}

const PRIORITY_OPTIONS = [
  { value: '', label: 'Auto (by score)' },
  { value: '1', label: '1 — Critical' },
  { value: '2', label: '2 — High' },
  { value: '3', label: '3 — Medium' },
  { value: '4', label: '4 — Low' },
];

export function PromoteToRoadmapDialog({ open, onClose, request }: Props) {
  const promoteMutation = usePromoteToRoadmap();
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState('');

  useEffect(() => {
    if (open && request) {
      setPriority('');
    }
  }, [open, request]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const handleConfirm = async () => {
    if (!request) return;

    let requestId = request.id;

    // For Jira-sourced items (non-UUID id), ensure a ph_requests record exists
    if (!isUuid(request.id)) {
      const issueKey = request.initiative_key || request.id;
      const { data: existing } = await typedQuery('ph_requests')
        .select('id')
        .eq('initiative_key', issueKey)
        .maybeSingle();

      if (existing) {
        requestId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await typedQuery('ph_requests')
          .insert({
            initiative_key: issueKey,
            title: request.title,
            description: request.description || null,
            status: 'new_demand',
            assignee_id: request.assignee_id || null,
            department_id: request.department_id || null,
            business_owner_id: request.business_owner_id || null,
            target_quarter: request.target_quarter || null,
            progress: request.progress || 0,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        requestId = inserted.id;
      }
    }

    await promoteMutation.mutateAsync({
      request_id: requestId,
      roadmap_priority: priority ? parseInt(priority) : undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['requests-backlog'] });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && request && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-[420px] bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 px-5" style={{ background: 'var(--cp-blue)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Map className="w-5 h-5 text-white" />
                <span className="text-[15px] font-bold text-white">Add to Roadmap</span>
              </div>
              <p className="text-[11.5px] text-white/85 truncate">{request.title}</p>
            </div>

            <div className="p-4 px-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1.5" style={{ color: 'var(--fg-2)' }}>
                  Roadmap Priority
                </div>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-white dark:bg-[#1A1A1A] dark:text-[#EDEDED] border dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                  style={{ borderColor: 'var(--divider)' }}
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 px-5 border-t flex justify-end gap-2" style={{ borderColor: 'var(--divider)' }}>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-[12.5px] font-medium rounded-md text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={promoteMutation.isPending}
                className="px-4 py-1.5 text-[12.5px] font-semibold text-white rounded-md transition-colors flex items-center gap-1.5"
                style={{ background: 'var(--cp-blue)' }}
              >
                {promoteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ✓ Add to Roadmap
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
