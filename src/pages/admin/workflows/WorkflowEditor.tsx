/**
 * WorkflowEditor — Status list + Transition matrix for a workflow scheme.
 * High-contrast NOCTURNE palette.
 */
import React, { useState, useCallback } from 'react';
import { typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { WorkflowScheme, WorkflowStatus, WorkflowTransition } from '@/hooks/useCatalystWorkflow';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, GripVertical, ChevronDown, Check, Circle, Zap,
  ArrowRight, Play, Flag
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  scheme: WorkflowScheme;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  onInvalidate: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  todo:        { label: 'To Do',       dot: '#DFE1E6', bg: '#DFE1E6', text: '#253858' },
  in_progress: { label: 'In Progress', dot: '#DEEBFF', bg: '#DEEBFF', text: '#0747A6' },
  done:        { label: 'Done',        dot: '#E3FCEF', bg: '#E3FCEF', text: '#006644' },
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function WorkflowEditor({ scheme, statuses, transitions, onInvalidate }: Props) {
  const qc = useQueryClient();
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCategory, setNewStatusCategory] = useState<string>('todo');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowStatus | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['catalyst', 'workflows'] });
    onInvalidate();
  }, [qc, onInvalidate]);

  // ─── Add Status ───
  async function handleAddStatus() {
    if (!newStatusName.trim()) return;
    setAdding(true);
    try {
      const { error } = await typedQuery('catalyst_workflow_statuses').insert({
        scheme_id: scheme.id,
        name: newStatusName.trim(),
        slug: slugify(newStatusName),
        category: newStatusCategory,
        color: CATEGORY_CONFIG[newStatusCategory]?.bg || '#DFE1E6',
        position: statuses.length,
        is_initial: statuses.length === 0,
        is_final: false,
      });
      if (error) throw error;
      setNewStatusName('');
      invalidateAll();
      toast.success(`Status "${newStatusName.trim()}" added`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add status');
    } finally {
      setAdding(false);
    }
  }

  // ─── Delete Status ───
  async function handleDeleteStatus() {
    if (!deleteTarget) return;
    try {
      const { error } = await typedQuery('catalyst_workflow_statuses')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      invalidateAll();
      toast.success(`Status "${deleteTarget.name}" removed`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete status');
    } finally {
      setDeleteTarget(null);
    }
  }

  // ─── Update Category ───
  async function handleUpdateCategory(statusId: string, category: string) {
    try {
      const { error } = await typedQuery('catalyst_workflow_statuses')
        .update({ category, color: CATEGORY_CONFIG[category]?.bg || '#DFE1E6' })
        .eq('id', statusId);
      if (error) throw error;
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update category');
    }
  }

  // ─── Rename Status ───
  async function handleRename(statusId: string) {
    if (!editName.trim()) { setEditingId(null); return; }
    try {
      const { error } = await typedQuery('catalyst_workflow_statuses')
        .update({ name: editName.trim(), slug: slugify(editName) })
        .eq('id', statusId);
      if (error) throw error;
      setEditingId(null);
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to rename');
    }
  }

  // ─── Toggle Transition ───
  async function handleToggleTransition(fromId: string | null, toId: string, isGlobal: boolean) {
    const existing = transitions.find(t =>
      t.from_status_id === fromId && t.to_status_id === toId && t.is_global === isGlobal
    );
    try {
      if (existing) {
        const { error } = await typedQuery('catalyst_workflow_transitions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const fromStatus = fromId ? statuses.find(s => s.id === fromId) : null;
        const toStatus = statuses.find(s => s.id === toId);
        const { error } = await typedQuery('catalyst_workflow_transitions').insert({
          scheme_id: scheme.id,
          name: isGlobal
            ? `Any → ${toStatus?.name}`
            : `${fromStatus?.name} → ${toStatus?.name}`,
          from_status_id: fromId,
          to_status_id: toId,
          is_global: isGlobal,
          sort_order: transitions.length,
        });
        if (error) throw error;
      }
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update transition');
    }
  }

  function hasTransition(fromId: string | null, toId: string, isGlobal: boolean): boolean {
    return transitions.some(t =>
      t.from_status_id === fromId && t.to_status_id === toId && t.is_global === isGlobal
    );
  }

  // ─── Toggle initial / final flags ───
  async function handleToggleFlag(statusId: string, field: 'is_initial' | 'is_final', current: boolean) {
    try {
      const update: any = { [field]: !current };
      // If setting as initial, unset all others
      if (field === 'is_initial' && !current) {
        await typedQuery('catalyst_workflow_statuses')
          .update({ is_initial: false })
          .eq('scheme_id', scheme.id);
      }
      const { error } = await typedQuery('catalyst_workflow_statuses')
        .update(update)
        .eq('id', statusId);
      if (error) throw error;
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update flag');
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 divide-x divide-[#2E2E2E]">
      {/* ─── LEFT: Status List ─── */}
      <div className="w-full lg:w-[380px] shrink-0">
        <div className="px-4 py-3 border-b border-[#2E2E2E] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#A1A1A1] uppercase tracking-wider">
            Statuses ({statuses.length})
          </h3>
        </div>

        {/* Status rows */}
        <div className="divide-y divide-[#2E2E2E]">
          {statuses.map(s => (
            <div
              key={s.id}
              className="group flex items-center gap-2 px-4 py-2.5 hover:bg-[#1F1F1F] transition-colors"
            >
              <GripVertical size={14} className="text-[#454545] shrink-0" />

              {/* Category dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 border"
                style={{
                  backgroundColor: CATEGORY_CONFIG[s.category]?.bg,
                  borderColor: CATEGORY_CONFIG[s.category]?.text,
                }}
              />

              {/* Name */}
              {editingId === s.id ? (
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => handleRename(s.id)}
                  onKeyDown={e => e.key === 'Enter' && handleRename(s.id)}
                  className="h-7 text-xs bg-[#111111] border-[#454545] text-[#EDEDED] flex-1"
                  autoFocus
                />
              ) : (
                <span
                  className="text-[13px] text-[#EDEDED] flex-1 cursor-pointer hover:underline"
                  onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                >
                  {s.name}
                </span>
              )}

              {/* Flags */}
              <div className="flex items-center gap-1 shrink-0">
                {s.is_initial && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-[#292929] text-[#A1A1A1] rounded border border-[#454545]">
                    START
                  </span>
                )}
                {s.is_final && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-[#292929] text-[#A1A1A1] rounded border border-[#454545]">
                    END
                  </span>
                )}
              </div>

              {/* Category selector */}
              <Select
                value={s.category}
                onValueChange={val => handleUpdateCategory(s.id, val)}
              >
                <SelectTrigger className="h-7 w-[100px] text-[11px] bg-[#111111] border-[#2E2E2E] text-[#A1A1A1]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleToggleFlag(s.id, 'is_initial', s.is_initial)}
                  className={cn(
                    'p-1 rounded hover:bg-[#292929] transition-colors',
                    s.is_initial ? 'text-[#EDEDED]' : 'text-[#454545]'
                  )}
                  title="Set as initial status"
                >
                  <Play size={12} />
                </button>
                <button
                  onClick={() => handleToggleFlag(s.id, 'is_final', s.is_final)}
                  className={cn(
                    'p-1 rounded hover:bg-[#292929] transition-colors',
                    s.is_final ? 'text-[#EDEDED]' : 'text-[#454545]'
                  )}
                  title="Set as final status"
                >
                  <Flag size={12} />
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
                  className="p-1 rounded hover:bg-[#292929] text-[#454545] hover:text-red-400 transition-colors"
                  title="Delete status"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add status form */}
        <div className="px-4 py-3 border-t border-[#2E2E2E] flex items-center gap-2">
          <Input
            value={newStatusName}
            onChange={e => setNewStatusName(e.target.value)}
            placeholder="New status name…"
            className="h-8 text-xs bg-[#111111] border-[#2E2E2E] text-[#EDEDED] placeholder:text-[#454545] flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddStatus()}
          />
          <Select value={newStatusCategory} onValueChange={setNewStatusCategory}>
            <SelectTrigger className="h-8 w-[90px] text-[10px] bg-[#111111] border-[#2E2E2E] text-[#A1A1A1]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAddStatus}
            disabled={adding || !newStatusName.trim()}
            className="h-8 px-3 text-xs bg-[#292929] hover:bg-[#454545] text-[#EDEDED] border border-[#454545]"
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* ─── RIGHT: Transition Matrix ─── */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 border-b border-[#2E2E2E]">
          <h3 className="text-xs font-semibold text-[#A1A1A1] uppercase tracking-wider">
            Transition Matrix
          </h3>
          <p className="text-[11px] text-[#7D7D7D] mt-0.5">
            Check a cell to allow transition from row → column
          </p>
        </div>

        {statuses.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#454545] text-sm">
            Add statuses to configure transitions
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[#111111] border-b border-r border-[#2E2E2E] px-3 py-2 text-left text-[10px] text-[#878787] uppercase tracking-wider min-w-[140px]">
                    From ↓ \ To →
                  </th>
                  {statuses.map(s => (
                    <th
                      key={s.id}
                      className="border-b border-r border-[#2E2E2E] px-2 py-2 text-center text-[10px] text-[#A1A1A1] font-medium min-w-[80px] bg-[#111111]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_CONFIG[s.category]?.bg }}
                        />
                        <span className="truncate max-w-[70px]">{s.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Global row */}
                <tr className="bg-[#1A1A1A]">
                  <td className="sticky left-0 z-10 bg-[#1A1A1A] border-b border-r border-[#2E2E2E] px-3 py-2 text-[#EDEDED] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Zap size={12} className="text-amber-400" />
                      Any (Global)
                    </span>
                  </td>
                  {statuses.map(to => (
                    <td
                      key={to.id}
                      className="border-b border-r border-[#2E2E2E] px-2 py-2 text-center"
                    >
                      <TransitionCell
                        active={hasTransition(null, to.id, true)}
                        onClick={() => handleToggleTransition(null, to.id, true)}
                      />
                    </td>
                  ))}
                </tr>

                {/* Per-status rows */}
                {statuses.map(from => (
                  <tr key={from.id} className="hover:bg-[#1F1F1F] transition-colors">
                    <td className="sticky left-0 z-10 bg-[#0A0A0A] hover:bg-[#1F1F1F] border-b border-r border-[#2E2E2E] px-3 py-2 text-[#EDEDED] font-medium">
                      <span className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_CONFIG[from.category]?.bg }}
                        />
                        {from.name}
                      </span>
                    </td>
                    {statuses.map(to => (
                      <td
                        key={to.id}
                        className={cn(
                          'border-b border-r border-[#2E2E2E] px-2 py-2 text-center',
                          from.id === to.id ? 'bg-[#111111]' : ''
                        )}
                      >
                        {from.id === to.id ? (
                          <span className="text-[#2E2E2E]">—</span>
                        ) : (
                          <TransitionCell
                            active={hasTransition(from.id, to.id, false)}
                            onClick={() => handleToggleTransition(from.id, to.id, false)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#1A1A1A] border-[#2E2E2E]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#EDEDED]">Delete Status</AlertDialogTitle>
            <AlertDialogDescription className="text-[#878787]">
              Are you sure you want to delete "{deleteTarget?.name}"? This will also remove all
              transitions referencing this status. Any issues currently in this status will need
              to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#292929] border-[#454545] text-[#EDEDED] hover:bg-[#454545]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStatus}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransitionCell({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-6 h-6 rounded border flex items-center justify-center mx-auto transition-all',
        active
          ? 'bg-[#2563EB] border-[#2563EB] text-white'
          : 'bg-[#111111] border-[#2E2E2E] text-transparent hover:border-[#454545] hover:bg-[#1F1F1F]'
      )}
    >
      <Check size={12} />
    </button>
  );
}
