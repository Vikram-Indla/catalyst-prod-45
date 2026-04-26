// =====================================================
// TIMELINE CONTEXT MENU — Right-click on bars
// =====================================================

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, Pencil, RefreshCw, User, ClipboardCopy, Copy, Archive, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimelineInitiative, InitiativeStatus } from '@/types/producthub/initiative';
import { STATUS_CONFIG } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { catalystToast } from '@/lib/catalystToast';

interface TimelineContextMenuProps {
  initiative: TimelineInitiative;
  x: number;
  y: number;
  onClose: () => void;
}

const Separator = () => <div className="h-px bg-border my-1" />;

const MenuItem: React.FC<{
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, danger, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md transition-colors text-left',
      danger
        ? 'text-destructive hover:bg-destructive/10'
        : 'text-foreground hover:bg-muted'
    )}
  >
    <Icon className="w-3.5 h-3.5 shrink-0" />
    <span>{label}</span>
  </button>
);

export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
  initiative,
  x,
  y,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { openDetail } = useTimelineState();
  const [showStatusSub, setShowStatusSub] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  // Clamp position to viewport
  const clampedX = Math.min(x, window.innerWidth - 220);
  const clampedY = Math.min(y, window.innerHeight - 320);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(initiative.initiative_key);
    catalystToast.success(`Copied ${initiative.initiative_key}`);
    onClose();
  }, [initiative.initiative_key, onClose]);

  const handleArchive = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('ph_initiatives' as never)
        .update({ is_archived: true } as never)
        .eq('id' as never, initiative.id as never);
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ['ph-timeline-initiatives'] });
      catalystToast.success('Business request archived');
    } catch (err: unknown) {
      catalystToast.error(err instanceof Error ? err.message : 'Archive failed');
    }
    onClose();
  }, [initiative.id, queryClient, onClose]);

  const handleStatusChange = useCallback(async (status: InitiativeStatus) => {
    try {
      const { error } = await supabase
        .from('ph_initiatives' as never)
        .update({ status } as never)
        .eq('id' as never, initiative.id as never);
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ['ph-timeline-initiatives'] });
      // Silent auto-save
    } catch (err: unknown) {
      catalystToast.error(err instanceof Error ? err.message : 'Status update failed');
    }
    onClose();
  }, [initiative.id, queryClient, onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[400] min-w-[200px] bg-card border border-border rounded-lg p-1"
      style={{
        left: clampedX,
        top: clampedY,
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      }}
    >
      <MenuItem icon={Eye} label="View Details" onClick={() => { openDetail(initiative.id); onClose(); }} />
      <MenuItem icon={Pencil} label="Edit" onClick={() => { openDetail(initiative.id); onClose(); }} />

      <Separator />

      {/* Status submenu */}
      <div className="relative">
        <button
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md transition-colors text-left text-foreground hover:bg-muted"
          onMouseEnter={() => setShowStatusSub(true)}
          onMouseLeave={() => setShowStatusSub(false)}
          onClick={() => setShowStatusSub(prev => !prev)}
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">Change Status</span>
          <span className="text-muted-foreground text-[11px]">▸</span>
        </button>
        {showStatusSub && (
          <div
            className="absolute left-full top-0 ml-1 min-w-[160px] bg-card border border-border rounded-lg p-1 z-[401]"
            style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}
            onMouseEnter={() => setShowStatusSub(true)}
            onMouseLeave={() => setShowStatusSub(false)}
          >
            {(Object.keys(STATUS_CONFIG) as InitiativeStatus[]).map(st => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] rounded-md transition-colors text-left',
                  st === initiative.status ? 'bg-muted font-medium' : 'hover:bg-muted'
                )}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_CONFIG[st].color }} />
                <span>{STATUS_CONFIG[st].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MenuItem icon={User} label="Assign to…" onClick={onClose} />

      <Separator />

      <MenuItem icon={ClipboardCopy} label="Copy ID" onClick={handleCopyId} />
      <MenuItem icon={Copy} label="Clone" onClick={onClose} />
      <MenuItem icon={Archive} label="Archive" onClick={handleArchive} />

      <Separator />

      <MenuItem icon={Trash2} label="Delete" danger onClick={onClose} />
    </div>
  );
};

export default TimelineContextMenu;
