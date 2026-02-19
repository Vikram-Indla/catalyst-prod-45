import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '@/components/project-hub/shared/phStyles.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { StatusRow } from './workflow/StatusRow';
import { AddStatusModal } from './workflow/AddStatusModal';
import { EditStatusModal } from './workflow/EditStatusModal';
import { DeleteStatusModal } from './workflow/DeleteStatusModal';
import { CopyWorkflowSection } from './workflow/CopyWorkflowSection';
import { CategoryLegend } from './workflow/CategoryLegend';

interface WorkflowTabProps {
  projectId: string;
}

interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  category: string;
  position: number;
  is_default: boolean | null;
  project_id: string;
}

export function WorkflowTab({ projectId }: WorkflowTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ['ph-workflow-statuses', projectId];

  const [addOpen, setAddOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<WorkflowStatus | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<WorkflowStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: statuses = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_workflow_statuses')
        .select('*')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw new Error(error.message);
      return (data || []) as WorkflowStatus[];
    },
    enabled: !!projectId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Drag end — reorder
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = statuses.findIndex(s => s.id === active.id);
    const newIndex = statuses.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...statuses];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic update
    queryClient.setQueryData(queryKey, reordered.map((s, i) => ({ ...s, position: i })));

    // Batch update positions
    try {
      const updates = reordered.map((s, i) => ({ id: s.id, position: i }));
      for (const u of updates) {
        const { error } = await supabase
          .from('ph_workflow_statuses')
          .update({ position: u.position })
          .eq('id', u.id);
        if (error) throw new Error(error.message);
      }
    } catch (err: any) {
      toast.error('Failed to reorder');
      invalidate();
    }
  };

  // Add status
  const handleAdd = async (data: { name: string; category: string; color: string }) => {
    setActionLoading(true);
    try {
      const maxPos = statuses.length > 0 ? Math.max(...statuses.map(s => s.position)) : -1;
      const { error } = await supabase
        .from('ph_workflow_statuses')
        .insert({
          project_id: projectId,
          name: data.name,
          color: data.color,
          category: data.category,
          position: maxPos + 1,
          is_default: false,
        });
      if (error) throw new Error(error.message);
      toast.success('Status added');
      invalidate();
      setAddOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add status');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit status
  const handleEdit = async (data: { id: string; name: string; category: string; color: string }) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('ph_workflow_statuses')
        .update({ name: data.name, color: data.color, category: data.category })
        .eq('id', data.id);
      if (error) throw new Error(error.message);
      toast.success('Status updated');
      invalidate();
      setEditStatus(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete status
  const handleDelete = async (targetStatusId?: string) => {
    if (!deleteStatus) return;
    if (deleteStatus.is_default) {
      toast.error('Cannot delete the default status.');
      setDeleteStatus(null);
      return;
    }
    setActionLoading(true);
    try {
      // Attempt to migrate items (ph_work_items may not exist yet)
      if (targetStatusId) {
        try {
          await supabase
            .from('ph_work_items' as any)
            .update({ status_id: targetStatusId } as any)
            .eq('status_id', deleteStatus.id);
        } catch {
          // Table may not exist yet — ignore
        }
      }

      const { error } = await supabase
        .from('ph_workflow_statuses')
        .delete()
        .eq('id', deleteStatus.id);
      if (error) throw new Error(error.message);
      toast.success('Status deleted');
      invalidate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete status');
    } finally {
      setActionLoading(false);
      setDeleteStatus(null);
    }
  };

  // Get item count (always 0 in Phase 1)
  const getItemCount = (_statusId: string) => 0;

  return (
    <div className="space-y-5">
      {/* Workflow Editor Card */}
      <div className="ph-card">
        <h3 className="ph-card-title">Workflow</h3>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 16 }}>
          Drag to reorder statuses. New items start at the Default status. Done items count toward progress %.
        </p>

        {isLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading...</div>
        ) : statuses.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No statuses configured</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={statuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {statuses.map(s => (
                  <StatusRow
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    color={s.color}
                    category={s.category}
                    isDefault={s.is_default ?? false}
                    itemCount={getItemCount(s.id)}
                    onEdit={() => setEditStatus(s)}
                    onDelete={() => setDeleteStatus(s)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add Status button */}
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 mt-3 hover:bg-[#F8FAFC] transition-colors"
          style={{
            height: 36, padding: '0 14px', fontSize: 13, fontWeight: 500,
            color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          Add Status
        </button>

        {/* Copy Workflow */}
        <CopyWorkflowSection projectId={projectId} onCopied={invalidate} />
      </div>

      {/* Category Legend */}
      <CategoryLegend />

      {/* Modals */}
      <AddStatusModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} loading={actionLoading} />
      <EditStatusModal open={!!editStatus} status={editStatus} onClose={() => setEditStatus(null)} onSubmit={handleEdit} loading={actionLoading} />
      <DeleteStatusModal
        open={!!deleteStatus}
        statusName={deleteStatus?.name || ''}
        itemCount={deleteStatus ? getItemCount(deleteStatus.id) : 0}
        otherStatuses={statuses.filter(s => s.id !== deleteStatus?.id).map(s => ({ id: s.id, name: s.name, color: s.color }))}
        onClose={() => setDeleteStatus(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
      />
    </div>
  );
}
