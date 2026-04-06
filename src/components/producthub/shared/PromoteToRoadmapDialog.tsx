/**
 * PromoteToRoadmapDialog — Compact dialog for promoting an initiative to roadmap
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Map, FolderKanban, Zap, Wrench, Link, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePromoteToRoadmap } from '@/hooks/useRoadmapPromotion';
import { INITIATIVE_TYPE_COLORS, type InitiativeTypeKey } from '@/types/initiative-enhancements';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const TYPE_OPTIONS: { key: InitiativeTypeKey; label: string; Icon: LucideIcon }[] = [
  { key: 'project', label: 'Project', Icon: FolderKanban },
  { key: 'enhancement', label: 'Enhancement', Icon: Zap },
  { key: 'improvement', label: 'Improvement', Icon: Wrench },
  { key: 'entity_integration', label: 'Entity Integration', Icon: Link },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initiative: { id: string; title: string; initiative_key?: string; initiative_type_key?: string | null; description?: string | null; assignee_id?: string | null; department_id?: string | null; business_owner_id?: string | null; target_quarter?: string | null; progress?: number } | null;
}

const PRIORITY_OPTIONS = [
  { value: '', label: 'Auto (by score)' },
  { value: '1', label: '1 — Critical' },
  { value: '2', label: '2 — High' },
  { value: '3', label: '3 — Medium' },
  { value: '4', label: '4 — Low' },
];

export function PromoteToRoadmapDialog({ open, onClose, initiative }: Props) {
  const promoteMutation = usePromoteToRoadmap();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<InitiativeTypeKey>('project');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    if (open && initiative) {
      setSelectedType((initiative.initiative_type_key as InitiativeTypeKey) || 'project');
      setPriority('');
    }
  }, [open, initiative]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const handleConfirm = async () => {
    if (!initiative) return;

    let initiativeId = initiative.id;

    // For Jira-sourced items (non-UUID id), ensure a ph_initiatives record exists
    if (!isUuid(initiative.id)) {
      const issueKey = initiative.initiative_key || initiative.id;
      const { data: existing } = await (supabase as any)
        .from('ph_initiatives')
        .select('id')
        .eq('initiative_key', issueKey)
        .maybeSingle();

      if (existing) {
        initiativeId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await (supabase as any)
          .from('ph_initiatives')
          .insert({
            initiative_key: issueKey,
            title: initiative.title,
            description: initiative.description || null,
            status: 'new_demand',
            assignee_id: initiative.assignee_id || null,
            department_id: initiative.department_id || null,
            business_owner_id: initiative.business_owner_id || null,
            target_quarter: initiative.target_quarter || null,
            progress: initiative.progress || 0,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        initiativeId = inserted.id;
      }
    }

    await promoteMutation.mutateAsync({
      initiative_id: initiativeId,
      initiative_type_key: selectedType,
      roadmap_priority: priority ? parseInt(priority) : undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && initiative && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Dialog */}
          <motion.div
            className="relative w-[420px] bg-white rounded-2xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="p-4 px-5" style={{ background: 'var(--cp-blue)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Map className="w-5 h-5 text-white" />
                <span className="text-[15px] font-bold text-white">Add to Roadmap</span>
              </div>
              <p className="text-[11.5px] text-white/85 truncate">{initiative.title}</p>
            </div>

            {/* Body */}
            <div className="p-4 px-5">
              {/* Type Selector */}
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1.5" style={{ color: 'var(--fg-2)' }}>
                Confirm Initiative Type
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg border" style={{ background: 'var(--bg-1)', borderColor: 'var(--divider)' }}>
                {TYPE_OPTIONS.map(opt => {
                  const colors = INITIATIVE_TYPE_COLORS[opt.key];
                  const isActive = selectedType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedType(opt.key)}
                      className={cn(
                        'flex flex-col items-center p-2 rounded-md cursor-pointer transition-all border-2',
                        isActive ? 'bg-white shadow-sm' : 'border-transparent hover:bg-white/60'
                      )}
                      style={{ borderColor: isActive ? colors.border : 'transparent' }}
                    >
                      <opt.Icon className="w-[18px] h-[18px]" style={{ color: isActive ? colors.text : 'var(--fg-3)' }} />
                      <span className="text-[11px] font-semibold block mt-0.5" style={{ color: isActive ? colors.text : 'var(--fg-3)' }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Priority */}
              <div className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1.5" style={{ color: 'var(--fg-2)' }}>
                  Roadmap Priority
                </div>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                  style={{ borderColor: 'var(--divider)' }}
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 px-5 border-t flex justify-end gap-2" style={{ borderColor: 'var(--divider)' }}>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-[12.5px] font-medium rounded-md text-[rgba(237,237,237,0.40)] hover:bg-[#1A1A1A] transition-colors"
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
