import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';
import { EditEpicDialog } from '@/modules/program-epics';
import { getLozengeStyle, EPIC_STATUS_LOZENGE, formatDueDate, isDueDateOverdue, getInitials } from '../../utils/backlog.utils';

interface EpicDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string | null;
  projectId: string;
}

export const EpicDetailDrawer: React.FC<EpicDetailDrawerProps> = ({ isOpen, onClose, epicId, projectId }) => {
  const [showEdit, setShowEdit] = useState(false);

  const { data: epic, refetch } = useQuery({
    queryKey: ['epic-drawer-detail', epicId],
    queryFn: async () => {
      if (!epicId) return null;
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name, description, status, assignee_id, end_date, health')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!epicId && isOpen,
  });

  if (!epicId) return null;

  const statusConfig = epic?.status ? EPIC_STATUS_LOZENGE[epic.status] : null;
  const lozengeStyle = statusConfig ? getLozengeStyle(statusConfig.color) : null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent style={{ width: 480, maxWidth: '100vw' }} className="p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {epic?.epic_key && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2563EB', fontSize: 13, fontWeight: 600 }}>
                    {epic.epic_key}
                  </span>
                )}
                {statusConfig && lozengeStyle && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
                    borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                    letterSpacing: '0.03em', background: lozengeStyle.bg, color: lozengeStyle.text,
                  }}>
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
            <SheetTitle className="text-base font-semibold mt-2" style={{ fontWeight: 650 }}>{epic?.name || 'Loading...'}</SheetTitle>
          </SheetHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center gap-6 text-sm" style={{ color: '#64748B' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B' }}>
                  {getInitials(null)}
                </div>
                <span>Unassigned</span>
              </div>
              <span style={{ color: epic?.end_date && isDueDateOverdue(epic.end_date, epic.status) ? '#DC2626' : '#6B7280' }}>
                {formatDueDate(epic?.end_date || null)}
              </span>
            </div>

            {epic?.description && (
              <div>
                <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: '#64748B', letterSpacing: '0.05em' }}>Description</h4>
                <div className="text-sm leading-relaxed" style={{ color: '#334155' }}>{epic.description}</div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
              <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {showEdit && epicId && (
        <EditEpicDialog open={showEdit} onOpenChange={setShowEdit} epicId={epicId} onUpdated={() => refetch()} />
      )}
    </>
  );
};
