import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  'new', 'portfolio_review', 'technical_validation', 'estimate',
  'demand_approved', 'analysis', 'ready_for_development', 'under_implementation',
  'on_hold', 'implementation_review', 'in_support', 'done', 'cancelled',
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

  const x = Math.min(position.x, window.innerWidth - 220);
  const y = Math.min(position.y, window.innerHeight - 380);

  return createPortal(
    <div ref={menuRef} className="pk-context-menu" style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}>
      <button className="pk-context-item" onClick={() => { onEditDetails(); onClose(); }}>
        <Pencil size={14} className="pk-context-icon" /> Edit Details
      </button>
      <button className="pk-context-item" onClick={() => { toast.info('Assign dialog coming soon'); onClose(); }}>
        <UserPlus size={14} className="pk-context-icon" /> Assign To...
      </button>
      <button className="pk-context-item" onClick={() => { toast.info('Toggle star coming soon'); onClose(); }}>
        <Star size={14} className="pk-context-icon" /> {initiative.is_favorited ? 'Unstar' : 'Star'}
      </button>
      <button className="pk-context-item" onClick={() => {
        navigator.clipboard.writeText(initiative.initiative_key);
        toast.success(`Copied ${initiative.initiative_key}`);
        onClose();
      }}>
        <Copy size={14} className="pk-context-icon" /> Copy ID
      </button>

      <div className="pk-context-separator" />

      {/* Status submenu */}
      <div style={{ position: 'relative' }} onMouseEnter={() => setShowStatusSub(true)} onMouseLeave={() => setShowStatusSub(false)}>
        <button className="pk-context-item" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRightLeft size={14} className="pk-context-icon" /> Change Status
          </span>
          <span style={{ fontSize: 12, color: 'var(--pk-ink-muted)' }}>▸</span>
        </button>
        {showStatusSub && (
          <div className="pk-context-menu" style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 4, zIndex: 10000 }}>
            {STATUSES.map(s => {
              const cfg = STATUS_DISPLAY[s];
              return (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); onClose(); }}
                  className={`pk-context-item${initiative.status === s ? ' pk-dropdown-item--active' : ''}`}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button className="pk-context-item" onClick={() => { toast.info('Priority dialog coming soon'); onClose(); }}>
        <Tag size={14} className="pk-context-icon" /> Set Priority
      </button>

      <div className="pk-context-separator" />

      <button className="pk-context-item" onClick={() => { toast.info('Duplicate coming soon'); onClose(); }}>
        <Files size={14} className="pk-context-icon" /> Duplicate
      </button>
      <button className="pk-context-item" onClick={() => { toast.info('Archive coming soon'); onClose(); }}>
        <Archive size={14} className="pk-context-icon" /> Archive
      </button>
      <button className="pk-context-item pk-context-item--danger" onClick={() => { toast.info('Delete confirmation coming soon'); onClose(); }}>
        <Trash2 size={14} className="pk-context-icon" /> Delete
      </button>
    </div>,
    document.body
  );
};
