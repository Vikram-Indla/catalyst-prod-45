// =====================================================
// DETAIL TAB — Details content
// =====================================================

import React, { useState, useCallback } from 'react';
import type { TimelineInitiative, InitiativeStatus } from '@/types/producthub/initiative';
import { STATUS_CONFIG, getPriorityFromScore } from '@/types/producthub/initiative';
import { format } from 'date-fns';
import { FolderKanban, Zap, Wrench, Map, Network, Leaf } from 'lucide-react';
import { InitiativeTypeBadge } from '@/components/producthub/shared/InitiativeTypeBadge';
import { usePromoteToRoadmap, useRemoveFromRoadmap } from '@/hooks/useRoadmapPromotion';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetailTabDetailsProps {
  initiative: TimelineInitiative;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1" style={{ color: '#334155' }}>
      {label}
    </div>
    <div className="text-[13px] text-foreground">{children}</div>
  </div>
);

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '—'; }
}

const TYPE_OPTIONS = [
  { key: 'project', label: 'Project', Icon: FolderKanban, color: '#2563EB' },
  { key: 'enhancement', label: 'Enhancement', Icon: Zap, color: '#0D9488' },
  { key: 'improvement', label: 'Improvement', Icon: Wrench, color: '#D97706' },
  { key: 'entity_integration', label: 'Entity Integration', Icon: Network, color: '#8B5CF6' },
  { key: 'sustainable', label: 'Sustainable', Icon: Leaf, color: '#16A34A' },
] as const;

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: 'On Track', color: '#16A34A', bg: '#F0FDF4' },
  at_risk: { label: 'At Risk', color: '#D97706', bg: '#FFFBEB' },
  off_track: { label: 'Off Track', color: '#EF4444', bg: '#FEF2F2' },
};

const VALUE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#16A34A', bg: '#F0FDF4' },
  medium: { label: 'Medium', color: '#D97706', bg: '#FFFBEB' },
  low: { label: 'Low', color: '#64748B', bg: '#F1F5F9' },
};

export const DetailTabDetails: React.FC<DetailTabDetailsProps> = ({ initiative }) => {
  const statusCfg = STATUS_CONFIG[initiative.status];
  const priority = getPriorityFromScore(initiative.computed_score);
  const queryClient = useQueryClient();
  const promoteMutation = usePromoteToRoadmap();
  const removeMutation = useRemoveFromRoadmap();
  const [updatingType, setUpdatingType] = useState(false);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
    queryClient.invalidateQueries({ queryKey: ['initiatives'] });
  }, [queryClient]);

  const handleTypeChange = useCallback(async (typeKey: string) => {
    if (typeKey === initiative.initiative_type_key) return;
    setUpdatingType(true);
    try {
      const { data: typeRow, error: lookupErr } = await (supabase as any)
        .from('initiative_types')
        .select('id')
        .eq('key', typeKey)
        .single();
      if (lookupErr || !typeRow) throw lookupErr || new Error('Type not found');

      const { error } = await supabase
        .from('ph_initiatives')
        .update({ initiative_type_id: typeRow.id } as any)
        .eq('id', initiative.id);
      if (error) throw error;

      toast.success(`Type changed to ${typeKey}`);
      invalidateAll();
    } catch {
      toast.error('Failed to update type');
    } finally {
      setUpdatingType(false);
    }
  }, [initiative.id, initiative.initiative_type_key, invalidateAll]);

  const handleRoadmapToggle = useCallback(async () => {
    if (initiative.on_roadmap) {
      await removeMutation.mutateAsync(initiative.id);
    } else {
      await promoteMutation.mutateAsync({
        initiative_id: initiative.id,
        initiative_type_key: initiative.initiative_type_key || 'project',
      });
    }
  }, [initiative.id, initiative.on_roadmap, initiative.initiative_type_key, promoteMutation, removeMutation]);

  const healthCfg = initiative.health_status ? HEALTH_CONFIG[initiative.health_status] : null;
  const valueCfg = initiative.business_value ? VALUE_CONFIG[initiative.business_value] : null;

  return (
    <div className="p-5 space-y-5">
      {/* Initiative Type — segmented control */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-2" style={{ color: '#334155' }}>
          Initiative Type
        </div>
        <div className="flex items-center gap-2">
          {TYPE_OPTIONS.map(opt => {
            const isActive = initiative.initiative_type_key === opt.key;
            return (
              <button
                key={opt.key}
                disabled={updatingType}
                onClick={() => handleTypeChange(opt.key)}
                className="flex flex-col items-center p-2 rounded-md cursor-pointer transition-all border-2"
                style={{
                  borderColor: isActive ? opt.color : 'transparent',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                  opacity: updatingType ? 0.6 : 1,
                }}
              >
                <opt.Icon className="w-4 h-4 mb-0.5" style={{ color: opt.color }} />
                <span className="text-[10px] font-semibold" style={{ color: isActive ? opt.color : '#64748B' }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
          {!initiative.initiative_type_key && (
            <span className="text-[11px] text-muted-foreground ml-1">Select a type</span>
          )}
        </div>
      </div>

      {/* Roadmap toggle */}
      <div className="border border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: initiative.on_roadmap ? '#DBEAFE' : '#F1F5F9' }}>
              <Map className="w-4 h-4" style={{ color: initiative.on_roadmap ? '#2563EB' : '#94A3B8' }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">
                {initiative.on_roadmap ? 'On Roadmap' : 'Not on Roadmap'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {initiative.on_roadmap ? 'Visible on Product Roadmap timeline' : 'Click toggle to add to roadmap'}
              </div>
            </div>
          </div>
          <button
            onClick={handleRoadmapToggle}
            disabled={promoteMutation.isPending || removeMutation.isPending}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: initiative.on_roadmap ? '#2563EB' : '#CBD5E1' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: initiative.on_roadmap ? 22 : 2 }}
            />
          </button>
        </div>
      </div>

      {/* 2-col grid — main fields */}
      <div className="grid grid-cols-2 gap-4 gap-x-6">
        <Field label="Status">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusCfg.color }} />
            <span>{statusCfg.label}</span>
          </div>
        </Field>
        <Field label="EA Review">
          <span className="text-muted-foreground">—</span>
        </Field>

        <Field label="Health Status">
          {healthCfg ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
              style={{ background: healthCfg.bg, color: healthCfg.color }}>
              {healthCfg.label}
            </span>
          ) : <span className="text-muted-foreground">—</span>}
        </Field>
        <Field label="Business Value">
          {valueCfg ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
              style={{ background: valueCfg.bg, color: valueCfg.color }}>
              {valueCfg.label}
            </span>
          ) : <span className="text-muted-foreground">—</span>}
        </Field>

        <Field label="Priority">
          <span className="capitalize">{priority}</span>
          {initiative.computed_score !== null && (
            <span className="ml-1 text-[11px] text-muted-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ({initiative.computed_score.toFixed(2)})
            </span>
          )}
        </Field>
        <Field label="Target Quarter">
          {initiative.target_quarter ?? '—'}
        </Field>

        <Field label="Reporter">
          {initiative.reporter_name ?? <span className="text-muted-foreground">—</span>}
        </Field>
        <Field label="Assignee">
          {initiative.assignee_name ?? <span className="text-muted-foreground">Unassigned</span>}
        </Field>

        <Field label="Department">
          {initiative.department_name ?? <span className="text-muted-foreground">—</span>}
        </Field>
        <Field label="Business Owner">
          <span className="text-muted-foreground">—</span>
        </Field>

        <Field label="Business Ask Date">
          {formatDate(initiative.business_ask_date)}
        </Field>
        <Field label="Kickoff Date">
          {formatDate(initiative.kickoff_date)}
        </Field>

        <Field label="Target Complete">
          {formatDate(initiative.target_complete)}
        </Field>
        <Field label="Progress">
          <div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, initiative.progress)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {initiative.progress}%
            </span>
          </div>
        </Field>
      </div>

      {/* Description */}
      <div className="border-t border-border/50 pt-4">
        <h4 className="text-[13px] font-semibold text-foreground mb-2">Description</h4>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {initiative.description
            ? (typeof initiative.description === 'string' ? initiative.description : JSON.stringify(initiative.description))
            : 'No description provided for this initiative.'}
        </p>
      </div>
    </div>
  );
};

export default DetailTabDetails;
