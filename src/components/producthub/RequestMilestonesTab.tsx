/**
 * Shared Request Milestones Tab
 * Used by both Panel A (Roadmap/Kanban) and Panel B (Backlog)
 * Full CRUD against ph_request_milestones
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Plus, Flag, Trash2, Check } from 'lucide-react';
import { logInitiativeAudit } from '@/lib/initiativeAudit';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RequestMilestonesTabProps {
  requestId: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
}

export function RequestMilestonesTab({ requestId }: RequestMilestonesTabProps) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: milestones = [], isLoading, isError } = useQuery({
    queryKey: ['ph-milestones', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_milestones')
        .select('*')
        .eq('request_id', requestId)
        .order('planned_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ph-milestones', requestId] });
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: rows, error } = await typedQuery('ph_request_milestones')
        .insert({
          request_id: requestId,
          title: newTitle.trim(),
          planned_date: newDate || new Date().toISOString().slice(0, 10),
          status: 'not_started',
          created_by: user?.id || null,
        })
        .select();
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast.error('Failed to add milestone — no rows inserted');
        return;
      }
      invalidate();
      setNewTitle('');
      setNewDate('');
      setShowAdd(false);
      toast.success('Milestone added');
      logInitiativeAudit({
        request_id: requestId,
        action: 'milestone_added',
        entity_type: 'milestone',
        entity_id: rows[0]?.id,
        new_value: JSON.stringify({ title: newTitle.trim(), planned_date: newDate }),
      });
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';
    const actualDate = newStatus === 'completed' ? new Date().toISOString().slice(0, 10) : null;
    try {
      const { data: rows, error } = await typedQuery('ph_request_milestones')
        .update({ status: newStatus, actual_date: actualDate, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast.error('Failed to update milestone');
        return;
      }
      invalidate();
      toast.success(newStatus === 'completed' ? 'Milestone completed' : 'Milestone reopened');
      logInitiativeAudit({
        request_id: requestId,
        action: newStatus === 'completed' ? 'milestone_completed' : 'milestone_reopened',
        entity_type: 'milestone',
        entity_id: id,
        field_name: 'status',
        old_value: currentStatus,
        new_value: newStatus,
      });
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await typedQuery('ph_request_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      invalidate();
      toast.success('Milestone removed');
      logInitiativeAudit({
        request_id: requestId,
        action: 'milestone_deleted',
        entity_type: 'milestone',
        entity_id: id,
      });
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading milestones…</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-destructive">Failed to load milestones</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Milestones</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="flex gap-2 p-3 border border-border rounded-lg bg-muted/30">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Milestone title"
            className="flex-1 h-9 px-3 text-[13px] border border-border rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="h-9 px-2 text-xs border border-border rounded-md bg-background text-foreground outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={submitting || !newTitle.trim()}
            className="h-9 px-3 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Empty State */}
      {milestones.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Flag size={28} className="text-muted-foreground/40 mb-2" />
          <p className="text-[13px] font-medium text-muted-foreground">No milestones yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add milestones to track key deliverables</p>
        </div>
      ) : (
        /* Milestone List */
        <div className="flex flex-col gap-0.5">
          {milestones.map((m: any) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-3 py-2.5 border border-border rounded-md transition-colors ${
                m.status === 'completed' ? 'bg-accent/30' : 'bg-background'
              }`}
            >
              {/* Toggle circle */}
              <button
                onClick={() => toggleStatus(m.id, m.status)}
                className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                  m.status === 'completed'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40 bg-transparent hover:border-primary/60'
                }`}
              >
                {m.status === 'completed' && <Check size={10} className="text-primary-foreground" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13px] font-medium truncate ${
                    m.status === 'completed'
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {m.title}
                </div>
                {m.planned_date && (
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {formatDate(m.planned_date)}
                  </div>
                )}
              </div>

              {/* Critical badge */}
              {m.is_critical_path && (
                <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                  Critical
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(m.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
