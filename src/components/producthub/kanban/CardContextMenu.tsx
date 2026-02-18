import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Pencil, UserPlus, Star, Copy, ArrowRightLeft, Tag, Files, Archive, Trash2 } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { toast } from 'sonner';

interface CardContextMenuProps {
  initiative: Initiative;
  position: { x: number; y: number };
  onClose: () => void;
  onEditDetails: () => void;
  onStatusChange: (status: InitiativeStatus) => void;
}

const STATUSES: InitiativeStatus[] = [
  'new_demand', 'under_review', 'approved', 'in_progress',
  'on_hold', 'delivered', 'cancelled',
];

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  initiative,
  position,
  onClose,
  onEditDetails,
  onStatusChange,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showStatusSub, setShowStatusSub] = React.useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') { onClose(); return; }
      if (e instanceof MouseEvent && menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', handler); };
  }, [onClose]);

  // Clamp position to viewport
  const x = Math.min(position.x, window.innerWidth - 220);
  const y = Math.min(position.y, window.innerHeight - 380);

  const Item: React.FC<{
    icon: React.ReactNode;
    label: string;
    danger?: boolean;
    onClick: () => void;
    onMouseEnter?: () => void;
  }> = ({ icon, label, danger, onClick, onMouseEnter }) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 h-8 text-sm rounded-md transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-zinc-700 hover:bg-zinc-50'
      )}
    >
      <span className={cn('w-4 h-4 shrink-0', danger ? 'text-red-500' : 'text-zinc-400')}>
        {icon}
      </span>
      {label}
    </button>
  );

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-52 bg-white border border-zinc-200 rounded-lg shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      <Item icon={<Pencil className="w-4 h-4" />} label="Edit Details" onClick={onEditDetails} />
      <Item icon={<UserPlus className="w-4 h-4" />} label="Assign To..." onClick={() => toast.info('Assign dialog coming soon')} />
      <Item
        icon={<Star className="w-4 h-4" />}
        label={initiative.is_favorited ? 'Unstar' : 'Star'}
        onClick={() => toast.info('Toggle star coming soon')}
      />
      <Item
        icon={<Copy className="w-4 h-4" />}
        label="Copy ID"
        onClick={() => {
          navigator.clipboard.writeText(initiative.initiative_key);
          toast.success(`Copied ${initiative.initiative_key}`);
        }}
      />

      <div className="h-px bg-zinc-100 my-1 mx-2" />

      {/* Status submenu */}
      <div className="relative" onMouseEnter={() => setShowStatusSub(true)} onMouseLeave={() => setShowStatusSub(false)}>
        <button className="w-full flex items-center justify-between gap-2.5 px-3 h-8 text-sm text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors">
          <span className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
            Change Status
          </span>
          <span className="text-zinc-400 text-xs">▸</span>
        </button>
        {showStatusSub && (
          <div className="absolute left-full top-0 ml-1 w-44 bg-white border border-zinc-200 rounded-lg shadow-xl py-1.5 z-[10000]">
            {STATUSES.map(s => {
              const cfg = STATUS_DISPLAY[s];
              return (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); onClose(); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 h-8 text-sm rounded-md transition-colors',
                    initiative.status === s ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-zinc-700 hover:bg-zinc-50'
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Item icon={<Tag className="w-4 h-4" />} label="Set Priority" onClick={() => toast.info('Priority dialog coming soon')} />

      <div className="h-px bg-zinc-100 my-1 mx-2" />

      <Item icon={<Files className="w-4 h-4" />} label="Duplicate" onClick={() => toast.info('Duplicate coming soon')} />
      <Item icon={<Archive className="w-4 h-4" />} label="Archive" onClick={() => toast.info('Archive coming soon')} />
      <Item icon={<Trash2 className="w-4 h-4" />} label="Delete" danger onClick={() => toast.info('Delete confirmation coming soon')} />
    </div>,
    document.body
  );
};
