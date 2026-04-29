import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Pencil, Copy, Link2, ChevronRight, Archive, Trash2, CopyPlus } from 'lucide-react';
import type { Request, RequestStatus } from '@/types/request';
import { STATUS_DISPLAY } from '@/types/request';
import { toast } from 'sonner';
import { useProfileOptions } from '@/hooks/useRequestLookups';

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  request: Request | null;
  onAction: (action: string, value?: any) => void;
  onClose: () => void;
}

const ALL_STATUSES = Object.keys(STATUS_DISPLAY) as RequestStatus[];

export function ContextMenu({ position, request, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<'status' | 'assign' | null>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);
  const submenuTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { data: profileOptions } = useProfileOptions();

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

  useEffect(() => {
    if (!position) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClick);
    });
    return () => {
      cancelAnimationFrame(raf);
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

  if (!position || !request) return null;

  const act = (action: string, value?: any) => {
    onAction(action, value);
    onClose();
  };

  const assigneeList = (profileOptions || []).map(p => ({ id: p.value, name: p.label }));

  return createPortal(
    <div
      ref={menuRef}
      className="fixed min-w-[200px] rounded-lg p-1"
      style={{
        top: adjustedPos?.y ?? position.y,
        left: adjustedPos?.x ?? position.x,
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        border: '1px solid #e4e4e7',
        background: 'var(--bg-app)',
        zIndex: 99999,
      }}
    >
      <MenuItem icon={<ExternalLink size={14} />} onClick={() => act('open')}>Open</MenuItem>
      <MenuItem icon={<ExternalLink size={14} />} onClick={() => act('open_new_tab')}>Open in new tab</MenuItem>
      <MenuItem icon={<Pencil size={14} />} onClick={() => act('edit')}>Edit</MenuItem>
      <MenuItem
        icon={<Copy size={14} />}
        onClick={() => {
          navigator.clipboard.writeText(request.initiative_key);
          toast.success('Copied!');
          onClose();
        }}
      >
        Copy ID
      </MenuItem>
      <MenuItem icon={<Link2 size={14} />} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/producthub/request/${request.id}`); toast.success('Link copied!'); onClose(); }}>
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

      {/* Assign submenu — real profiles */}
      <div
        className="relative"
        onMouseEnter={() => handleSubmenuEnter('assign')}
        onMouseLeave={handleSubmenuLeave}
      >
        <MenuItem icon={<ChevronRight size={14} className="ml-auto" />} hasSubmenu>Assign to</MenuItem>
        {submenu === 'assign' && (
          <Submenu parentRef={menuRef}>
            <div className="max-h-[240px] overflow-y-auto">
              {assigneeList.map(({ id, name }) => (
                <MenuItem key={id} onClick={() => act('assign', id)}>
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-300 text-[9px] font-semibold text-white flex items-center justify-center flex-shrink-0">
                      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                    {name}
                  </span>
                </MenuItem>
              ))}
              {assigneeList.length === 0 && (
                <span className="block px-3 py-2 text-xs text-zinc-400">No profiles found</span>
              )}
            </div>
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
      className={`absolute top-0 min-w-[180px] rounded-lg p-1 ${
        side === 'right' ? 'left-full ml-1' : 'right-full mr-1'
      }`}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: '1px solid #e4e4e7', background: 'var(--bg-app)', zIndex: 99999 }}
    >
      {children}
    </div>
  );
}
