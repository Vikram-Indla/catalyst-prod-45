import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Pencil, Copy, Link2, ChevronRight, Archive, Trash2, CopyPlus } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';
import { toast } from 'sonner';

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  initiative: Initiative | null;
  onAction: (action: string, value?: any) => void;
  onClose: () => void;
}

const ALL_STATUSES = Object.keys(STATUS_DISPLAY) as InitiativeStatus[];

const MOCK_USERS = [
  'Sarah Chen', 'Mohammed Al-Sayed', 'Fatima Al-Zahra', 'Omar Farooq',
  'Yusuf Ali', 'Rania Othman', 'Aisha Bakr', 'Zaid Al-Harbi',
];

export function ContextMenu({ position, initiative, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<'status' | 'assign' | null>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const submenuTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Adjust position to keep on screen
  useEffect(() => {
    if (!position || !menuRef.current) {
      setAdjustedPos(position);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    let x = position.x;
    let y = position.y;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    setAdjustedPos({ x: Math.max(8, x), y: Math.max(8, y) });
  }, [position]);

  // Close on escape or click outside
  useEffect(() => {
    if (!position) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [position, onClose]);

  const handleSubmenuEnter = useCallback((type: 'status' | 'assign') => {
    clearTimeout(submenuTimeout.current);
    submenuTimeout.current = setTimeout(() => setSubmenu(type), 150);
  }, []);

  const handleSubmenuLeave = useCallback(() => {
    clearTimeout(submenuTimeout.current);
    submenuTimeout.current = setTimeout(() => setSubmenu(null), 200);
  }, []);

  if (!position || !initiative) return null;

  const act = (action: string, value?: any) => {
    onAction(action, value);
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed min-w-[200px] bg-white border border-zinc-200 rounded-lg p-1 z-[99999]"
      style={{
        top: adjustedPos?.y ?? position.y,
        left: adjustedPos?.x ?? position.x,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <MenuItem icon={<ExternalLink size={14} />} onClick={() => act('open')}>Open</MenuItem>
      <MenuItem icon={<ExternalLink size={14} />} onClick={() => act('open_new_tab')}>Open in new tab</MenuItem>
      <MenuItem icon={<Pencil size={14} />} onClick={() => act('edit')}>Edit</MenuItem>
      <MenuItem
        icon={<Copy size={14} />}
        onClick={() => {
          navigator.clipboard.writeText(initiative.initiative_key);
          toast.success('Copied!');
          onClose();
        }}
      >
        Copy ID
      </MenuItem>
      <MenuItem icon={<Link2 size={14} />} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/producthub/initiative/${initiative.id}`); toast.success('Link copied!'); onClose(); }}>
        Copy link
      </MenuItem>

      <div className="h-px bg-zinc-100 my-1 mx-2" />

      {/* Status submenu */}
      <div
        className="relative"
        onMouseEnter={() => handleSubmenuEnter('status')}
        onMouseLeave={handleSubmenuLeave}
      >
        <MenuItem icon={<ChevronRight size={14} className="ml-auto" />} hasSubmenu>Change status</MenuItem>
        {submenu === 'status' && (
          <Submenu parentRef={menuRef}>
            {ALL_STATUSES.map(st => {
              const d = STATUS_DISPLAY[st];
              return (
                <MenuItem key={st} icon={<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.dot }} />} onClick={() => act('change_status', st)}>
                  {d.label}
                </MenuItem>
              );
            })}
          </Submenu>
        )}
      </div>

      {/* Assign submenu */}
      <div
        className="relative"
        onMouseEnter={() => handleSubmenuEnter('assign')}
        onMouseLeave={handleSubmenuLeave}
      >
        <MenuItem icon={<ChevronRight size={14} className="ml-auto" />} hasSubmenu>Assign to</MenuItem>
        {submenu === 'assign' && (
          <Submenu parentRef={menuRef}>
            {MOCK_USERS.map(name => (
              <MenuItem key={name} onClick={() => act('assign', name)}>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-300 text-[9px] font-semibold text-white flex items-center justify-center flex-shrink-0">
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                  {name}
                </span>
              </MenuItem>
            ))}
          </Submenu>
        )}
      </div>

      <div className="h-px bg-zinc-100 my-1 mx-2" />

      <MenuItem icon={<CopyPlus size={14} />} onClick={() => act('clone')}>Clone</MenuItem>
      <MenuItem icon={<Archive size={14} />} onClick={() => act('archive')}>Archive</MenuItem>
      <MenuItem icon={<Trash2 size={14} />} onClick={() => act('delete')} danger>Delete</MenuItem>
    </div>,
    document.body
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
  hasSubmenu,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  hasSubmenu?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-8 px-3 flex items-center gap-2 text-[13px] rounded-md transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 [&_svg]:text-red-600'
          : 'text-zinc-700 hover:bg-zinc-50 [&_svg]:text-zinc-400'
      } ${hasSubmenu ? 'justify-between' : ''}`}
    >
      {!hasSubmenu && icon}
      <span className="flex-1 text-left">{children}</span>
      {hasSubmenu && icon}
    </button>
  );
}

function Submenu({ children, parentRef }: { children: React.ReactNode; parentRef: React.RefObject<HTMLDivElement | null> }) {
  const subRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<'right' | 'left'>('right');

  useEffect(() => {
    if (!parentRef.current || !subRef.current) return;
    const parentRect = parentRef.current.getBoundingClientRect();
    const subRect = subRef.current.getBoundingClientRect();
    if (parentRect.right + subRect.width > window.innerWidth - 8) {
      setSide('left');
    }
  }, [parentRef]);

  return (
    <div
      ref={subRef}
      className={`absolute top-0 min-w-[180px] bg-white border border-zinc-200 rounded-lg p-1 z-[99999] ${
        side === 'right' ? 'left-full ml-1' : 'right-full mr-1'
      }`}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
    >
      {children}
    </div>
  );
}
